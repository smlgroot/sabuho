import { Brain, Cog, AlertCircle, Upload, FileText, Scan, Sparkles, CheckCircle, Clock, RotateCcw } from "lucide-react";

export default function ProcessingStep({
  currentStep,
  isProcessing,
  processingError,
  currentProcessingState,
  onProcessClick,
  onRetry
}) {
  // Determine if processing is completed (step 3 or higher means processing is done)
  const isCompleted = currentStep >= 3;

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
      processingError ? 'border-red-500' :
      currentStep === 2 && !isProcessing ? 'border-blue-500 cursor-pointer hover:shadow-lg' :
      isProcessing ? 'border-purple-500 shadow-lg' :
      isCompleted ? 'border-green-500' :
      'border-gray-200 opacity-50 cursor-not-allowed'
    }`}
    onClick={() => {
      if (currentStep === 2 && !isProcessing && !processingError) {
        onProcessClick();
      }
    }}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className={`rounded-full p-2 flex-shrink-0 transition-all ${
            processingError ? 'bg-red-100' :
            isProcessing ? 'bg-purple-200' :
            isCompleted ? 'bg-green-100' :
            'bg-purple-100'
          }`}>
            {processingError ? (
              <AlertCircle className="w-5 h-5 text-red-600" />
            ) : isProcessing ? (
              <Cog className="w-5 h-5 text-purple-600 animate-spin" />
            ) : isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Brain className="w-5 h-5 text-purple-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Step 2</h3>
            <p className="text-xs text-gray-600">
              {processingError ? (
                <span className="text-red-600 font-medium">{processingError}</span>
              ) : isProcessing ? (
                'Processing your document...'
              ) : isCompleted ? (
                <span className="text-green-600 font-medium">Processing complete!</span>
              ) : (
                currentStep >= 2 ? 'Click to process' : 'Process'
              )}
            </p>
          </div>
        </div>

        {/* Processing Stages - Show in waiting, processing, or completed states */}
        {currentStep >= 2 && (
          <div className="space-y-2 mb-3">
            {/* Upload Stage */}
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
              isProcessing && currentProcessingState === "uploading" ? 'bg-purple-100 animate-pulse' :
              isProcessing && ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'bg-green-50' :
              isCompleted ? 'bg-green-50' :
              'bg-gray-50'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && currentProcessingState === "uploading" ? 'text-purple-600' :
                isProcessing && ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {isProcessing && currentProcessingState === "uploading" ? (
                  <Upload className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : (isProcessing && ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState)) || isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                isProcessing && currentProcessingState === "uploading" ? 'text-purple-700 font-bold' :
                (isProcessing && ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState)) || isCompleted ? 'text-green-700' :
                'text-gray-500'
              }`}>
                Uploading
              </span>
              {isProcessing && currentProcessingState === "uploading" && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Decoding Stage */}
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
              isProcessing && currentProcessingState === "decoding" ? 'bg-purple-100 animate-pulse' :
              isProcessing && ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'bg-green-50' :
              isCompleted ? 'bg-green-50' :
              'bg-gray-50'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && currentProcessingState === "decoding" ? 'text-purple-600' :
                isProcessing && ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {isProcessing && currentProcessingState === "decoding" ? (
                  <FileText className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : (isProcessing && ["ocr_completed", "ai_processing"].includes(currentProcessingState)) || isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                isProcessing && currentProcessingState === "decoding" ? 'text-purple-700 font-bold' :
                (isProcessing && ["ocr_completed", "ai_processing"].includes(currentProcessingState)) || isCompleted ? 'text-green-700' :
                'text-gray-500'
              }`}>
                Decoding Document
              </span>
              {isProcessing && currentProcessingState === "decoding" && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Stage */}
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
              isProcessing && currentProcessingState === "ocr_completed" ? 'bg-purple-100 animate-pulse' :
              isProcessing && currentProcessingState === "ai_processing" ? 'bg-green-50' :
              isCompleted ? 'bg-green-50' :
              'bg-gray-50'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && currentProcessingState === "ocr_completed" ? 'text-purple-600' :
                isProcessing && currentProcessingState === "ai_processing" ? 'text-green-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {isProcessing && currentProcessingState === "ocr_completed" ? (
                  <Scan className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : (isProcessing && currentProcessingState === "ai_processing") || isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                isProcessing && currentProcessingState === "ocr_completed" ? 'text-purple-700 font-bold' :
                (isProcessing && currentProcessingState === "ai_processing") || isCompleted ? 'text-green-700' :
                'text-gray-500'
              }`}>
                Extracting Text
              </span>
              {isProcessing && currentProcessingState === "ocr_completed" && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Processing Stage */}
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
              isProcessing && currentProcessingState === "ai_processing" ? 'bg-purple-100 animate-pulse' :
              isCompleted ? 'bg-green-50' :
              'bg-gray-50'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && currentProcessingState === "ai_processing" ? 'text-purple-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {isProcessing && currentProcessingState === "ai_processing" ? (
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                isProcessing && currentProcessingState === "ai_processing" ? 'text-purple-700 font-bold' :
                isCompleted ? 'text-green-700' :
                'text-gray-500'
              }`}>
                Generating Questions
              </span>
              {isProcessing && currentProcessingState === "ai_processing" && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {processingError ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            className="btn btn-error btn-sm w-full mt-auto"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </button>
        ) : currentStep === 2 && !isProcessing && (
          <button className="btn btn-primary btn-sm w-full mt-auto">
            Start Processing
          </button>
        )}
      </div>
    </div>
  );
}
