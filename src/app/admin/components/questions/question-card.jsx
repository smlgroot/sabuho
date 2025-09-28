'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function QuestionCard({
  question,
  isExpanded,
  isLoading,
  options,
  onToggleExpansion,
  onQuestionUpdate,
  onQuestionDelete,
  onOptionsUpdate
}) {
  const { t } = useTranslation()
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({
    body: question.body,
    explanation: question.explanation || '',
    options: options?.join('\n') || ''
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (editingField) {
      if ((editingField === 'explanation' || editingField === 'options') && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
      } else if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }, [editingField])

  const handleEditStart = (field) => {
    if (isExpanded && !isUpdating && !editingField) {
      setEditingField(field)
      setEditValues(prev => ({
        ...prev,
        [field]: field === 'explanation' ? question.explanation || '' :
                field === 'options' ? options?.join('\n') || '' :
                question.body
      }))
    }
  }

  const handleEditCancel = () => {
    setEditingField(null)
    setEditValues({
      body: question.body,
      explanation: question.explanation || '',
      options: options?.join('\n') || ''
    })
  }

  const handleEditSave = async () => {
    if (!editingField) return

    const currentValue = editingField === 'explanation' ? question.explanation || '' :
                        editingField === 'options' ? options?.join('\n') || '' :
                        question.body

    const newValue = editValues[editingField]

    if (newValue.trim() === currentValue.trim()) {
      setEditingField(null)
      return
    }

    setIsUpdating(true)
    try {
      if (editingField === 'options') {
        if (onOptionsUpdate) {
          const optionsArray = newValue.trim()
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
          await onOptionsUpdate(question.id, optionsArray)
        }
      } else {
        const updates = {}
        if (editingField === 'body') {
          updates.body = newValue.trim()
        } else if (editingField === 'explanation') {
          updates.explanation = newValue.trim() || null
        }
        
        await onQuestionUpdate(question.id, updates)
      }
      setEditingField(null)
    } catch (error) {
      console.error('Failed to update question:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && editingField !== 'explanation' && editingField !== 'options') {
      e.preventDefault()
      handleEditSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleEditCancel()
    }
  }

  const handleValueChange = (value) => {
    if (!editingField) return
    setEditValues(prev => ({
      ...prev,
      [editingField]: value
    }))
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    try {
      await onQuestionDelete(question.id)
    } catch (error) {
      console.error('Failed to delete question:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <div key={question.id} className="p-2 border rounded">
      <div className="flex items-start gap-2">
        <button
          className="btn btn-ghost btn-sm p-1 h-6 w-6"
          onClick={() => onToggleExpansion(question.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1">
          {editingField === 'body' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValues.body}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleEditSave}
              className="w-full text-sm bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isUpdating}
            />
          ) : (
            <p 
              className={`text-sm line-clamp-2 ${
                isExpanded ? 'cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors' : ''
              } ${isUpdating ? 'opacity-50' : ''}`}
              onClick={() => handleEditStart('body')}
              title={isExpanded ? 'Click to edit' : ''}
            >
              {question.body}
            </p>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 ml-8 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-xs font-medium text-blue-800 mb-1">{t("Explanation:")}</h4>
            {editingField === 'explanation' ? (
              <textarea
                ref={textareaRef}
                value={editValues.explanation}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleEditCancel()
                  }
                }}
                onBlur={handleEditSave}
                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isUpdating}
                placeholder={t("Add explanation...")}
                rows={3}
              />
            ) : (
              <p 
                className={`text-xs text-blue-700 ${
                  'cursor-pointer hover:bg-blue-100 rounded px-1 py-0.5 transition-colors'
                } ${isUpdating ? 'opacity-50' : ''} ${!question.explanation ? 'italic text-blue-500' : ''}`}
                onClick={() => handleEditStart('explanation')}
                title={t("Click to edit explanation")}
              >
                {question.explanation || t('Click to add explanation...')}
              </p>
            )}
          </div>
          
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-medium text-gray-800">{t("Options:")}</h4>
              {editingField === 'options' && (
                <span className="text-xs text-gray-500 italic">{t("Cmd/Ctrl + Enter to mark line as correct")}</span>
              )}
            </div>
            {editingField === 'options' ? (
              <textarea
                ref={textareaRef}
                value={editValues.options}
                onChange={(e) => handleValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleEditCancel()
                  } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    const textarea = e.target
                    const cursorPosition = textarea.selectionStart
                    const lines = editValues.options.split('\n')
                    
                    // Find which line the cursor is on
                    let currentPos = 0
                    let lineIndex = 0
                    for (let i = 0; i < lines.length; i++) {
                      if (cursorPosition <= currentPos + lines[i].length) {
                        lineIndex = i
                        break
                      }
                      currentPos += lines[i].length + 1 // +1 for newline
                    }
                    
                    // Remove [correct] from all lines first
                    const cleanedLines = lines.map(line => line.replace(/\s*\[correct\]\s*/g, '').trim())
                    
                    // Add [correct] to the current line if it has content
                    if (cleanedLines[lineIndex] && cleanedLines[lineIndex].trim()) {
                      cleanedLines[lineIndex] = `${cleanedLines[lineIndex]} [correct]`
                    }
                    
                    const newValue = cleanedLines.join('\n')
                    handleValueChange(newValue)
                  }
                }}
                onBlur={handleEditSave}
                className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
                disabled={isUpdating}
                placeholder="Enter options, one per line..."
                rows={Math.max(4, (editValues.options.match(/\n/g) || []).length + 3)}
                style={{
                  minHeight: '80px',
                  height: 'auto'
                }}
              />
            ) : (
              <div 
                className={`text-xs text-gray-700 ${
                  'cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors'
                } ${isUpdating ? 'opacity-50' : ''} ${!options?.length ? 'italic text-gray-500' : ''}`}
                onClick={() => handleEditStart('options')}
                title={t("Click to edit options")}
              >
                {options?.length ? (
                  <div className="space-y-2">
                    {options.map((option, index) => {
                      const isCorrect = option.includes('[correct]')
                      const displayText = option.replace(/\s*\[correct\]\s*/g, '').trim()
                      
                      return (
                        <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2 shadow-sm">
                          <span className="font-mono text-xs text-gray-800 flex-1">
                            {displayText}
                          </span>
                          {isCorrect && (
                            <span className="badge badge-success ml-2 text-xs">
                              Correct
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  'Click to add options...'
                )}
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-3 border-t border-gray-200 mt-3">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">{t("Delete this question?")}</span>
                <button
                  className="btn btn-error btn-sm h-7 px-2 text-xs"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  className="btn btn-outline btn-sm h-7 px-2 text-xs"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteClick}
                disabled={isUpdating || editingField !== null}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}