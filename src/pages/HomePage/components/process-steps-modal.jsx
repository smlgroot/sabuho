import { AlertCircle } from "lucide-react";
import { useState } from "react";
import FileUploadStep from "./steps/file-upload-step";
import ProcessingStep from "./steps/processing-step";
import ShareMonetizeStep from "./steps/share-monetize-step";

export default function ProcessStepsModal({
  isOpen,
  onDone,
  onCancel,
  uploadedFile,
  fileInputRef,
  onFileSelect,
  onReset,
  currentStep,
  isProcessing,
  processingError,
  retryError,
  validationError,
  currentProcessingState,
  onProcessClick,
  onRetry,
  onClearValidationError,
  onClearRetryError,
  quizGenerated
}) {
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);

  if (!isOpen) return null;

  // Check if any error dialog should be shown
  const showErrorDialog = validationError || retryError;

  const handleCancelClick = () => {
    setShowCancelWarning(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelWarning(false);
    onCancel();
  };

  const handleCancelWarningClose = () => {
    setShowCancelWarning(false);
  };

  const handleResetClick = () => {
    // Show confirmation before resetting
    setShowResetWarning(true);
  };

  const handleConfirmReset = () => {
    setShowResetWarning(false);
    onReset();
  };

  const handleCancelResetWarning = () => {
    setShowResetWarning(false);
  };

  const handleCloseErrorDialog = () => {
    if (validationError) {
      onClearValidationError();
    }
    if (retryError) {
      onClearRetryError();
    }
  };

  return (
    <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-4xl">
        {showErrorDialog ? (
          <>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-error" />
              Error
            </h3>
            <p className="py-4">
              {validationError || retryError}
            </p>
            <div className="modal-action">
              <button onClick={handleCloseErrorDialog} className="btn btn-primary">
                OK
              </button>
            </div>
          </>
        ) : !showCancelWarning && !showResetWarning ? (
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
                onReset={handleResetClick}
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
              {currentStep >= 3 && quizGenerated ? (
                <button
                  onClick={onDone}
                  className="btn btn-primary"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={handleCancelClick}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        ) : showCancelWarning ? (
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
        ) : showResetWarning ? (
          <>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-warning" />
              Reset File?
            </h3>
            <p className="py-4">
              Are you sure you want to reset? The selected file will be removed and you'll need to upload again.
            </p>
            <div className="modal-action">
              <button onClick={handleCancelResetWarning} className="btn btn-ghost">
                Keep File
              </button>
              <button onClick={handleConfirmReset} className="btn btn-error">
                Yes, Reset
              </button>
            </div>
          </>
        ) : null}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={handleCancelClick}>
        <button>close</button>
      </form>
    </dialog>
  );
}
