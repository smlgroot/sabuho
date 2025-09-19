'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Calendar, FileText, HelpCircle, Upload, Plus, Search, ArrowUpDown, Filter, ChevronDown, Move, ChevronRight, FolderOpen, Folder } from 'lucide-react'
// DaisyUI components used directly with CSS classes
import { fetchQuestionOptions, updateQuestion, createQuestion, deleteQuestion, addQuestionOption, updateQuestionOptions, removeQuestionOption, moveQuestionsToDomain } from '@/lib/questions'
import { updateDomain, fetchDomains } from '@/lib/domains'
import { checkResourceStatus } from '@/lib/resources'
import { QuestionCard } from '@/components/question-card'
import { ResourceCard } from '@/components/resource-card'

export function DomainDetail({ domain, onUploadResource, onCreateQuestion, onDomainUpdate }) {
  const [localDomain, setLocalDomain] = useState(domain)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())
  const [questionOptions, setQuestionOptions] = useState({})
  const [loadingOptions, setLoadingOptions] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [resourceIdFilter, setResourceIdFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false)
  const [processingResources, setProcessingResources] = useState(new Set())
  const [checkingResourceStatus, setCheckingResourceStatus] = useState(new Set())
  
  // Question selection state
  const [selectedQuestions, setSelectedQuestions] = useState(new Set())
  const [availableDomains, setAvailableDomains] = useState([])
  const [isMovingQuestions, setIsMovingQuestions] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [targetDomainId, setTargetDomainId] = useState('')
  const [collapsedDomainsInDialog, setCollapsedDomainsInDialog] = useState(new Set())
  
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
    // Reset expanded questions and options when domain changes
    setExpandedQuestions(new Set())
    setQuestionOptions({})
    setLoadingOptions(new Set())
    setSearchQuery('')
    setSortOrder('desc')
    setDateFromFilter('')
    setDateToFilter('')
    setResourceIdFilter('all')
    setFiltersExpanded(false)
    // Reset question selection
    setSelectedQuestions(new Set())
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

  // Check if any filters are active
  const hasActiveFilters = dateFromFilter || dateToFilter || resourceIdFilter !== 'all'

  // Auto-expand filters when they become active
  useEffect(() => {
    if (hasActiveFilters && !filtersExpanded) {
      setFiltersExpanded(true)
    }
  }, [hasActiveFilters, filtersExpanded])

  const toggleQuestionExpansion = useCallback(async (questionId) => {
    const isExpanded = expandedQuestions.has(questionId)
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedQuestions)
      newExpanded.delete(questionId)
      setExpandedQuestions(newExpanded)
    } else {
      // Expand - fetch options if not already loaded
      const newExpanded = new Set(expandedQuestions)
      newExpanded.add(questionId)
      setExpandedQuestions(newExpanded)
      
      if (!questionOptions[questionId]) {
        setLoadingOptions(prev => new Set(prev).add(questionId))
        try {
          const options = await fetchQuestionOptions(questionId)
          setQuestionOptions(prev => ({ ...prev, [questionId]: options }))
        } catch (error) {
          console.error('Failed to load question options:', error)
        } finally {
          setLoadingOptions(prev => {
            const newLoading = new Set(prev)
            newLoading.delete(questionId)
            return newLoading
          })
        }
      }
    }
  }, [expandedQuestions, questionOptions])

  const handleQuestionUpdate = useCallback(async (questionId, updates) => {
    try {
      const updatedQuestion = await updateQuestion(questionId, updates)
      
      // Update local domain state
      const updatedDomain = {
        ...localDomain,
        questions: localDomain.questions?.map(q => 
          q.id === questionId ? { ...q, ...updatedQuestion } : q
        )
      }
      
      setLocalDomain(updatedDomain)
      
      // Notify parent component if callback provided
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to update question:', error)
      throw error
    }
  }, [localDomain, onDomainUpdate])

  const handleCreateQuestion = useCallback(async () => {
    if (isCreatingQuestion) return
    
    setIsCreatingQuestion(true)
    try {
      const defaultQuestionData = {
        domain_id: localDomain.id,
        body: 'New Question',
        explanation: '',
        options: [
          { label: 'Option A', is_correct: true, why: 'Correct answer explanation' },
          { label: 'Option B', is_correct: false, why: 'Incorrect answer explanation' },
          { label: 'Option C', is_correct: false, why: 'Incorrect answer explanation' },
          { label: 'Option D', is_correct: false, why: 'Incorrect answer explanation' }
        ]
      }
      
      const newQuestion = await createQuestion(defaultQuestionData)
      
      // Update local domain state with the new question
      const updatedDomain = {
        ...localDomain,
        questions: [...(localDomain.questions || []), newQuestion]
      }
      
      setLocalDomain(updatedDomain)
      
      // Notify parent component if callback provided
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to create question:', error)
    } finally {
      setIsCreatingQuestion(false)
    }
  }, [localDomain, onDomainUpdate, isCreatingQuestion])

  const handleQuestionDelete = useCallback(async (questionId) => {
    try {
      await deleteQuestion(questionId)
      
      // Update local domain state by removing the deleted question
      const updatedDomain = {
        ...localDomain,
        questions: localDomain.questions?.filter(q => q.id !== questionId)
      }
      
      setLocalDomain(updatedDomain)
      
      // Clean up related state
      setExpandedQuestions(prev => {
        const newExpanded = new Set(prev)
        newExpanded.delete(questionId)
        return newExpanded
      })
      
      setQuestionOptions(prev => {
        const { [questionId]: removed, ...rest } = prev
        return rest
      })
      
      setLoadingOptions(prev => {
        const newLoading = new Set(prev)
        newLoading.delete(questionId)
        return newLoading
      })
      
      // Notify parent component if callback provided
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to delete question:', error)
      throw error
    }
  }, [localDomain, onDomainUpdate])

  const handleOptionCreate = useCallback(async (questionId) => {
    try {
      // Get current options count for label
      const currentOptions = questionOptions[questionId] || []
      const nextLabel = String.fromCharCode(65 + currentOptions.length) // A=65, B=66, etc.
      
      const updatedQuestion = await addQuestionOption(questionId, `Option ${nextLabel}`)
      
      // Update question options state
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: updatedQuestion.options || []
      }))
    } catch (error) {
      console.error('Failed to create option:', error)
      throw error
    }
  }, [questionOptions])

  const handleOptionUpdate = useCallback(async (questionId, optionIndex, newLabel) => {
    try {
      const currentOptions = questionOptions[questionId] || []
      const updatedOptions = [...currentOptions]
      updatedOptions[optionIndex] = newLabel
      
      const updatedQuestion = await updateQuestionOptions(questionId, updatedOptions)
      
      // Update the option in the local state
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: updatedQuestion.options || []
      }))
    } catch (error) {
      console.error('Failed to update option:', error)
      throw error
    }
  }, [questionOptions])

  const handleOptionDelete = useCallback(async (questionId, optionIndex) => {
    try {
      const updatedQuestion = await removeQuestionOption(questionId, optionIndex)
      
      // Update the options in local state
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: updatedQuestion.options || []
      }))
    } catch (error) {
      console.error('Failed to delete option:', error)
      throw error
    }
  }, [])

  const handleOptionsUpdate = useCallback(async (questionId, options) => {
    try {
      const updatedQuestion = await updateQuestionOptions(questionId, options)
      
      // Update the options in local state
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: updatedQuestion.options || []
      }))
    } catch (error) {
      console.error('Failed to update options:', error)
      throw error
    }
  }, [])

  const handleResourceStatusCheck = useCallback(async (resourceId) => {
    if (checkingResourceStatus.has(resourceId)) return

    setCheckingResourceStatus(prev => new Set(prev).add(resourceId))
    
    try {
      const updatedResource = await checkResourceStatus(resourceId)
      
      // Update the resource in local domain state
      const updatedDomain = {
        ...localDomain,
        resources: localDomain.resources?.map(resource => 
          resource.id === resourceId ? { ...resource, ...updatedResource } : resource
        )
      }
      
      setLocalDomain(updatedDomain)
      
      // Notify parent component if callback provided
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
  }, [localDomain, onDomainUpdate, checkingResourceStatus])

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

  // Question selection handlers
  const handleQuestionSelect = useCallback((questionId, checked) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(questionId)
      } else {
        newSet.delete(questionId)
      }
      return newSet
    })
  }, [])

  // Filter and sort questions
  const filteredAndSortedQuestions = localDomain.questions
    ?.filter(question => {
      // Text search filter
      const matchesSearch = searchQuery === '' || question.body.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Date range filter
      const questionDate = new Date(question.created_at)
      const matchesDateFrom = !dateFromFilter || questionDate >= new Date(dateFromFilter)
      const matchesToDate = !dateToFilter || questionDate <= new Date(dateToFilter + 'T23:59:59')
      
      // Resource ID filter (null = manual, not null = autogenerated)
      let matchesResourceId = true
      if (resourceIdFilter === 'manual') {
        matchesResourceId = !question.resource_id
      } else if (resourceIdFilter === 'autogenerated') {
        matchesResourceId = !!question.resource_id
      }
      
      return matchesSearch && matchesDateFrom && matchesToDate && matchesResourceId
    })
    ?.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    }) || []

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      const allQuestionIds = new Set(filteredAndSortedQuestions.map(q => q.id))
      setSelectedQuestions(allQuestionIds)
    } else {
      setSelectedQuestions(new Set())
    }
  }, [filteredAndSortedQuestions])

  const handleMoveQuestions = useCallback(async () => {
    if (!targetDomainId || selectedQuestions.size === 0 || isMovingQuestions) return

    setIsMovingQuestions(true)
    try {
      const questionIds = Array.from(selectedQuestions)
      await moveQuestionsToDomain(questionIds, targetDomainId)

      // Update local domain state by removing moved questions
      const updatedDomain = {
        ...localDomain,
        questions: localDomain.questions?.filter(q => !selectedQuestions.has(q.id))
      }

      setLocalDomain(updatedDomain)

      // Reset selection and close dialog
      setSelectedQuestions(new Set())
      setMoveDialogOpen(false)
      setTargetDomainId('')

      // Notify parent component
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to move questions:', error)
    } finally {
      setIsMovingQuestions(false)
    }
  }, [targetDomainId, selectedQuestions, isMovingQuestions, localDomain, onDomainUpdate])

  // Utility to flatten domain tree for selection
  const flattenDomains = useCallback((domains) => {
    const flattened = []
    
    const addDomain = (domain, level = 0) => {
      flattened.push({ ...domain, level })
      if (domain.children) {
        domain.children.forEach(child => addDomain(child, level + 1))
      }
    }

    domains.forEach(domain => addDomain(domain))
    return flattened
  }, [])

  // Helper functions for collapsible domain tree in move dialog
  const toggleDomainCollapsedInDialog = useCallback((domainId) => {
    setCollapsedDomainsInDialog(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domainId)) {
        newSet.delete(domainId)
      } else {
        newSet.add(domainId)
      }
      return newSet
    })
  }, [])

  const isDomainCollapsedInDialog = useCallback((domainId) => {
    return collapsedDomainsInDialog.has(domainId)
  }, [collapsedDomainsInDialog])

  // Recursive component for collapsible domain tree in move dialog
  const DomainNodeInDialog = useCallback(({ domain, level }) => {
    const hasChildren = domain.children && domain.children.length > 0
    const isCollapsed = isDomainCollapsedInDialog(domain.id)
    const indentationLeft = level * 20
    const isSelected = targetDomainId === domain.id

    return (
      <>
        <div
          className={`flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer group ${
            isSelected ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' : ''
          }`}
          onClick={() => setTargetDomainId(domain.id)}
          style={{ paddingLeft: `${indentationLeft + 8}px` }}
        >
          {hasChildren ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                toggleDomainCollapsedInDialog(domain.id)
              }}
              className="hover:bg-muted rounded p-0.5 mr-1 cursor-pointer flex-shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4 mr-1 flex-shrink-0" />
          )}
          <div className="flex items-center mr-2">
            {level === 0 ? (
              // Root level domains - always show folder icons
              hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-600 mr-2" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600 mr-2" />
              )
            ) : (
              // Child domains - show smaller, muted folder icons
              hasChildren ? (
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              )
            )}
          </div>
          <div className="flex-1">
            <div className={`font-medium ${level === 0 ? 'text-base' : 'text-sm'} ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
              {domain.name}
            </div>
            {domain.description && (
              <div className="text-xs text-muted-foreground truncate">{domain.description}</div>
            )}
          </div>
          {domain.question_count && domain.question_count > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
              {domain.question_count}
            </span>
          )}
        </div>
        {!isCollapsed && domain.children?.map((child) => (
          <DomainNodeInDialog key={child.id} domain={child} level={level + 1} />
        ))}
      </>
    )
  }, [targetDomainId, isDomainCollapsedInDialog, toggleDomainCollapsedInDialog])

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
            <span className="text-gray-400 text-xs">No image</span>
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
            <div className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              {localDomain.questions?.length || 0} questions
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {localDomain.resources?.length || 0} resources
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-base-100 border">
          <div className="card-body">
            <div className="flex flex-row items-center justify-between mb-4">
              <h4 className="card-title text-base">Resources</h4>
              <button className="btn btn-sm" onClick={onUploadResource}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </button>
            </div>
            {localDomain.resources && localDomain.resources.length > 0 ? (
              <div className="space-y-2">
                {localDomain.resources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onStatusCheck={handleResourceStatusCheck}
                    isCheckingStatus={checkingResourceStatus.has(resource.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No resources uploaded yet.</p>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border md:col-span-2">
          <div className="card-body">
            <div className="flex flex-row items-center justify-between mb-4">
              <h4 className="card-title text-base">Questions</h4>
              <div className="flex items-center gap-2">
                {selectedQuestions.size > 0 && (
                  <>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => setMoveDialogOpen(true)}
                    >
                      <Move className="h-4 w-4 mr-2" />
                      Move ({selectedQuestions.size})
                    </button>
                    
                    {moveDialogOpen && (
                      <div className="modal modal-open">
                        <div className="modal-box relative">
                          <h3 className="font-bold text-lg mb-2">Move Questions</h3>
                          <p className="text-sm text-base-content/70 mb-4">
                            Move {selectedQuestions.size} selected question{selectedQuestions.size > 1 ? 's' : ''} to a different domain.
                          </p>
                          <button 
                            className="btn btn-sm btn-circle absolute right-2 top-2"
                            onClick={() => {
                              setMoveDialogOpen(false)
                              setTargetDomainId('')
                              setCollapsedDomainsInDialog(new Set())
                            }}
                          >
                            ✕
                          </button>
                          
                          <div className="space-y-1 max-h-80 overflow-y-auto border rounded-md p-2 bg-base-100">
                            {availableDomains
                              .filter(d => d.id !== localDomain.id)
                              .map((domain) => (
                                <DomainNodeInDialog key={domain.id} domain={domain} level={0} />
                              ))}
                            {availableDomains.filter(d => d.id !== localDomain.id).length === 0 && (
                              <div className="text-center py-8 text-base-content/70">
                                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No other domains available</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="modal-action">
                            <button 
                              className="btn btn-outline"
                              onClick={() => {
                                setMoveDialogOpen(false)
                                setTargetDomainId('')
                                setCollapsedDomainsInDialog(new Set())
                              }}
                            >
                              Cancel
                            </button>
                            <button 
                              className="btn btn-primary"
                              onClick={handleMoveQuestions}
                              disabled={!targetDomainId || isMovingQuestions}
                            >
                              {isMovingQuestions ? 'Moving...' : 'Move Questions'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <button className="btn btn-sm" onClick={handleCreateQuestion} disabled={isCreatingQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  {isCreatingQuestion ? 'Creating...' : 'Add'}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    className="input input-bordered pl-9 w-full"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-outline btn-sm shrink-0"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                </button>
              </div>
              
              <div className="collapse">
                <div className="flex items-center justify-between">
                  <button 
                    className="btn btn-ghost btn-sm p-0 h-auto"
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Advanced Filters
                        {hasActiveFilters && (
                          <span className="badge badge-secondary ml-2 text-xs">
                            {[dateFromFilter && 'Date', resourceIdFilter !== 'all' && 'Type'].filter(Boolean).length} active
                          </span>
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {hasActiveFilters && (
                    <button
                      className="btn btn-ghost btn-sm text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setDateFromFilter('')
                        setDateToFilter('')
                        setResourceIdFilter('all')
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {filtersExpanded && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Created Date Range</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label htmlFor="date-from" className="sr-only">From date</label>
                            <input
                              id="date-from"
                              type="date"
                              className="input input-bordered text-sm w-full"
                              value={dateFromFilter}
                              onChange={(e) => setDateFromFilter(e.target.value)}
                              placeholder="From"
                            />
                          </div>
                          <span className="text-muted-foreground text-sm">to</span>
                          <div className="flex-1">
                            <label htmlFor="date-to" className="sr-only">To date</label>
                            <input
                              id="date-to"
                              type="date"
                              className="input input-bordered text-sm w-full"
                              value={dateToFilter}
                              onChange={(e) => setDateToFilter(e.target.value)}
                              placeholder="To"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Question Type</label>
                        <div className="dropdown w-full">
                          <button 
                            tabIndex={0}
                            className="btn btn-outline w-full justify-between text-sm"
                          >
                            {resourceIdFilter === 'all' ? 'All Questions' : 
                             resourceIdFilter === 'manual' ? 'Manual Questions' : 'Auto-generated Questions'}
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow">
                            <li>
                              <button onClick={() => setResourceIdFilter('all')} className={resourceIdFilter === 'all' ? 'active' : ''}>
                                All Questions
                              </button>
                            </li>
                            <li>
                              <button onClick={() => setResourceIdFilter('manual')} className={resourceIdFilter === 'manual' ? 'active' : ''}>
                                Manual Questions
                              </button>
                            </li>
                            <li>
                              <button onClick={() => setResourceIdFilter('autogenerated')} className={resourceIdFilter === 'autogenerated' ? 'active' : ''}>
                                Auto-generated Questions
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Actions</label>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-outline btn-sm flex-1"
                            onClick={() => {
                              setDateFromFilter('')
                              setDateToFilter('')
                              setResourceIdFilter('all')
                            }}
                            disabled={!hasActiveFilters}
                          >
                            Reset Filters
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {filteredAndSortedQuestions.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={
                      filteredAndSortedQuestions.length > 0 &&
                      filteredAndSortedQuestions.every(q => selectedQuestions.has(q.id))
                    }
                    onChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedQuestions.size > 0
                      ? `${selectedQuestions.size} of ${filteredAndSortedQuestions.length} selected`
                      : 'Select all'}
                  </span>
                  {selectedQuestions.size > 0 && (
                    <button
                      className="btn btn-ghost btn-sm h-auto p-1 text-xs"
                      onClick={() => setSelectedQuestions(new Set())}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                {filteredAndSortedQuestions.map((question) => {
                  const isExpanded = expandedQuestions.has(question.id)
                  const isLoading = loadingOptions.has(question.id)
                  const options = questionOptions[question.id]
                  const isSelected = selectedQuestions.has(question.id)
                  
                  return (
                    <div key={question.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox mt-3"
                        checked={isSelected}
                        onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                      />
                      <div className="flex-1">
                        <QuestionCard
                          question={question}
                          isExpanded={isExpanded}
                          isLoading={isLoading}
                          options={options}
                          onToggleExpansion={toggleQuestionExpansion}
                          onQuestionUpdate={handleQuestionUpdate}
                          onQuestionDelete={handleQuestionDelete}
                          onOptionsUpdate={handleOptionsUpdate}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : searchQuery ? (
              <p className="text-muted-foreground text-sm">No questions match your search.</p>
            ) : (
              <p className="text-muted-foreground text-sm">No questions created yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}