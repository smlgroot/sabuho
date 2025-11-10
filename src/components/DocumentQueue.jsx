import React from 'react';
import { DOCUMENT_STATUS } from '@/hooks/useFileUpload';

export function DocumentQueue({
  documentQueue,
  onRemoveDocument,
  className = ''
}) {
  // Get file icon based on file type
  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'docx':
      case 'doc':
        return '📝';
      case 'txt':
        return '📃';
      case 'md':
        return '📋';
      default:
        return '📎';
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case DOCUMENT_STATUS.PENDING:
        return (
          <div className="badge badge-ghost badge-sm">
            Pending
          </div>
        );
      case DOCUMENT_STATUS.PROCESSING:
        return (
          <div className="badge badge-primary badge-sm">
            <span className="loading loading-spinner loading-xs mr-1"></span>
            Processing
          </div>
        );
      case DOCUMENT_STATUS.COMPLETED:
        return (
          <div className="badge badge-success badge-sm">
            ✓ Completed
          </div>
        );
      case DOCUMENT_STATUS.FAILED:
        return (
          <div className="badge badge-error badge-sm">
            Failed
          </div>
        );
      default:
        return null;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (documentQueue.length === 0) {
    return null;
  }

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="card-title text-lg">Document Queue</h3>
        <div className="divider mt-0 mb-2"></div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {documentQueue.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-2xl">{getFileIcon(doc.file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={doc.file.name}>
                    {doc.file.name}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {formatFileSize(doc.file.size)}
                  </p>
                  {doc.progress?.stage && doc.status === DOCUMENT_STATUS.PROCESSING && (
                    <p className="text-xs text-primary mt-1">
                      {doc.progress.stage}
                    </p>
                  )}
                  {doc.error && (
                    <p className="text-xs text-error mt-1">
                      {doc.error}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusBadge(doc.status)}
                {doc.status === DOCUMENT_STATUS.PENDING && onRemoveDocument && (
                  <button
                    onClick={() => onRemoveDocument(doc.id)}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {documentQueue.filter(d => d.status === DOCUMENT_STATUS.PENDING).length > 0 && (
          <div className="text-sm text-base-content/60 mt-2">
            {documentQueue.filter(d => d.status === DOCUMENT_STATUS.PENDING).length} document(s) waiting to be processed
          </div>
        )}
      </div>
    </div>
  );
}