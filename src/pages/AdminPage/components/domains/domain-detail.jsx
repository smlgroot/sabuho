'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Calendar, FileText, HelpCircle } from 'lucide-react'
import { updateDomain, fetchDomains } from '@/lib/admin/domains'
import * as supabaseService from '@/services/supabaseService'
import QuestionsSectionCustomTable from './questions-section-custom-table'
import { ResourcesSection } from './resources-section'
import { DomainCodesSection } from './domain-codes-section'
import { DomainTabs } from './domain-tabs'
import { useTranslation } from 'react-i18next'

export function DomainDetail({ domain, onUploadResource, onDomainUpdate }) {
  const { t } = useTranslation()
  const [localDomain, setLocalDomain] = useState(domain)
  const [activeTab, setActiveTab] = useState('questions')
  const [availableDomains, setAvailableDomains] = useState([])
  const [domainCodesCount, setDomainCodesCount] = useState(0)

  // Domain inline editing state
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({
    name: domain.name,
    description: domain.description || ''
  })
  const [isUpdatingDomain, setIsUpdatingDomain] = useState(false)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  // Update local domain when prop changes
  useEffect(() => {
    setLocalDomain(domain)
    setEditValues({
      name: domain.name,
      description: domain.description || ''
    })
    setEditingField(null)
    setActiveTab('questions')
  }, [domain])

  // Fetch available domains for moving questions
  useEffect(() => {
    const loadDomains = async () => {
      try {
        const domains = await fetchDomains()
        setAvailableDomains(domains)
      } catch (error) {
        console.error('Failed to fetch domains:', error)
      }
    }
    loadDomains()
  }, [])

  // Callback to receive codes count from DomainCodesSection
  const handleCodesCountUpdate = useCallback((count) => {
    setDomainCodesCount(count)
  }, [])

  const handleDomainUpdate = useCallback((updatedDomain) => {
    setLocalDomain(updatedDomain)
    if (onDomainUpdate) {
      onDomainUpdate(updatedDomain)
    }
  }, [onDomainUpdate])

  // Domain inline editing handlers
  useEffect(() => {
    if (editingField) {
      if (editingField === 'description' && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      } else if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }, [editingField])

  const handleDomainEditStart = (field) => {
    if (!isUpdatingDomain && !editingField) {
      setEditingField(field)
      setEditValues(prev => ({
        ...prev,
        [field]: field === 'name' ? localDomain.name : localDomain.description || ''
      }))
    }
  }

  const handleDomainEditCancel = () => {
    setEditingField(null)
    setEditValues({
      name: localDomain.name,
      description: localDomain.description || ''
    })
  }

  const handleDomainEditSave = async () => {
    if (!editingField) return

    const currentValue = editingField === 'name' ? localDomain.name : localDomain.description || ''
    const newValue = editValues[editingField]

    if (newValue.trim() === currentValue.trim()) {
      setEditingField(null)
      return
    }

    setIsUpdatingDomain(true)
    try {
      const updates = {}
      if (editingField === 'name') {
        updates.name = newValue.trim()
      } else if (editingField === 'description') {
        updates.description = newValue.trim() || null
      }
      
      const updatedDomain = await updateDomain(localDomain.id, updates)
      const updatedDomainWithChildren = {
        ...localDomain,
        ...updatedDomain
      }
      
      setLocalDomain(updatedDomainWithChildren)
      setEditingField(null)
      
      // Notify parent component if callback provided
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomainWithChildren)
      }
    } catch (error) {
      console.error('Failed to update domain:', error)
    } finally {
      setIsUpdatingDomain(false)
    }
  }

  const handleDomainKeyDown = (e) => {
    if (e.key === 'Enter' && editingField !== 'description') {
      e.preventDefault()
      handleDomainEditSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleDomainEditCancel()
    }
  }

  const handleDomainValueChange = (value) => {
    if (!editingField) return
    setEditValues(prev => ({
      ...prev,
      [editingField]: value
    }))
  }


  return (
    <div className="space-y-0">
      {/* Header Section with Name and Description */}
      <div className="bg-white px-6 pt-0 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {isUpdatingDomain && (
              <span className="inline-flex items-center text-xs text-accent-foreground bg-accent border border-border rounded px-2 py-0.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse mr-1" />
                Saving...
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {editingField === 'name' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValues.name}
              onChange={(e) => handleDomainValueChange(e.target.value)}
              onKeyDown={handleDomainKeyDown}
              onBlur={handleDomainEditSave}
              className="text-3xl font-bold bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              disabled={isUpdatingDomain}
            />
          ) : (
            <h1
              className={`text-3xl font-bold ${
                'cursor-pointer hover:bg-gray-50 rounded px-3 py-2 transition-colors'
              } ${isUpdatingDomain ? 'opacity-50' : ''}`}
              onClick={() => handleDomainEditStart('name')}
              title={t("Click to edit domain name")}
            >
              {localDomain.name}
            </h1>
          )}

          {editingField === 'description' ? (
            <textarea
              ref={textareaRef}
              value={editValues.description}
              onChange={(e) => handleDomainValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  handleDomainEditCancel()
                }
              }}
              onBlur={handleDomainEditSave}
              className="text-base text-muted-foreground w-full bg-white border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isUpdatingDomain}
              placeholder={t("Add description...")}
              rows={2}
            />
          ) : (
            <p
              className={`text-base text-muted-foreground ${
                'cursor-pointer hover:bg-gray-50 rounded px-3 py-2 transition-colors'
              } ${isUpdatingDomain ? 'opacity-50' : ''} ${!localDomain.description ? 'italic' : ''}`}
              onClick={() => handleDomainEditStart('description')}
              title={t("Click to edit description")}
            >
              {localDomain.description || t('Click to add description...')}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground px-3">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(localDomain.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <DomainTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        questionsCount={localDomain.questions?.length || 0}
        resourcesCount={localDomain.resources?.length || 0}
        codesCount={domainCodesCount}
      />

      {activeTab === 'questions' ? (
        <div className="px-6 py-0">
          <QuestionsSectionCustomTable
            domain={localDomain}
            onDomainUpdate={handleDomainUpdate}
          />
        </div>
      ) : activeTab === 'resources' ? (
        <div className="px-6 py-6">
          <ResourcesSection
            domain={localDomain}
            onUploadResource={onUploadResource}
            onDomainUpdate={handleDomainUpdate}
          />
        </div>
      ) : activeTab === 'codes' ? (
        <div className="px-6 py-6">
          <DomainCodesSection
            domain={localDomain}
            onCodesCountUpdate={handleCodesCountUpdate}
          />
        </div>
      ) : null}
    </div>
  )
}