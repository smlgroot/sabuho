import { useState, useRef } from 'react'
import { Upload, File, X } from 'lucide-react'

export function ResourceUpload({ isOpen, onClose, domainId, onUpload }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!name) {
        setName(selectedFile.name.split('.')[0])
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      if (!name) {
        setName(droppedFile.name.split('.')[0])
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeFile = () => {
    setFile(null)
    setName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !name) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress for demo
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 70) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // Upload file and get resource ID from the onUpload callback
      const resourceId = await onUpload(file, name, description)
      
      clearInterval(progressInterval)
      setUploadProgress(80)

      // Call Heroku REST service to process the PDF
      if (resourceId) {
        try {
          const response = await fetch(import.meta.env.VITE_HEROKU_SERVICE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              resource_id: resourceId
            })
          })

          if (!response.ok) {
            throw new Error(`Heroku service error: ${response.status}`)
          }

          const result = await response.json()
        } catch (herokuError) {
          console.error('Failed to start PDF processing:', herokuError)
          // Don't fail the entire upload if processing fails
        }
      }
      
      setUploadProgress(100)
      
      // Reset form
      setFile(null)
      setName('')
      setDescription('')
      onClose()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box relative max-w-lg">
        <h3 className="font-bold text-lg mb-4">Upload Resource</h3>
        <button 
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!file ? (
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drop your PDF file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF files up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="card bg-base-100 border">
              <div className="card-body p-4">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm h-8 w-8 p-0"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {file && (
            <>
              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text">Resource Name</span>
                </label>
                <input
                  id="name"
                  className="input input-bordered"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter resource name"
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label" htmlFor="description">
                  <span className="label-text">Description (Optional)</span>
                </label>
                <textarea
                  id="description"
                  className="textarea textarea-bordered"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter resource description"
                  rows={3}
                />
              </div>
            </>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <progress className="progress progress-primary w-full" value={uploadProgress} max="100"></progress>
            </div>
          )}

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!file || !name || uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}