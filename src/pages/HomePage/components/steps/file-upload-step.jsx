import { Upload, CheckCircle, FileText, BarChart3, RotateCcw } from "lucide-react";

export default function FileUploadStep({
  uploadedFile,
  fileInputRef,
  onFileSelect,
  onReset
}) {
  const hasFile = !!uploadedFile;
  return (
    <div className={`bg-base-100 border-2 p-4 transition-all ${
      hasFile ? 'border-success' : 'border-primary'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 flex-shrink-0 bg-base-200">
            {hasFile ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <Upload className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 uppercase">Step 1</h3>
            <p className="text-xs text-base-content/60">
              {hasFile ? 'File selected' : 'Choose a file'}
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
            <div className="flex items-center gap-2 px-2 py-1.5 bg-base-200">
              <div className="flex-shrink-0 text-success">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{uploadedFile.name}</p>
              </div>
            </div>

            {/* File Type */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-base-200">
              <div className="flex-shrink-0 text-primary">
                {uploadedFile.name.toLowerCase().endsWith('.pdf') && <FileText className="w-4 h-4" />}
                {uploadedFile.name.toLowerCase().endsWith('.docx') && <FileText className="w-4 h-4" />}
                {(uploadedFile.name.toLowerCase().endsWith('.txt') || uploadedFile.name.toLowerCase().endsWith('.md')) && <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-base-content/60">Type</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold uppercase">
                  {uploadedFile.name.split('.').pop()}
                </span>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-base-200">
              <div className="flex-shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-base-content/60">Size</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>
        )}

        {!hasFile ? (
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
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
