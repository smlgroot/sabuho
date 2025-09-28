'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Calendar, FileText, HelpCircle } from 'lucide-react'
import { updateDomain, fetchDomains } from '@/lib/admin/domains'
import { QuestionsSection } from './questions-section'
import { ResourcesSection } from './resources-section'
import { DomainTabs } from './domain-tabs'
import { useTranslation } from 'react-i18next'

export function DomainDetail({ domain, onUploadResource, onCreateQuestion, onDomainUpdate }) {
  const { t } = useTranslation()
  const [localDomain, setLocalDomain] = useState(domain)
  const [activeTab, setActiveTab] = useState('questions')
  const [availableDomains, setAvailableDomains] = useState([])
  
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
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {localDomain.thumbnail_url ? (
          <img 
            src={localDomain.thumbnail_url} 
            alt={localDomain.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-xs">{t("No image")}</span>
          </div>
        )}
        <div className="flex-1">
          {editingField === 'name' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValues.name}
              onChange={(e) => handleDomainValueChange(e.target.value)}
              onKeyDown={handleDomainKeyDown}
              onBlur={handleDomainEditSave}
              className="text-3xl font-bold bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              disabled={isUpdatingDomain}
            />
          ) : (
            <h1 
              className={`text-3xl font-bold ${
                'cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors'
              } ${isUpdatingDomain ? 'opacity-50' : ''}`}
              onClick={() => handleDomainEditStart('name')}
              title="Click to edit domain name"
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
              className="text-muted-foreground mt-2 w-full bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isUpdatingDomain}
              placeholder="Add description..."
              rows={2}
            />
          ) : (
            <p 
              className={`text-muted-foreground mt-2 ${
                'cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors'
              } ${isUpdatingDomain ? 'opacity-50' : ''} ${!localDomain.description ? 'italic' : ''}`}
              onClick={() => handleDomainEditStart('description')}
              title="Click to edit description"
            >
              {localDomain.description || 'Click to add description...'}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
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
      />

      {activeTab === 'questions' ? (
        <QuestionsSection
          domain={localDomain}
          onDomainUpdate={handleDomainUpdate}
          availableDomains={availableDomains}
        />
      ) : (
        <ResourcesSection
          domain={localDomain}
          onUploadResource={onUploadResource}
          onDomainUpdate={handleDomainUpdate}
        />
      )}
    </div>
  )
}