'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Search, ArrowUpDown, Filter, ChevronDown, Move, Folder, ChevronRight, FolderOpen } from 'lucide-react'
import { fetchQuestionOptions, updateQuestion, createQuestion, deleteQuestion, addQuestionOption, updateQuestionOptions, removeQuestionOption, moveQuestionsToDomain } from '@/lib/questions'
import { QuestionCard } from '../questions/question-card'

export function QuestionsSection({ 
  domain, 
  onDomainUpdate, 
  availableDomains
}) {
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
  
  // Question selection state
  const [selectedQuestions, setSelectedQuestions] = useState(new Set())
  const [isMovingQuestions, setIsMovingQuestions] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [targetDomainId, setTargetDomainId] = useState('')
  const [collapsedDomainsInDialog, setCollapsedDomainsInDialog] = useState(new Set())

  // Reset state when domain changes
  useEffect(() => {
    setExpandedQuestions(new Set())
    setQuestionOptions({})
    setLoadingOptions(new Set())
    setSearchQuery('')
    setSortOrder('desc')
    setDateFromFilter('')
    setDateToFilter('')
    setResourceIdFilter('all')
    setFiltersExpanded(false)
    setSelectedQuestions(new Set())
  }, [domain])

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
      const newExpanded = new Set(expandedQuestions)
      newExpanded.delete(questionId)
      setExpandedQuestions(newExpanded)
    } else {
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
      
      const updatedDomain = {
        ...domain,
        questions: domain.questions?.map(q => 
          q.id === questionId ? { ...q, ...updatedQuestion } : q
        )
      }
      
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to update question:', error)
      throw error
    }
  }, [domain, onDomainUpdate])

  const handleCreateQuestion = useCallback(async () => {
    if (isCreatingQuestion) return
    
    setIsCreatingQuestion(true)
    try {
      const defaultQuestionData = {
        domain_id: domain.id,
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
      
      const updatedDomain = {
        ...domain,
        questions: [...(domain.questions || []), newQuestion]
      }
      
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to create question:', error)
    } finally {
      setIsCreatingQuestion(false)
    }
  }, [domain, onDomainUpdate, isCreatingQuestion])

  const handleQuestionDelete = useCallback(async (questionId) => {
    try {
      await deleteQuestion(questionId)
      
      const updatedDomain = {
        ...domain,
        questions: domain.questions?.filter(q => q.id !== questionId)
      }
      
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
      
      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to delete question:', error)
      throw error
    }
  }, [domain, onDomainUpdate])

  const handleOptionsUpdate = useCallback(async (questionId, options) => {
    try {
      const updatedQuestion = await updateQuestionOptions(questionId, options)
      
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: updatedQuestion.options || []
      }))
    } catch (error) {
      console.error('Failed to update options:', error)
      throw error
    }
  }, [])

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
  const filteredAndSortedQuestions = domain.questions
    ?.filter(question => {
      const matchesSearch = searchQuery === '' || question.body.toLowerCase().includes(searchQuery.toLowerCase())
      
      const questionDate = new Date(question.created_at)
      const matchesDateFrom = !dateFromFilter || questionDate >= new Date(dateFromFilter)
      const matchesToDate = !dateToFilter || questionDate <= new Date(dateToFilter + 'T23:59:59')
      
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

      const updatedDomain = {
        ...domain,
        questions: domain.questions?.filter(q => !selectedQuestions.has(q.id))
      }

      setSelectedQuestions(new Set())
      setMoveDialogOpen(false)
      setTargetDomainId('')

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to move questions:', error)
    } finally {
      setIsMovingQuestions(false)
    }
  }, [targetDomainId, selectedQuestions, isMovingQuestions, domain, onDomainUpdate])

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
  const DomainNodeInDialog = useCallback(({ domain: domainItem, level }) => {
    const hasChildren = domainItem.children && domainItem.children.length > 0
    const isCollapsed = isDomainCollapsedInDialog(domainItem.id)
    const indentationLeft = level * 20
    const isSelected = targetDomainId === domainItem.id

    return (
      <>
        <div
          className={`flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer group ${
            isSelected ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800' : ''
          }`}
          onClick={() => setTargetDomainId(domainItem.id)}
          style={{ paddingLeft: `${indentationLeft + 8}px` }}
        >
          {hasChildren ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                toggleDomainCollapsedInDialog(domainItem.id)
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
              hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-600 mr-2" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600 mr-2" />
              )
            ) : (
              hasChildren ? (
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-muted-foreground mr-2" />
              )
            )}
          </div>
          <div className="flex-1">
            <div className={`font-medium ${level === 0 ? 'text-base' : 'text-sm'} ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
              {domainItem.name}
            </div>
            {domainItem.description && (
              <div className="text-xs text-muted-foreground truncate">{domainItem.description}</div>
            )}
          </div>
          {domainItem.question_count && domainItem.question_count > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
              {domainItem.question_count}
            </span>
          )}
        </div>
        {!isCollapsed && domainItem.children?.map((child) => (
          <DomainNodeInDialog key={child.id} domain={child} level={level + 1} />
        ))}
      </>
    )
  }, [targetDomainId, isDomainCollapsedInDialog, toggleDomainCollapsedInDialog])

  return (
    <div className="card bg-base-100 border">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 className="card-title text-base">Questions</h4>
          <div className="flex flex-wrap items-center gap-2">
            {selectedQuestions.size > 0 && (
              <>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setMoveDialogOpen(true)}
                >
                  <Move className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Move ({selectedQuestions.size})</span>
                  <span className="sm:hidden">({selectedQuestions.size})</span>
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
                          .filter(d => d.id !== domain.id)
                          .map((domainItem) => (
                            <DomainNodeInDialog key={domainItem.id} domain={domainItem} level={0} />
                          ))}
                        {availableDomains.filter(d => d.id !== domain.id).length === 0 && (
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
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isCreatingQuestion ? 'Creating...' : 'Add'}</span>
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
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
              <ArrowUpDown className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
              <span className="sm:hidden">{sortOrder === 'desc' ? 'New' : 'Old'}</span>
            </button>
          </div>
          
          <div className="collapse">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button 
                className="btn btn-ghost btn-sm p-0 h-auto justify-start"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    <span className="hidden sm:inline">Advanced Filters</span>
                    <span className="sm:hidden">Filters</span>
                    {hasActiveFilters && (
                      <span className="badge badge-secondary ml-2 text-xs">
                        {[dateFromFilter && 'Date', resourceIdFilter !== 'all' && 'Type'].filter(Boolean).length}
                      </span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${filtersExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {hasActiveFilters && (
                <button
                  className="btn btn-ghost btn-sm text-sm text-muted-foreground hover:text-foreground self-start sm:self-auto"
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
              <div className="space-y-4 pt-3 border-t border-border/40">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Created Date Range</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                      <span className="text-muted-foreground text-sm self-center hidden sm:block">to</span>
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
                        <span className="truncate">
                          {resourceIdFilter === 'all' ? 'All Questions' : 
                           resourceIdFilter === 'manual' ? 'Manual' : 'Auto-generated'}
                        </span>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
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
                </div>
                
                <div className="flex justify-end">
                  <button
                    className="btn btn-outline btn-sm"
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
            )}
          </div>
        </div>
        
        {filteredAndSortedQuestions.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
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
              </div>
              {selectedQuestions.size > 0 && (
                <button
                  className="btn btn-ghost btn-sm h-auto p-1 text-xs self-start sm:self-auto"
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
  )
}