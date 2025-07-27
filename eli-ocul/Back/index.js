const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const archiver = require('archiver')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

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

// Función para detectar archivos ocultos (mejorada)
const isHiddenFile = (fileName, filePath) => {
  // Archivos que empiezan con punto (Unix/Linux/Mac)
  if (fileName.startsWith('.')) return true

  // Archivos del sistema Windows
  const windowsSystemFiles = [
    'thumbs.db',
    'desktop.ini',
    'folder.jpg',
    'albumartsmall.jpg',
    'albumart_{',
    '.ds_store',
    'icon\r',
    '__macosx',
    'ehthumbs.db',
    'ehthumbs_vista.db',
    'folder.htt',
    'desktop.ini'
  ]

  if (
    windowsSystemFiles.some((sysFile) =>
      fileName.toLowerCase().includes(sysFile.toLowerCase())
    )
  ) {
    return true
  }

  // Carpetas ocultas comunes
  const hiddenFolders = [
    '__pycache__',
    '.git',
    '.svn',
    '.hg',
    'node_modules/.cache',
    '.vscode',
    '.idea',
    '.tmp',
    'cache'
  ]
  if (
    hiddenFolders.some((folder) =>
      filePath.toLowerCase().includes(folder.toLowerCase())
    )
  ) {
    return true
  }

  // Archivos temporales
  if (
    fileName.endsWith('~') ||
    fileName.startsWith('~$') ||
    fileName.endsWith('.tmp') ||
    fileName.endsWith('.temp')
  ) {
    return true
  }

  // Archivos de respaldo
  if (fileName.endsWith('.bak') || fileName.endsWith('.backup')) {
    return true
  }

  return false
}

// Función para escanear archivos recursivamente
const scanDirectory = (dirPath, baseDir = '') => {
  const results = {}

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name)
      const relativePath = path.join(baseDir, item.name)

      if (item.isDirectory()) {
        // Escanear subdirectorio recursivamente
        const subResults = scanDirectory(fullPath, relativePath)
        Object.assign(results, subResults)
      } else {
        // Analizar archivo
        const stats = fs.statSync(fullPath)
        const hidden = isHiddenFile(item.name, relativePath)

        results[relativePath] = {
          hidden,
          size: stats.size,
          lastModified: stats.mtime,
          fullPath,
          type: path.extname(item.name)
        }
      }
    }
  } catch (error) {
    console.error(`Error escaneando directorio ${dirPath}:`, error)
  }

  return results
}

// Endpoint para escanear archivos (sin eliminar)
app.post('/scan', upload.any(), (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads')

    // Escanear todos los archivos
    const scanResults = scanDirectory(uploadsDir)

    // Contar archivos ocultos
    const hiddenCount = Object.values(scanResults).filter(
      (result) => result.hidden
    ).length
    const totalCount = Object.keys(scanResults).length

    res.json({
      success: true,
      results: scanResults,
      summary: {
        total: totalCount,
        hidden: hiddenCount,
        clean: totalCount - hiddenCount
      }
    })
  } catch (error) {
    console.error('Error durante el escaneo:', error)
    res.status(500).json({
      success: false,
      message: 'Error durante el escaneo',
      error: error.message
    })
  }
})

// Endpoint para eliminar archivos ocultos
app.post('/delete-hidden', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads')
    const deletedFiles = []

    const deleteHiddenFiles = (dirPath, baseDir = '') => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)
        const relativePath = path.join(baseDir, item.name)

        if (item.isDirectory()) {
          // Si es una carpeta oculta, eliminarla completamente
          if (isHiddenFile(item.name, relativePath)) {
            fs.rmSync(fullPath, { recursive: true, force: true })
            deletedFiles.push(relativePath + '/ (carpeta completa)')
          } else {
            // Si no es oculta, escanear su contenido
            deleteHiddenFiles(fullPath, relativePath)

            // Verificar si la carpeta quedó vacía y eliminarla
            try {
              const remainingItems = fs.readdirSync(fullPath)
              if (remainingItems.length === 0) {
                fs.rmdirSync(fullPath)
                deletedFiles.push(relativePath + '/ (carpeta vacía)')
              }
            } catch (error) {
              // La carpeta no está vacía o no se puede eliminar
            }
          }
        } else {
          // Si es un archivo oculto, eliminarlo
          if (isHiddenFile(item.name, relativePath)) {
            fs.unlinkSync(fullPath)
            deletedFiles.push(relativePath)
          }
        }
      }
    }

    deleteHiddenFiles(uploadsDir)

    res.json({
      success: true,
      message: `Se eliminaron ${deletedFiles.length} elemento(s) oculto(s)`,
      deleted: deletedFiles
    })
  } catch (error) {
    console.error('Error eliminando archivos ocultos:', error)
    res.status(500).json({
      success: false,
      message: 'Error eliminando archivos ocultos',
      error: error.message
    })
  }
})

// Endpoint para descargar archivos limpios como ZIP
app.get('/download-clean', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads')

    // Verificar si existe el directorio
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({
        success: false,
        message: 'No hay archivos para descargar'
      })
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="archivos-limpios.zip"'
    )

    // Crear archivo ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compresión
    })

    // Manejar errores del archiver
    archive.on('error', (err) => {
      console.error('Error creando ZIP:', err)
      res.status(500).json({
        success: false,
        message: 'Error creando archivo ZIP',
        error: err.message
      })
    })

    // Pipe del archive al response
    archive.pipe(res)

    // Función para agregar archivos limpios al ZIP
    const addCleanFiles = (dirPath, baseDir = '') => {
      const items = fs.readdirSync(dirPath, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)
        const relativePath = path.join(baseDir, item.name)

        if (item.isDirectory()) {
          // Solo procesar carpetas no ocultas
          if (!isHiddenFile(item.name, relativePath)) {
            addCleanFiles(fullPath, relativePath)
          }
        } else {
          // Solo agregar archivos no ocultos
          if (!isHiddenFile(item.name, relativePath)) {
            archive.file(fullPath, { name: relativePath })
          }
        }
      }
    }

    addCleanFiles(uploadsDir)

    // Finalizar el archivo
    archive.finalize()
  } catch (error) {
    console.error('Error en descarga:', error)
    res.status(500).json({
      success: false,
      message: 'Error preparando descarga',
      error: error.message
    })
  }
})

// Endpoint para obtener estadísticas
app.get('/stats', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads')

    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: true,
        stats: {
          total: 0,
          hidden: 0,
          clean: 0,
          totalSize: 0
        }
      })
    }

    const scanResults = scanDirectory(uploadsDir)
    const hiddenFiles = Object.values(scanResults).filter(
      (result) => result.hidden
    )
    const cleanFiles = Object.values(scanResults).filter(
      (result) => !result.hidden
    )
    const totalSize = Object.values(scanResults).reduce(
      (sum, result) => sum + result.size,
      0
    )

    res.json({
      success: true,
      stats: {
        total: Object.keys(scanResults).length,
        hidden: hiddenFiles.length,
        clean: cleanFiles.length,
        totalSize,
        hiddenSize: hiddenFiles.reduce((sum, result) => sum + result.size, 0),
        cleanSize: cleanFiles.reduce((sum, result) => sum + result.size, 0)
      }
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message
    })
  }
})

// Endpoint para limpiar directorio uploads
app.post('/clear', (req, res) => {
  try {
    clearUploads()
    res.json({
      success: true,
      message: 'Directorio temporal limpiado exitosamente'
    })
  } catch (error) {
    console.error('Error limpiando directorio:', error)
    res.status(500).json({
      success: false,
      message: 'Error limpiando directorio temporal',
      error: error.message
    })
  }
})

// Función para limpiar el directorio temporal
const clearUploads = () => {
  const uploadsDir = path.join(__dirname, 'uploads')
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Limpieza del directorio temporal al iniciar el servidor
clearUploads()

// Middleware para manejar errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error)
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: error.message
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  console.log(`📁 Directorio uploads: ${path.join(__dirname, 'uploads')}`)
})
