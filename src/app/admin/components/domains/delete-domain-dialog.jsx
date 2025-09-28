'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DeleteDomainDialog({ isOpen, onClose, domain, onConfirm }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!domain) return

    setLoading(true)
    try {
      await onConfirm(domain)
      onClose()
    } catch (error) {
      console.error('Failed to delete domain:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasChildren = domain?.children && domain.children.length > 0
  const hasQuestions = domain?.question_count && domain.question_count > 0
  const hasResources = domain?.resources && domain.resources.length > 0

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box relative max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error/10">
            <AlertTriangle className="h-5 w-5 text-error" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{t("Delete Domain")}</h3>
            <p className="text-sm opacity-60">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {domain && (
          <div className="py-4">
            <p className="text-sm mb-4">
              Are you sure you want to delete <strong>&ldquo;{domain.name}&rdquo;</strong>?
            </p>

            {(hasChildren || hasQuestions || hasResources) && (
              <div className="alert alert-error">
                <p className="text-sm font-medium mb-2">
                  This will also permanently delete:
                </p>
                <ul className="text-sm space-y-1">
                  {hasChildren && (
                    <li>• {domain.children.length} child domain{domain.children.length !== 1 ? 's' : ''}</li>
                  )}
                  {hasQuestions && (
                    <li>• {domain.question_count} question{domain.question_count !== 1 ? 's' : ''}</li>
                  )}
                  {hasResources && (
                    <li>• {domain.resources.length} resource{domain.resources.length !== 1 ? 's' : ''}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Domain
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}