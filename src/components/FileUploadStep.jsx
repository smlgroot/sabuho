import { Upload, CheckCircle, FileText, BarChart3, RotateCcw } from "lucide-react";

export default function FileUploadStep({
  uploadedFile,
  fileInputRef,
  onFileSelect,
  onReset
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
      uploadedFile ? 'border-green-500 shadow-lg' : 'border-blue-500'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className={`rounded-full p-2 flex-shrink-0 ${
            uploadedFile ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {uploadedFile ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Upload className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Step 1</h3>
            <p className="text-xs text-gray-600">
              {uploadedFile ? 'File ready!' : 'Choose a file'}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={onFileSelect}
          className="hidden"
          id="file-upload-step"
        />

        {/* File Details */}
        {uploadedFile && (
          <div className="space-y-2 mb-3">
            {/* File Name */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
              <div className="flex-shrink-0 text-green-600">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-700 truncate">{uploadedFile.name}</p>
              </div>
            </div>

            {/* File Type */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50">
              <div className="flex-shrink-0 text-blue-600">
                {uploadedFile.name.toLowerCase().endsWith('.pdf') && <FileText className="w-4 h-4" />}
                {uploadedFile.name.toLowerCase().endsWith('.docx') && <FileText className="w-4 h-4" />}
                {(uploadedFile.name.toLowerCase().endsWith('.txt') || uploadedFile.name.toLowerCase().endsWith('.md')) && <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-blue-700">Type</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-blue-900 uppercase">
                  {uploadedFile.name.split('.').pop()}
                </span>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-50">
              <div className="flex-shrink-0 text-purple-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-purple-700">Size</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-purple-900">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
        )}

        {!uploadedFile ? (
          <label
            htmlFor="file-upload-step"
            className="btn btn-primary btn-sm cursor-pointer w-full mt-auto"
          >
            Select File
          </label>
        ) : (
          <button
            onClick={onReset}
            className="btn btn-outline btn-sm w-full mt-auto hover:btn-error"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Start Over
          </button>
        )}
      </div>
    </div>
  );
}
