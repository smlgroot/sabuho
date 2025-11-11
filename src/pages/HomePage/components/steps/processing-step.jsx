import { Brain, Cog, AlertCircle, Upload, FileText, Scan, Sparkles, CheckCircle, Clock, RotateCcw } from "lucide-react";

/**
 * Parse dynamic progress states and extract the most meaningful progress information
 *
 * Examples:
 * - "text_extract_page_27_of_91" -> { stage: "text_extract_page", current: 27, total: 91 }
 * - "ocr_image_1_of_2_on_page_27_of_91" -> { stage: "ocr_image", current: 27, total: 91 }
 *   (Shows PAGE progress, not image count)
 * - "ai_chunking_3_of_6_pages_38_to_55" -> { stage: "ai_chunking", current: 3, total: 6, pageStart: 38, pageEnd: 55 }
 * - "ai_batch_4_of_15_topics_4_to_7" -> { stage: "ai_batch", current: 4, total: 15, topicStart: 4, topicEnd: 7 }
 *   (Shows TOPIC range being processed, not batch count)
 * - "ai_topics_identified_1_of_1" -> { stage: "ai_topics_identified", current: 1, total: 1 }
 *
 * Returns { stage, current, total, pageStart?, pageEnd?, topicStart?, topicEnd? } or null if not a progress state
 */
function parseProgressState(state) {
  if (!state) return null;

  // Special case: ai_chunking_X_of_Y_pages_A_to_B (topic identification with page ranges)
  const chunkMatch = state.match(/^(ai_chunking)_(\d+)_of_(\d+)_pages_(\d+)_to_(\d+)$/);
  if (chunkMatch) {
    return {
      stage: chunkMatch[1],              // "ai_chunking"
      current: parseInt(chunkMatch[2], 10),  // chunk number
      total: parseInt(chunkMatch[3], 10),    // total chunks
      pageStart: parseInt(chunkMatch[4], 10), // start page
      pageEnd: parseInt(chunkMatch[5], 10)    // end page
    };
  }

  // Special case: ai_batch_X_of_Y_topics_A_to_B (question generation with topic ranges)
  // Display TOPIC range (A-B of Y), not batch count
  const batchMatch = state.match(/^(ai_batch)_(\d+)_of_(\d+)_topics_(\d+)_to_(\d+)$/);
  if (batchMatch) {
    return {
      stage: batchMatch[1],              // "ai_batch"
      current: parseInt(batchMatch[2], 10),  // starting topic number
      total: parseInt(batchMatch[3], 10),    // total topics
      topicStart: parseInt(batchMatch[4], 10), // start topic in this batch
      topicEnd: parseInt(batchMatch[5], 10)    // end topic in this batch
    };
  }

  // Special case: ocr_image_X_of_Y_on_page_Z_of_W
  // Display PAGE progress (Z/W), not image count (X/Y) - users care about page progress
  const pageMatch = state.match(/^(ocr_image)_\d+_of_\d+_on_page_(\d+)_of_(\d+)$/);
  if (pageMatch) {
    return {
      stage: pageMatch[1],           // "ocr_image"
      current: parseInt(pageMatch[2], 10), // Z (page number)
      total: parseInt(pageMatch[3], 10)    // W (total pages)
    };
  }

  // Regular pattern: stage_X_of_Y
  // Examples: "text_extract_page_27_of_91"
  const match = state.match(/^(.+?)_(\d+)_of_(\d+)$/);
  if (match) {
    return {
      stage: match[1],
      current: parseInt(match[2], 10),
      total: parseInt(match[3], 10)
    };
  }

  return null;
}

/**
 * Get the base stage from either a static state or a dynamic progress state
 * Examples: "processing" -> "processing", "ocr_processing_1_of_10" -> "ocr_processing"
 */
function getBaseStage(state) {
  const progress = parseProgressState(state);
  return progress ? progress.stage : state;
}

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

  // Parse current processing state for progress tracking
  const progressInfo = parseProgressState(currentProcessingState);
  const baseStage = getBaseStage(currentProcessingState);

  // Log processing state changes for debugging
  if (currentProcessingState) {
    console.log('🎨 UI ProcessingStep:', {
      currentProcessingState,
      baseStage,
      progressInfo,
      isProcessing
    });
  }

  return (
    <div className={`bg-base-100 border-2 p-4 transition-all ${
      processingError ? 'border-error' :
      currentStep === 2 && !isProcessing ? 'border-primary cursor-pointer' :
      isProcessing ? 'border-secondary' :
      isCompleted ? 'border-success' :
      'opacity-50 cursor-not-allowed'
    }`}
    onClick={() => {
      if (currentStep === 2 && !isProcessing && !processingError) {
        onProcessClick();
      }
    }}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 flex-shrink-0 transition-all bg-base-200">
            {processingError ? (
              <AlertCircle className="w-5 h-5 text-error" />
            ) : isProcessing ? (
              <Cog className="w-5 h-5 text-secondary animate-spin" />
            ) : isCompleted ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <Brain className="w-5 h-5 text-secondary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 uppercase">Step 2</h3>
            <p className="text-xs text-base-content/60">
              {processingError ? (
                <span className="text-error font-medium">{processingError}</span>
              ) : isProcessing ? (
                'Processing your document...'
              ) : isCompleted ? (
                <span className="text-success font-medium">Processing complete!</span>
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
            <div className={`flex items-center gap-2 px-2 py-1.5 transition-all ${
              isProcessing && baseStage === "uploading" ? 'bg-base-200 animate-pulse' :
              'bg-base-200'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && baseStage === "uploading" ? 'text-secondary' :
                isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image", "ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? 'text-success' :
                isCompleted ? 'text-success' :
                'text-base-content/40'
              }`}>
                {isProcessing && baseStage === "uploading" ? (
                  <Upload className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : (isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image", "ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage)) || isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <span className={`text-xs font-medium ${
                isProcessing && baseStage === "uploading" ? 'text-secondary font-bold' :
                (isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image", "ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage)) || isCompleted ? 'text-success' :
                'text-base-content/40'
              }`}>
                Uploading
              </span>
              {isProcessing && baseStage === "uploading" && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* OCR Stage - Show progress if available */}
            <div className={`flex items-center gap-2 px-2 py-1.5 transition-all ${
              isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) ? 'bg-base-200 animate-pulse' :
              'bg-base-200'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) ? 'text-secondary' :
                isProcessing && ["ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? 'text-success' :
                isCompleted ? 'text-success' :
                'text-base-content/40'
              }`}>
                {isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) ? (
                  <Scan className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : (isProcessing && ["ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage)) || isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${
                  isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) ? 'text-secondary font-bold' :
                  (isProcessing && ["ocr_completed", "ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage)) || isCompleted ? 'text-success' :
                  'text-base-content/40'
                }`}>
                  Extracting Text
                </span>
                {isProcessing && ["ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) && progressInfo && (
                  <span className="text-xs text-secondary font-medium">
                    {progressInfo.current}/{progressInfo.total}
                  </span>
                )}
              </div>
              {isProcessing && ["processing", "ocr_page", "text_extract_page", "ocr_image"].includes(baseStage) && !progressInfo && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Processing Stage - Show progress if available */}
            <div className={`flex items-center gap-2 px-2 py-1.5 transition-all ${
              isProcessing && ["ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? 'bg-base-200 animate-pulse' :
              'bg-base-200'
            }`}>
              <div className={`flex-shrink-0 ${
                isProcessing && ["ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? 'text-secondary' :
                isCompleted ? 'text-success' :
                'text-base-content/40'
              }`}>
                {isProcessing && ["ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? (
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                ) : isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${
                  isProcessing && ["ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) ? 'text-secondary font-bold' :
                  isCompleted ? 'text-success' :
                  'text-base-content/40'
                }`}>
                  {baseStage === "ai_chunking" ? "Identifying Topics" :
                   baseStage === "ai_topics_identified" ? "Topics Identified" :
                   baseStage === "ai_batch" ? "Generating Questions" :
                   "AI Processing"}
                </span>
                {/* Show page range for chunking, topic range for question generation */}
                {isProcessing && baseStage === "ai_chunking" && progressInfo && progressInfo.pageStart && progressInfo.pageEnd && (
                  <span className="text-xs text-secondary font-medium">
                    Pages {progressInfo.pageStart}-{progressInfo.pageEnd}
                  </span>
                )}
                {isProcessing && baseStage === "ai_batch" && progressInfo && progressInfo.topicStart && progressInfo.topicEnd && (
                  <span className="text-xs text-secondary font-medium">
                    Topics {progressInfo.topicStart}-{progressInfo.topicEnd} of {progressInfo.total}
                  </span>
                )}
              </div>
              {isProcessing && ["ai_processing", "ai_chunking", "ai_topics_identified", "ai_batch"].includes(baseStage) && !progressInfo && (
                <div className="ml-auto">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                    <div className="w-1 h-1 bg-secondary animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
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
