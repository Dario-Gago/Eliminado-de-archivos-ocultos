const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')

const app = express()
const PORT = 3001

app.use(cors())

// Almacenamiento temporal en carpeta uploads con rutas relativas
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads', path.dirname(file.originalname))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    cb(null, path.basename(file.originalname))
  }
})

const upload = multer({ storage })

// Endpoint para recibir y escanear archivos
app.post('/scan', upload.any(), (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads')

  const deletedFiles = []

  const deleteHiddenFiles = (dirPath) => {
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name)
      if (file.isDirectory()) {
        deleteHiddenFiles(fullPath)
      } else if (file.name.startsWith('.')) {
        fs.unlinkSync(fullPath)
        deletedFiles.push(fullPath.replace(uploadsDir + '/', ''))
      }
    }
  }

  deleteHiddenFiles(uploadsDir)

  res.json({
    message: 'Archivos ocultos eliminados exitosamente.',
    deleted: deletedFiles
  })
})

// Limpieza del directorio temporal al iniciar el servidor (opcional)
const clearUploads = () => {
  const uploadsDir = path.join(__dirname, 'uploads')
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true })
    fs.mkdirSync(uploadsDir)
  }
}

clearUploads()

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
