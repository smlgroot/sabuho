import { useState, useRef } from "react";
import { usePostHog } from "@/components/PostHogProvider";

export function useFileUpload(onFileSelect) {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const { trackEvent } = usePostHog();

  const validateFile = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return { valid: false, error: 'Please upload a PDF, DOCX, TXT, or MD file.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB.' };
    }

    return { valid: true };
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadedFile(file);
    trackEvent('file_selected', { props: { fileType: file.type, fileName: file.name } });

    // Call the callback to handle additional state resets in parent
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change event for consistency
      const fakeEvent = {
        target: {
          files: [file]
        }
      };
      await handleFileSelect(fakeEvent);
    }
  };

  const resetFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    uploadedFile,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    resetFile,
    validateFile
  };
}
