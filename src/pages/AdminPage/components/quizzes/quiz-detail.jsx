'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Settings, Plus, CheckCircle, XCircle, Copy, TicketSlash, Trash2, AlertTriangle, BarChart3 } from 'lucide-react'
import * as supabaseService from '@/services/supabaseService'
import { useTranslation } from 'react-i18next'
import { QuizInsights } from './quiz-insights'

export function QuizDetail({ quiz, domains, onSave, onQuizUpdate, onDelete }) {
  const { t } = useTranslation()
  const [editingField, setEditingField] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDomainListSaving, setIsDomainListSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedDomains, setCollapsedDomains] = useState(new Set())
  const [activeTab, setActiveTab] = useState('insights')
  const [quizCodes, setQuizCodes] = useState([])
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [toast, setToast] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  const initialName = quiz?.name ?? ''
  const initialDesc = quiz?.description ?? ''
  const initialSelected = useMemo(() => {
    const raw = quiz?.domains
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // If JSON parsing fails, handle as comma-separated string
        return raw.split(',').map(id => id.trim()).filter(id => id.length > 0)
      }
    }
    return []
  }, [quiz])

  const [values, setValues] = useState({ name: initialName, description: initialDesc })
  const [selected, setSelected] = useState(initialSelected)

  useEffect(() => {
    setValues({ name: initialName, description: initialDesc })
    setSelected(initialSelected)
    setEditingField(null)
  }, [initialName, initialDesc, initialSelected])

  useEffect(() => {
    if (!editingField) return
    if (editingField === 'name' && inputRef.current) {
      inputRef.current.focus(); inputRef.current.select()
    } else if (editingField === 'description' && textareaRef.current) {
      textareaRef.current.focus(); textareaRef.current.select()
    }
  }, [editingField])

  const allDomainIds = useMemo(() => {
    const ids = []
    const walk = (nodes) => nodes.forEach(n => { ids.push(n.id); if (n.children?.length) walk(n.children) })
    walk(domains)
    return ids
  }, [domains])

  const idToName = useMemo(() => {
    const map = new Map()
    const walk = (nodes) => nodes.forEach(n => { map.set(n.id, n.name); if (n.children?.length) walk(n.children) })
    walk(domains)
    return map
  }, [domains])

  const nameChanged = useMemo(() => {
    return values.name.trim() !== (initialName || '').trim()
  }, [values.name, initialName])

  const descChanged = useMemo(() => {
    return (values.description || '').trim() !== (initialDesc || '').trim()
  }, [values.description, initialDesc])

  // Check if quiz has unpublished changes
  const hasUnpublishedChanges = useMemo(() => {
    if (!quiz.published_at) return true;

    const updatedAt = new Date(quiz.updated_at)
    const publishedAt = new Date(quiz.published_at)

    return updatedAt > publishedAt
  }, [quiz?.updated_at, quiz?.published_at])

  const toggleDomainCollapsed = (domainId) => {
    setCollapsedDomains(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domainId)) {
        newSet.delete(domainId)
      } else {
        newSet.add(domainId)
      }
      return newSet
    })
  }

  const isDomainCollapsed = (domainId) => {
    return collapsedDomains.has(domainId)
  }

  const toggleDomain = async (id) => {
    if (isDomainListSaving) return // Prevent concurrent updates
    
    const isCurrentlySelected = selected.includes(id)
    const newSelected = isCurrentlySelected ? selected.filter(x => x !== id) : [...selected, id]
    const previousSelected = selected
    
    setSelected(newSelected)
    
    if (quiz) {
      try {
        await handleDomainListSave(newSelected)
        // Don't revert state on success - let the parent component handle updates
      } catch (error) {
        // Revert the local state if save fails
        console.error('Failed to save domain selection:', error)
        setSelected(previousSelected)
      }
    }
  }

  const selectAll = async () => {
    const previousSelected = selected
    setSelected(allDomainIds)
    if (quiz) {
      try {
        await handleDomainListSave(allDomainIds)
      } catch (error) {
        console.error('Failed to select all domains:', error)
        setSelected(previousSelected)
      }
    }
  }
  
  const deselectAll = async () => {
    const previousSelected = selected
    setSelected([])
    if (quiz) {
      try {
        await handleDomainListSave([])
      } catch (error) {
        console.error('Failed to deselect all domains:', error)
        setSelected(previousSelected)
      }
    }
  }

  const handleFieldSave = async (field) => {
    if (isSaving) return

    const currentValue = field === 'name' ? initialName : initialDesc
    const newValue = field === 'name' ? values.name.trim() : (values.description || '').trim()

    // For existing quizzes, check if value actually changed
    if (quiz && newValue === (currentValue || '').trim()) {
      setEditingField(null)
      return
    }

    if (field === 'name' && !newValue) {
      showToast(t('Please enter a quiz name'), 'error')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        name: field === 'name' ? newValue : values.name,
        description: field === 'description' ? (newValue || null) : values.description,
        domainIds: selected
      })
      setEditingField(null)
    } catch (error) {
      console.error('Failed to save quiz field:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDomainListSave = async (domainIds) => {
    if (isDomainListSaving) return

    setIsDomainListSaving(true)
    try {
      await onSave({
        name: values.name || 'New Quiz',
        description: values.description,
        domainIds
      })
    } catch (error) {
      console.error('Failed to save domain list:', error)
      throw error // Re-throw so caller can handle it
    } finally {
      setIsDomainListSaving(false)
    }
  }

  // Load quiz codes and their claim status
  const loadQuizCodes = async () => {
    if (!quiz?.id) return

    setIsLoadingCodes(true)
    try {
      const { data: codes, error: codesError } = await supabaseService.fetchQuizCodes(quiz.id)

      if (codesError) throw codesError

      setQuizCodes(codes || [])
    } catch (error) {
      console.error('Failed to load quiz codes:', error)
    } finally {
      setIsLoadingCodes(false)
    }
  }

  // Load user credits
  const loadUserCredits = async () => {
    setIsLoadingCredits(true)
    try {
      const { user } = await supabaseService.getCurrentUser()
      if (!user) return

      const { data: credits, error } = await supabaseService.getUserCredits(user.id)

      if (error) {
        throw error
      }

      setUserCredits(credits?.credits || 0)
    } catch (error) {
      console.error('Failed to load user credits:', error)
      setUserCredits(0)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Generate random code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Create new quiz code
  const createQuizCode = async () => {
    // Load user credits before checking
    await loadUserCredits()

    if (userCredits < 1) {
      setShowCreditDialog(true)
      return
    }

    setIsCreatingCode(true)
    try {
      const { user } = await supabaseService.getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const code = generateCode()

      // Create the quiz code
      const { data: newCode, error: codeError } = await supabaseService.createQuizCode(user.id, quiz.id, code)

      if (codeError) throw codeError

      // Deduct credit
      const { error: creditError } = await supabaseService.deductUserCredit(user.id, 1)

      if (creditError) throw creditError

      // Update local state
      setUserCredits(prev => prev - 1)
      await loadQuizCodes()
      setShowCodeDialog(false)

      // Show success dialog with generated code
      setGeneratedCode(code)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error('Failed to create quiz code:', error)
      showToast('Failed to create quiz code. Please try again.', 'error')
    } finally {
      setIsCreatingCode(false)
    }
  }

  // Handle quiz publish
  const handlePublishQuiz = async () => {
    console.log('handlePublishQuiz');
  }

  // Handle quiz deletion
  const handleDeleteQuiz = async () => {
    if (!quiz?.id || !onDelete) {
      console.error('Cannot delete quiz: missing quiz ID or onDelete handler', { quiz: quiz?.id, onDelete: !!onDelete })
      return
    }

    console.log('Starting quiz deletion:', quiz.id)
    setIsDeleting(true)
    try {
      await onDelete(quiz.id)
      setShowDeleteDialog(false)
      showToast(t('Quiz deleted successfully'), 'success')
      console.log('Quiz deleted successfully')
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      showToast(error.message || t('Failed to delete quiz. Please try again.'), 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Load data when quiz changes
  useEffect(() => {
    if (quiz?.id) {
      loadQuizCodes()
    }
  }, [quiz?.id])

  const renderTree = (nodes, level = 0) => (
    <div className="space-y-1">
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0
        const isCollapsed = isDomainCollapsed(node.id)
        const indentationLeft = level * 20
        const isSelected = selected.includes(node.id)
        const questionCount = node.questions?.length || 0

        return (
          <div key={node.id}>
            <div
              className="flex items-center group relative hover:bg-muted rounded p-1"
              style={{ paddingLeft: `${indentationLeft}px` }}
            >
              {hasChildren ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleDomainCollapsed(node.id)
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
              <div className="flex items-center flex-1">
                <input
                  type="checkbox"
                  className="h-4 w-4 mr-2"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation()
                    toggleDomain(node.id)
                  }}
                  disabled={isDomainListSaving}
                />
                <span
                  className={`flex-1 truncate ${level === 0 ? 'font-medium' : ''}`}
                >
                  {node.name}
                </span>
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                  {questionCount}
                </span>
              </div>
            </div>
            {!isCollapsed && hasChildren && renderTree(node.children || [], level + 1)}
          </div>
        )
      })}
    </div>
  )

  const filterTree = (nodes, query) => {
    const q = query.trim().toLowerCase()
    if (!q) return nodes
    
    // When filtering, we want to expand matched results to show context
    const visit = (n) => {
      const children = (n.children || []).map(visit).filter(Boolean)
      const match = n.name.toLowerCase().includes(q)
      if (match || children.length) {
        // If this node or its children match, make sure it's not collapsed during search
        if (match || children.length > 0) {
          setCollapsedDomains(prev => {
            const newSet = new Set(prev)
            newSet.delete(n.id)
            return newSet
          })
        }
        return { ...n, children }
      }
      return null
    }
    const out = []
    for (const n of nodes) {
      const v = visit(n)
      if (v) out.push(v)
    }
    return out
  }

  // Tabs component
  const QuizTabs = () => (
    <div className="mb-6 bg-[#f6f8fc]"
    style={{ borderBottom: '1px solid oklch(45% 0.24 277.023)' }}
    >
      <div className="flex gap-0 ">
        <button
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
             -mb-[2px] mx-2 rounded-t-md
            ${activeTab === 'insights'
              ? 'text-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          onClick={() => setActiveTab('insights')}
        >
          <BarChart3 className="h-4 w-4" />
          <span>{t('Insights')}</span>
        </button>
        <button
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
            -mb-[2px] rounded-t-md
            ${activeTab === 'domains'
              ? 'text-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          onClick={() => setActiveTab('domains')}
        >
          <Settings className="h-4 w-4" />
          <span>{t('Config')}</span>
          {selected.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-base-200 text-base-content">
              {selected.length}
            </span>
          )}
        </button>
        <button
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
            -mb-[2px] rounded-t-md
            ${activeTab === 'codes'
              ? 'text-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          onClick={() => setActiveTab('codes')}
        >
          <TicketSlash className="h-4 w-4" />
          <span>{t('Codes')}</span>
          <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-base-200 text-base-content">
            {quizCodes.length}
          </span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="inline-flex items-center text-xs text-accent-foreground bg-accent border border-border rounded px-2 py-0.5">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse mr-1" />
              Saving...
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {editingField === 'name' ? (
          <input
            ref={inputRef}
            type="text"
            value={values.name}
            onChange={(e) => setValues(v => ({ ...v, name: e.target.value }))}
            onBlur={() => handleFieldSave('name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleFieldSave('name')
              } else if (e.key === 'Escape') {
                setValues(v => ({ ...v, name: initialName }))
                setEditingField(null)
              }
            }}
            disabled={isSaving}
            className="text-3xl font-bold bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            placeholder={t("Enter quiz name")}
          />
        ) : (
          <h1
            className={`text-3xl font-bold cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${isSaving ? 'opacity-50' : ''}`}
            title="Click to edit name"
            onClick={() => !isSaving && setEditingField('name')}
          >
            {values.name || 'Click to set quiz name...'}
          </h1>
        )}

        {editingField === 'description' ? (
          <textarea
            ref={textareaRef}
            value={values.description}
            onChange={(e) => setValues(v => ({ ...v, description: e.target.value }))}
            onBlur={() => handleFieldSave('description')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setValues(v => ({ ...v, description: initialDesc }))
                setEditingField(null)
              }
            }}
            disabled={isSaving}
            className="text-muted-foreground mt-2 w-full bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Add description..."
            rows={2}
          />
        ) : (
          <p
            className={`text-muted-foreground mt-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors ${!values.description ? 'italic' : ''} ${isSaving ? 'opacity-50' : ''}`}
            title="Click to edit description"
            onClick={() => !isSaving && setEditingField('description')}
          >
            {values.description || 'Click to add description...'}
          </p>
        )}
      </div>

      <QuizTabs />

      {activeTab === 'insights' ? (
        <QuizInsights quiz={quiz} selected={selected} idToName={idToName} />
      ) : activeTab === 'domains' ? (
        <div className="space-y-3">
          {/* Publish Section */}
          <div className={`card border ${hasUnpublishedChanges ? 'border-warning bg-warning/5' : 'border-base-300 bg-base-100'}`}>
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">{t('Publish Quiz')}</h3>
                  <p className="text-sm text-base-content/70 mt-1">
                    {hasUnpublishedChanges
                      ? t('You have unpublished changes. Publish to make them available to users.')
                      : t('Quiz is up to date. No changes to publish.')
                    }
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handlePublishQuiz}
                  disabled={!hasUnpublishedChanges || !quiz?.id || isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {t('Publishing...')}
                    </>
                  ) : (
                    t('Publish')
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2">
              {t('Select Domains')}
              {isDomainListSaving && (<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />)}
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={selectAll}>{t('Select All')}</button>
              <button className="btn btn-outline btn-sm" onClick={deselectAll}>{t('Deselect All')}</button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  await loadUserCredits()
                  setShowCodeDialog(true)
                }}
                disabled={!quiz?.id}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('Generate Code')}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder={t('Search domains...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={`border rounded-md p-3 max-h-[50vh] overflow-auto relative ${isDomainListSaving ? 'opacity-50' : ''}`}>
            {isDomainListSaving && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md z-10">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">{t("Saving...")}</span>
                </div>
              </div>
            )}
            {domains.length ? (
              renderTree(filterTree(domains, searchQuery))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("No domains available. Create a domain first.")}</p>
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="text-xs text-muted-foreground">{selected.length} domain(s) selected</div>
          )}

          {/* Danger Zone */}
          <div className="mt-8 pt-6 border-t border-error/30">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-error flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t("Danger Zone")}
              </h3>

              <div className="card border border-error bg-error/5">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-error">{t("Delete Quiz")}</h4>
                      <p className="text-sm text-base-content/70 mt-1">
                        {t("This will make the quiz unavailable for all users.")}
                      </p>
                    </div>
                    <button
                      className="btn btn-error"
                      onClick={() => setShowDeleteDialog(true)}
                      disabled={!quiz?.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("Delete")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2">
              {t("Quiz Codes")}
              {isLoadingCodes && (<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />)}
            </h2>
          </div>
          
          {isLoadingCodes ? (
            <div className="border rounded-md p-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">{t("Loading codes...")}</span>
              </div>
            </div>
          ) : quizCodes.length > 0 ? (
            <div className="border rounded-md">
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>{t('Code')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('Created')}</th>
                      <th>{t('Claimed By')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizCodes.map((code) => {
                      const isClaimed = code.user_quiz_codes && code.user_quiz_codes.length > 0
                      return (
                        <tr key={code.id}>
                          <td>
                            <code className="bg-base-200 px-2 py-1 rounded text-sm font-mono">
                              {code.code}
                            </code>
                          </td>
                          <td>
                            {isClaimed ? (
                              <span className="badge badge-success px-2">{t("Claimed")}</span>
                            ) : (
                              <span className="badge badge-outline px-2">{t("Available")}</span>
                            )}
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {new Date(code.created_at).toLocaleDateString()}
                          </td>
                          <td className="text-sm text-muted-foreground">
                            {isClaimed ? 
                              `User ${code.user_quiz_codes[0].user_id.slice(-8)}` : 
                              '-'
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              <TicketSlash className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("No codes created yet.")}</p>
              <button 
                className="btn btn-primary btn-sm mt-3"
                onClick={async () => {
                  await loadUserCredits()
                  setShowCodeDialog(true)
                }}
                disabled={!quiz?.id}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('Create First Code')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Credit Dialog */}
      {showCreditDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t("Insufficient Credits")}</h3>
            <p className="text-muted-foreground mb-6">
              {t("You need credits to create quiz codes. You currently have")} {userCredits} {t("credit(s). Please purchase more credits to continue.")}
            </p>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowCreditDialog(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary">
                {t("Buy Credits")}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreditDialog(false)} />
        </div>
      )}

      {/* Code Creation Dialog */}
      {showCodeDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{t("Create Quiz Code")}</h3>
            <div className="space-y-4 mb-6">
              <div className="alert alert-info">
                <div>
                  <p className="text-sm">
                    Creating a quiz code will use 1 credit. You currently have {userCredits} credit(s) available.
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground">
                A unique code will be generated that users can redeem to access this quiz.
              </p>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowCodeDialog(false)}
                disabled={isCreatingCode}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createQuizCode}
                disabled={isCreatingCode || userCredits < 1}
              >
                {isCreatingCode ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Creating...
                  </>
                ) : (
                  t('Generate Code')
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCodeDialog(false)} />
        </div>
      )}

      {/* Success Dialog with Generated Code */}
      {showSuccessDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              {t('Code Generated Successfully!')}
            </h3>
            <div className="space-y-4 mb-6">
              <div className="alert alert-success">
                <div>
                  <p className="font-medium">{t("Your quiz code has been generated successfully:")}</p>
                </div>
              </div>
              <div className="bg-base-200 rounded-lg p-4 border-2 border-dashed border-base-300">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-bold tracking-wider">
                    {generatedCode}
                  </code>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode)
                      showToast(t('Code copied to clipboard!'), 'success')
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this code with users so they can redeem access to your quiz.
              </p>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowSuccessDialog(false)
                  setGeneratedCode('')
                }}
              >
                Done
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowSuccessDialog(false)
            setGeneratedCode('')
          }} />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              {t('Delete Quiz')}
            </h3>
            <div className="space-y-4 mb-6">
              <div className="bg-error/10 border border-error rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-error">{t("This action cannot be undone!")}</p>
                    <p className="text-sm text-base-content/70 mt-1">{t("Deleting this quiz will make it unavailable for all users who have access to it.")}</p>
                  </div>
                </div>
              </div>
              <p className="text-base-content/70">
                {t('Are you sure you want to delete "')}
                <span className="font-semibold">{quiz?.name}</span>
                {t('"? This will permanently remove the quiz and all associated data.')}
              </p>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                {t("Cancel")}
              </button>
              <button 
                className="btn btn-error"
                onClick={handleDeleteQuiz}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    {t("Deleting...")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('Delete Quiz')}
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isDeleting && setShowDeleteDialog(false)} />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast toast-top toast-end">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  )
}