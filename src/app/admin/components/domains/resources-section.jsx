'use client'

import { useState, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { checkResourceStatus } from '@/lib/admin/resources'
import { ResourceCard } from '../resources/resource-card'
import { useTranslation } from 'react-i18next'

export function ResourcesSection({ domain, onUploadResource, onDomainUpdate }) {
  const { t } = useTranslation()
  const [checkingResourceStatus, setCheckingResourceStatus] = useState(new Set())

  const handleResourceStatusCheck = useCallback(async (resourceId) => {
    if (checkingResourceStatus.has(resourceId)) return

    setCheckingResourceStatus(prev => new Set(prev).add(resourceId))
    
    try {
      const updatedResource = await checkResourceStatus(resourceId)
      
      const updatedDomain = {
        ...domain,
        resources: domain.resources?.map(resource => 
          resource.id === resourceId ? { ...resource, ...updatedResource } : resource
        )
      }
      
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to check resource status:', error)
    } finally {
      setCheckingResourceStatus(prev => {
        const newSet = new Set(prev)
        newSet.delete(resourceId)
        return newSet
      })
    }
  }, [domain, onDomainUpdate, checkingResourceStatus])

  return (
    <div className="card bg-base-100 border">
      <div className="card-body">
        <div className="flex flex-row items-center justify-between mb-4">
          <h4 className="card-title text-base">{t("Resources")}</h4>
          <button className="btn btn-sm" onClick={onUploadResource}>
            <Upload className="h-4 w-4 mr-2" />
            {t("Upload")}
          </button>
        </div>
        {domain.resources && domain.resources.length > 0 ? (
          <div className="space-y-2">
            {domain.resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onStatusCheck={handleResourceStatusCheck}
                isCheckingStatus={checkingResourceStatus.has(resource.id)}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("No resources uploaded yet.")}</p>
        )}
      </div>
    </div>
  )
}