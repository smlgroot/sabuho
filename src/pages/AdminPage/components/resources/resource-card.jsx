'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ResourceCard({ resource, onStatusCheck, isCheckingStatus }) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const status = resource.status || 'processing'

  const getStatusBadge = () => {
    if (isCheckingStatus) {
      return (
        <span className="badge badge-outline bg-gray-50 border-gray-200 text-gray-600">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Checking...
        </span>
      )
    }

    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-outline bg-green-50 border-green-200 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </span>
        )
      case 'failure':
        return (
          <span 
            className="badge badge-outline bg-red-50 border-red-200 text-red-700 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => onStatusCheck(resource.id)}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Failed - Click to retry
          </span>
        )
      case 'processing':
      default:
        return (
          <span 
            className="badge badge-outline animate-pulse bg-blue-50 border-blue-200 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => onStatusCheck(resource.id)}
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </span>
        )
    }
  }

  const hasDetails = status === 'completed' && (
    resource.description || 
    resource.url || 
    resource.file_path || 
    (resource.topic_page_range && resource.topic_page_range.topics && resource.topic_page_range.topics.length > 0) || 
    resource.unparsable
  )

  return (
    <div className="border rounded-lg hover:bg-gray-50 transition-colors overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm leading-tight mb-1 break-words">{resource.name}</h4>
            <p className="text-xs text-muted-foreground">
              {new Date(resource.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        {/* Status and Type Badges */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Footer with expand button */}
      {hasDetails && (
        <div className="border-t bg-gray-50 px-4 py-2">
          <button
            className="btn btn-ghost btn-sm w-full justify-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3 mr-1" />
                Show Details
              </>
            )}
          </button>
        </div>
      )}

      {/* Expandable detail section */}
      {hasDetails && isExpanded && (
        <div className="border-t bg-gray-50">
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {resource.description && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">{t("Description")}</p>
                <p className="text-xs text-gray-600 leading-relaxed break-words">{resource.description}</p>
              </div>
            )}
            
            {resource.topic_page_range && resource.topic_page_range.topics && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">{t("Topics")} ({resource.topic_page_range.topics.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {resource.topic_page_range.topics.map((topic, index) => (
                    <div key={index} className="text-xs bg-white p-2 rounded border">
                      <div className="font-medium text-gray-800 break-words">{topic.name}</div>
                      <div className="text-gray-500 mt-1">{t("Pages")} {topic.start}-{topic.end}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {resource.unparsable && (
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">{t("Unparsable Content")}</p>
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 max-h-32 overflow-y-auto break-words">
                  {resource.unparsable}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}