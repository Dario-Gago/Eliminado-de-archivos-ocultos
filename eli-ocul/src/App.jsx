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
  Trash2,
  AlertCircle,
  Server,
  Clock,
  FolderOpen
} from 'lucide-react'

const API_BASE_URL = 'http://localhost:3001'

function App() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [scanResults, setScanResults] = useState({})
  const [showResults, setShowResults] = useState(false)
  const fileInputRef = useRef()

  const handleFileChange = (event) => {
    const filesArray = Array.from(event.target.files)
    setSelectedFiles(filesArray)
    setShowResults(false)
  }

  const handleScan = async () => {
    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name)
    })

    try {
      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setScanResults(data)
      setShowResults(true)
    } catch (error) {
      console.error('Error al escanear:', error)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete-hidden`, {
        method: 'POST'
      })

      const data = await response.json()
      alert(data.message)
    } catch (error) {
      console.error('Error al eliminar archivos ocultos:', error)
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
  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <FolderOpen className="w-6 h-6" />
          Analizador de Archivos Ocultos
        </h1>

        <div className="bg-white shadow p-6 rounded-2xl mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center gap-4">
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
            >
              <Folder className="w-5 h-5" />
              Seleccionar Carpeta
            </button>

            <button
              onClick={handleScan}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition disabled:opacity-50"
              disabled={selectedFiles.length === 0}
            >
              <Server className="w-5 h-5" />
              Escanear Archivos
            </button>

            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar Archivos Ocultos
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Archivos Seleccionados
              </h2>
              <ul className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    {getFileIcon(file.type)}
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {showResults && (
          <div className="bg-white shadow p-6 rounded-2xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Resultados del Escaneo
            </h2>
            <ul className="space-y-2">
              {Object.entries(scanResults).map(([fileName, result], index) => (
                <li
                  key={index}
                  className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded-xl"
                >
                  <span className="flex items-center gap-2">
                    {result.hidden ? (
                      <AlertCircle className="text-yellow-500 w-4 h-4" />
                    ) : (
                      <Check className="text-green-500 w-4 h-4" />
                    )}
                    {fileName}
                  </span>
                  <span
                    className={
                      result.hidden ? 'text-yellow-600' : 'text-green-600'
                    }
                  >
                    {result.hidden
                      ? 'Archivo oculto detectado'
                      : 'Sin archivos ocultos'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
