import { AlertCircle } from "lucide-react";
import { useState } from "react";
import FileUploadStep from "./steps/file-upload-step";
import ProcessingStep from "./steps/processing-step";
import ShareMonetizeStep from "./steps/share-monetize-step";

export default function ProcessStepsModal({
  isOpen,
  onClose,
  uploadedFile,
  fileInputRef,
  onFileSelect,
  onReset,
  currentStep,
  isProcessing,
  processingError,
  currentProcessingState,
  onProcessClick,
  onRetry,
  quizGenerated
}) {
  const [showCancelWarning, setShowCancelWarning] = useState(false);

  if (!isOpen) return null;

  const handleCancelClick = () => {
    setShowCancelWarning(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onClose();
  };

  const handleCancelWarningClose = () => {
    setShowCancelWarning(false);
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-4xl">
        {!showCancelWarning ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold uppercase tracking-wide text-base-content/60">
                Process Steps
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUploadStep
                uploadedFile={uploadedFile}
                fileInputRef={fileInputRef}
                onFileSelect={onFileSelect}
                onReset={onReset}
                documentQueue={[]}
              />

              <ProcessingStep
                currentStep={currentStep}
                isProcessing={isProcessing}
                processingError={processingError}
                currentProcessingState={currentProcessingState}
                onProcessClick={onProcessClick}
                onRetry={onRetry}
              />

              <ShareMonetizeStep quizGenerated={quizGenerated} />
            </div>

            <div className="modal-action">
              <button
                onClick={handleCancelClick}
                className="btn btn-ghost"
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-warning" />
              Cancel Process?
            </h3>
            <p className="py-4">
              Are you sure you want to cancel? Any progress in the current process will be lost.
            </p>
            <div className="modal-action">
              <button onClick={handleCancelWarningClose} className="btn btn-ghost">
                Continue Working
              </button>
              <button onClick={handleConfirmCancel} className="btn btn-error">
                Yes, Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
