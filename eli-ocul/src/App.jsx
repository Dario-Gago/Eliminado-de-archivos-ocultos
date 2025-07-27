import React, { useState, useRef } from 'react'
import {
  Upload,
  Folder,
  Check,
  X,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  AlertCircle,
  Server,
  Clock,
  FolderOpen,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'

function App() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [scanResults, setScanResults] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [hiddenFilesCount, setHiddenFilesCount] = useState(0)
  const fileInputRef = useRef()

  const handleFileChange = (event) => {
    const filesArray = Array.from(event.target.files)
    setSelectedFiles(filesArray)
    setShowResults(false)
    setScanResults({})
  }

  // Función para detectar archivos ocultos
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
      '__macosx'
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
      'node_modules/.cache'
    ]
    if (
      hiddenFolders.some((folder) => filePath.toLowerCase().includes(folder))
    ) {
      return true
    }

    // Archivos temporales
    if (
      fileName.endsWith('~') ||
      fileName.startsWith('~$') ||
      fileName.endsWith('.tmp')
    ) {
      return true
    }

    return false
  }

  const handleScan = async () => {
    setIsScanning(true)
    setShowResults(false)

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name)
    })

    try {
      const response = await fetch('http://localhost:3001/scan', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setScanResults(data.results)
        setHiddenFilesCount(data.summary.hidden)
        setShowResults(true)
      } else {
        alert('Error durante el escaneo: ' + data.message)
      }
    } catch (error) {
      console.error('Error al escanear:', error)
      alert('Error de conexión con el servidor')
    } finally {
      setIsScanning(false)
    }
  }

  const handleDeleteHidden = async () => {
    if (hiddenFilesCount === 0) {
      alert('No se encontraron archivos ocultos para eliminar.')
      return
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar ${hiddenFilesCount} archivo(s) oculto(s)? Esta acción no se puede deshacer.`
    )

    if (confirmDelete) {
      try {
        const response = await fetch('http://localhost:3001/delete-hidden', {
          method: 'POST'
        })

        const data = await response.json()

        if (data.success) {
          alert(data.message)
          // Volver a escanear para actualizar resultados
          handleScan()
        } else {
          alert('Error eliminando archivos: ' + data.message)
        }
      } catch (error) {
        console.error('Error eliminando archivos:', error)
        alert('Error de conexión con el servidor')
      }
    }
  }

  const handleDownloadClean = async () => {
    if (selectedFiles.length === 0) {
      alert('No hay archivos seleccionados para descargar.')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/download-clean')

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'archivos-limpios.zip'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        alert('Descarga iniciada: archivos-limpios.zip')
      } else {
        const errorData = await response.json()
        alert('Error en la descarga: ' + errorData.message)
      }
    } catch (error) {
      console.error('Error descargando archivos:', error)
      alert('Error de conexión con el servidor')
    }
  }

  const getFileIcon = (type) => {
    if (type.includes('image')) return <Image className="w-4 h-4" />
    if (type.includes('video')) return <Video className="w-4 h-4" />
    if (type.includes('audio')) return <Music className="w-4 h-4" />
    if (type.includes('text')) return <FileText className="w-4 h-4" />
    if (type.includes('zip') || type.includes('compressed'))
      return <Archive className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <FolderOpen className="w-8 h-8 text-blue-600" />
            Analizador de Archivos Ocultos
          </h1>
          <p className="text-gray-600">
            Detecta y elimina archivos ocultos de tus carpetas
          </p>
        </div>

        <div className="bg-white shadow-lg p-8 rounded-3xl mb-8 border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              type="file"
              webkitdirectory="true"
              mozdirectory="true"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105"
            >
              <Folder className="w-5 h-5" />
              Seleccionar Carpeta
            </button>

            <button
              onClick={handleScan}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              disabled={selectedFiles.length === 0 || isScanning}
            >
              <Server
                className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`}
              />
              {isScanning ? 'Escaneando...' : 'Escanear'}
            </button>

            <button
              onClick={handleDownloadClean}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
              disabled={selectedFiles.length === 0}
            >
              <Download className="w-5 h-5" />
              Descargar Limpios
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl flex items-center gap-2">
                  <Folder className="w-6 h-6 text-blue-600" />
                  Archivos Seleccionados
                </h2>
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {selectedFiles.length} archivo(s)
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-2xl p-4 bg-gray-50">
                <div className="space-y-2">
                  {selectedFiles.slice(0, 20).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-sm bg-white p-2 rounded-xl"
                    >
                      {getFileIcon(file.type)}
                      <span className="flex-1 truncate">
                        {file.webkitRelativePath || file.name}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length > 20 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      ... y {selectedFiles.length - 20} archivo(s) más
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showResults && (
          <div className="bg-white shadow-lg p-8 rounded-3xl border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-green-600" />
                Resultados del Escaneo
              </h2>
              <div className="flex gap-4 text-sm">
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {Object.keys(scanResults).length - hiddenFilesCount} limpio(s)
                </div>
                <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full flex items-center gap-1">
                  <EyeOff className="w-4 h-4" />
                  {hiddenFilesCount} oculto(s)
                </div>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {Object.entries(scanResults).map(([fileName, result], index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                    result.hidden
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.hidden ? (
                      <AlertCircle className="text-yellow-600 w-5 h-5" />
                    ) : (
                      <Check className="text-green-600 w-5 h-5" />
                    )}
                    <div>
                      <div className="font-medium text-sm truncate max-w-md">
                        {fileName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(result.size)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        result.hidden ? 'text-yellow-700' : 'text-green-700'
                      }`}
                    >
                      {result.hidden ? 'Archivo oculto' : 'Archivo limpio'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {hiddenFilesCount > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Se encontraron {hiddenFilesCount} archivo(s) oculto(s) que
                    pueden ser eliminados.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
