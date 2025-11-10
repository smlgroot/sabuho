import { useState, useRef, useCallback } from "react";
import { usePostHog } from "@/components/PostHogProvider";

// Document status types
export const DOCUMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export function useFileUpload(onFileSelect) {
  const [documentQueue, setDocumentQueue] = useState([]);
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

  // Generate a unique ID for each document
  const generateDocumentId = () => {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Check if a file is already in the queue (by name and size)
  const isDuplicateFile = (file) => {
    return documentQueue.some(
      doc => doc.file.name === file.name && doc.file.size === file.size
    );
  };

  // Add a document to the queue
  const addDocumentToQueue = (file) => {
    const newDocument = {
      id: generateDocumentId(),
      file: file,
      status: DOCUMENT_STATUS.PENDING,
      s3Key: null,
      sessionId: null,
      error: null,
      progress: { stage: '', current: 0, total: 0 }
    };

    setDocumentQueue(prev => [...prev, newDocument]);
    return newDocument;
  };

  // Remove a document from the queue
  const removeDocumentFromQueue = useCallback((documentId) => {
    setDocumentQueue(prev => prev.filter(doc => doc.id !== documentId));
  }, []);

  // Update document status
  const updateDocumentStatus = useCallback((documentId, updates) => {
    setDocumentQueue(prev =>
      prev.map(doc =>
        doc.id === documentId ? { ...doc, ...updates } : doc
      )
    );
  }, []);

  // Get document by ID
  const getDocumentById = useCallback((documentId) => {
    return documentQueue.find(doc => doc.id === documentId);
  }, [documentQueue]);

  // Get pending documents
  const getPendingDocuments = useCallback(() => {
    return documentQueue.filter(doc => doc.status === DOCUMENT_STATUS.PENDING);
  }, [documentQueue]);

  // Get processing document (should only be one at a time)
  const getProcessingDocument = useCallback(() => {
    return documentQueue.find(doc => doc.status === DOCUMENT_STATUS.PROCESSING);
  }, [documentQueue]);

  // Clear all pending documents
  const clearPendingDocuments = useCallback(() => {
    setDocumentQueue(prev => prev.filter(doc => doc.status !== DOCUMENT_STATUS.PENDING));
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Check for duplicate file
    if (isDuplicateFile(file)) {
      alert('This file is already in the queue.');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Add document to queue
    const newDocument = addDocumentToQueue(file);
    trackEvent('file_selected', { props: { fileType: file.type, fileName: file.name } });

    // Reset file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Call the callback to handle additional state updates in parent
    if (onFileSelect) {
      onFileSelect(newDocument, documentQueue);
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

  const resetDocumentQueue = useCallback(() => {
    setDocumentQueue([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Legacy support - returns first pending document
  const uploadedFile = documentQueue.find(doc => doc.status === DOCUMENT_STATUS.PENDING)?.file || null;

  return {
    // Queue management
    documentQueue,
    addDocumentToQueue,
    removeDocumentFromQueue,
    updateDocumentStatus,
    getDocumentById,
    getPendingDocuments,
    getProcessingDocument,
    clearPendingDocuments,
    resetDocumentQueue,

    // Legacy support
    uploadedFile,
    resetFile: resetDocumentQueue, // Alias for backward compatibility

    // UI state and handlers
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    validateFile,

    // Constants
    DOCUMENT_STATUS
  };
}
