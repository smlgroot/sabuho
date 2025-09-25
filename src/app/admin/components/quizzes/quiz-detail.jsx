'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Hash, Code2, Plus, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function QuizDetail({ quiz, domains, onSave, onQuizUpdate }) {
  const [editingField, setEditingField] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDomainListSaving, setIsDomainListSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedDomains, setCollapsedDomains] = useState(new Set())
  const [activeTab, setActiveTab] = useState('domains')
  const [quizCodes, setQuizCodes] = useState([])
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [showCodeDialog, setShowCodeDialog] = useState(false)
  const [isCreatingCode, setIsCreatingCode] = useState(false)
  const [toast, setToast] = useState(null)
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

  const domainDirty = useMemo(() => {
    const norm = (arr) => [...arr].sort()
    return JSON.stringify(norm(selected)) !== JSON.stringify(norm(initialSelected))
  }, [selected, initialSelected])

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
    
    console.log('toggleDomain:', { id, isCurrentlySelected, previousSelected, newSelected })
    setSelected(newSelected)
    
    if (quiz) {
      try {
        await handleDomainListSave(newSelected)
        console.log('handleDomainListSave success')
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
      alert('Please enter a quiz name')
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
      const { data: codes, error: codesError } = await supabase
        .from('quiz_codes')
        .select(`
          id,
          code,
          created_at,
          user_quiz_codes(id, user_id)
        `)
        .eq('quiz_id', quiz.id)
        .order('created_at', { ascending: false })

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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
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
    if (userCredits < 1) {
      setShowCreditDialog(true)
      return
    }

    setIsCreatingCode(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const code = generateCode()

      // Create the quiz code
      const { data: newCode, error: codeError } = await supabase
        .from('quiz_codes')
        .insert({
          author_id: user.id,
          quiz_id: quiz.id,
          code: code
        })
        .select()
        .single()

      if (codeError) throw codeError

      // Deduct credit
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({ credits: userCredits - 1 })
        .eq('user_id', user.id)

      if (creditError) throw creditError

      // Update local state
      setUserCredits(prev => prev - 1)
      await loadQuizCodes()
      setShowCodeDialog(false)
      
      // Show success toast
      showToast(`Quiz code "${code}" created successfully!`)
    } catch (error) {
      console.error('Failed to create quiz code:', error)
      showToast('Failed to create quiz code. Please try again.', 'error')
    } finally {
      setIsCreatingCode(false)
    }
  }

  // Load data when quiz changes or tab changes to codes
  useEffect(() => {
    if (quiz?.id && activeTab === 'codes') {
      loadQuizCodes()
    }
  }, [quiz?.id, activeTab])

  useEffect(() => {
    if (quiz?.id) {
      loadUserCredits()
    }
  }, [quiz?.id])

  const renderTree = (nodes, level = 0) => (
    <div className="space-y-1">
      {nodes.map(node => {
        const hasChildren = node.children && node.children.length > 0
        const isCollapsed = isDomainCollapsed(node.id)
        const indentationLeft = level * 20
        const isSelected = selected.includes(node.id)

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
                {node.question_count && node.question_count > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                    {node.question_count}
                  </span>
                )}
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
    <div className="tabs tabs-box mb-6">
      <button 
        className={`tab ${activeTab === 'domains' ? 'tab-active' : ''}`}
        onClick={() => setActiveTab('domains')}
      >
        <Hash className="h-4 w-4 mr-2" />
        Domains
        {selected.length > 0 && (
          <span className="badge badge-secondary ml-2 text-xs px-2">
            {selected.length}
          </span>
        )}
      </button>
      <button 
        className={`tab ${activeTab === 'codes' ? 'tab-active' : ''}`}
        onClick={() => setActiveTab('codes')}
      >
        <Code2 className="h-4 w-4 mr-2" />
        Codes
        {quizCodes.length > 0 && (
          <span className="badge badge-secondary ml-2 text-xs px-2">
            {quizCodes.length}
          </span>
        )}
      </button>
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
            placeholder="Enter quiz name"
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

      {activeTab === 'domains' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2">
              Select Domains
              {isDomainListSaving && (<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />)}
            </h2>
            <div className="flex gap-2">
              <button className="btn btn-outline btn-sm" onClick={selectAll}>Select All</button>
              <button className="btn btn-outline btn-sm" onClick={deselectAll}>Deselect All</button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowCodeDialog(true)}
                disabled={!quiz?.id || isLoadingCredits}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Code
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={`border rounded-md p-3 max-h-[50vh] overflow-auto relative ${isDomainListSaving ? 'opacity-50' : ''}`}>
            {isDomainListSaving && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md z-10">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Saving...</span>
                </div>
              </div>
            )}
            {domains.length ? (
              renderTree(filterTree(domains, searchQuery))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No domains available. Create a domain first.</p>
              </div>
            )}
          </div>
          {selected.length > 0 && (
            <div className="text-xs text-muted-foreground">{selected.length} domain(s) selected</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center gap-2">
              Quiz Codes
              {isLoadingCodes && (<span className="w-2 h-2 bg-primary rounded-full animate-pulse" />)}
            </h2>
            <div className="flex items-center gap-2">
              {isLoadingCredits ? (
                <div className="text-sm text-muted-foreground">Loading credits...</div>
              ) : (
                <div className="text-sm text-muted-foreground">Credits: {userCredits}</div>
              )}
            </div>
          </div>
          
          {isLoadingCodes ? (
            <div className="border rounded-md p-8 text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading codes...</span>
              </div>
            </div>
          ) : quizCodes.length > 0 ? (
            <div className="border rounded-md">
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Claimed By</th>
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
                              <span className="badge badge-success">Claimed</span>
                            ) : (
                              <span className="badge badge-outline">Available</span>
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
              <Code2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No codes created yet.</p>
              <button 
                className="btn btn-primary btn-sm mt-3"
                onClick={() => setShowCodeDialog(true)}
                disabled={!quiz?.id || isLoadingCredits}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create First Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Credit Dialog */}
      {showCreditDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Insufficient Credits</h3>
            <p className="text-muted-foreground mb-6">
              You need credits to create quiz codes. You currently have {userCredits} credit(s).
              Please purchase more credits to continue.
            </p>
            <div className="modal-action">
              <button 
                className="btn btn-outline"
                onClick={() => setShowCreditDialog(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary">
                Buy Credits
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
            <h3 className="font-bold text-lg mb-4">Create Quiz Code</h3>
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
                  'Create Code'
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCodeDialog(false)} />
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