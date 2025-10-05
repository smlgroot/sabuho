'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { updateQuestion, updateQuestionOptions } from '@/lib/admin/questions'

const columnHelper = createColumnHelper()

// Editable textarea component with proper focus management
function EditableTextarea({ value, onChange, onSave, onCancel, placeholder, disabled }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const length = textarea.value.length
      textarea.focus()
      textarea.setSelectionRange(length, length)
    }
  }, [])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        } else if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault()
          onSave()
        }
      }}
      className="textarea textarea-bordered textarea-sm w-full min-h-[4rem] text-sm resize-y"
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}

export function QuestionsSectionTanstackTable({ domain, onDomainUpdate }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState({})
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const questions = domain.questions || []

  // Update handlers using TanStack Table meta pattern
  const updateData = useCallback(async (questionId, field, value, optionIndex = null) => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return

    setIsUpdating(true)
    try {
      if (field === 'option') {
        const updatedOptions = [...(question.options || [])]
        const wasCorrect = updatedOptions[optionIndex].includes('[correct]')
        updatedOptions[optionIndex] = wasCorrect ? `${value.trim()} [correct]` : value.trim()

        const updatedQuestion = await updateQuestionOptions(questionId, updatedOptions)

        const updatedDomain = {
          ...domain,
          questions: domain.questions?.map(q =>
            q.id === questionId ? { ...q, options: updatedQuestion.options } : q
          )
        }

        if (onDomainUpdate) {
          onDomainUpdate(updatedDomain)
        }
      } else {
        const updates = {}
        if (field === 'body') {
          updates.body = value.trim()
        } else if (field === 'explanation') {
          updates.explanation = value.trim() || null
        }

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
      }

      setEditingCell(null)
      setEditValue('')
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [domain, onDomainUpdate, questions])

  // Handle edit start
  const handleEditStart = useCallback((questionId, field, currentValue, optionIndex = null) => {
    if (!isUpdating) {
      setEditingCell({ questionId, field, optionIndex })
      setEditValue(currentValue || '')
    }
  }, [isUpdating])

  // Handle edit save
  const handleEditSave = useCallback(() => {
    if (!editingCell || isUpdating) return

    const question = questions.find(q => q.id === editingCell.questionId)
    if (!question) return

    let currentValue
    if (editingCell.field === 'body') {
      currentValue = question.body
    } else if (editingCell.field === 'explanation') {
      currentValue = question.explanation || ''
    } else if (editingCell.field === 'option') {
      const optionText = question.options?.[editingCell.optionIndex] || ''
      currentValue = optionText.replace(/\s*\[correct\]\s*$/, '')
    }

    if (editValue.trim() === currentValue.trim()) {
      setEditingCell(null)
      setEditValue('')
      return
    }

    updateData(editingCell.questionId, editingCell.field, editValue, editingCell.optionIndex)
  }, [editingCell, editValue, isUpdating, questions, updateData])

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  // Toggle option as correct
  const handleToggleCorrect = useCallback(async (questionId, optionIndex) => {
    if (isUpdating) return

    const question = questions.find(q => q.id === questionId)
    if (!question) return

    setIsUpdating(true)
    try {
      const updatedOptions = [...(question.options || [])]
      const currentOption = updatedOptions[optionIndex]
      const isCurrentlyCorrect = currentOption.includes('[correct]')

      updatedOptions.forEach((opt, idx) => {
        updatedOptions[idx] = opt.replace(/\s*\[correct\]\s*$/, '')
      })

      if (!isCurrentlyCorrect) {
        updatedOptions[optionIndex] = `${updatedOptions[optionIndex]} [correct]`
      }

      const updatedQuestion = await updateQuestionOptions(questionId, updatedOptions)

      const updatedDomain = {
        ...domain,
        questions: domain.questions?.map(q =>
          q.id === questionId ? { ...q, options: updatedQuestion.options } : q
        )
      }

      if (onDomainUpdate) {
        onDomainUpdate(updatedDomain)
      }
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating, questions, domain, onDomainUpdate])

  // Column definitions
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expander',
        header: () => <div className="w-8"></div>,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              onClick={row.getToggleExpandedHandler()}
              className="btn btn-ghost btn-xs btn-square"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : null
        },
        size: 40,
      }),
      columnHelper.accessor('body', {
        header: () => <span className="font-semibold text-xs uppercase">{t('Question')}</span>,
        cell: ({ row, table }) => {
          const question = row.original
          const isEditing = editingCell?.questionId === question.id && editingCell?.field === 'body'

          if (isEditing) {
            return (
              <div className="flex gap-1 p-1">
                <EditableTextarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onSave={handleEditSave}
                  onCancel={handleEditCancel}
                  disabled={isUpdating}
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleEditSave}
                    className="btn btn-success btn-xs btn-square"
                    disabled={isUpdating}
                    title={t('Save (Ctrl+Enter)')}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={isUpdating}
                    title={t('Cancel (Esc)')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div
              onClick={() => handleEditStart(question.id, 'body', question.body)}
              className="w-full h-full px-2 py-1 text-sm cursor-pointer hover:bg-base-200 whitespace-pre-wrap"
              title={t('Click to edit')}
            >
              {question.body || <span className="text-base-content/40">{t('Empty')}</span>}
            </div>
          )
        },
        size: 500,
      }),
      columnHelper.accessor('explanation', {
        header: () => <span className="font-semibold text-xs uppercase">{t('Explanation')}</span>,
        cell: ({ row, table }) => {
          const question = row.original
          const isEditing = editingCell?.questionId === question.id && editingCell?.field === 'explanation'

          if (isEditing) {
            return (
              <div className="flex gap-1 p-1">
                <EditableTextarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onSave={handleEditSave}
                  onCancel={handleEditCancel}
                  placeholder={t('Add explanation...')}
                  disabled={isUpdating}
                />
                <div className="flex flex-col gap-1">
                  <button
                    onClick={handleEditSave}
                    className="btn btn-success btn-xs btn-square"
                    disabled={isUpdating}
                    title={t('Save (Ctrl+Enter)')}
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={isUpdating}
                    title={t('Cancel (Esc)')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div
              onClick={() => handleEditStart(question.id, 'explanation', question.explanation || '')}
              className="w-full h-full px-2 py-1 text-sm cursor-pointer hover:bg-base-200 min-h-[2rem] whitespace-pre-wrap"
              title={t('Click to edit')}
            >
              {question.explanation || <span className="text-base-content/40">{t('Add explanation...')}</span>}
            </div>
          )
        },
        size: 400,
      }),
    ],
    [t, editingCell, editValue, isUpdating, handleEditStart, handleEditSave, handleEditCancel]
  )

  // Table instance with meta
  const table = useReactTable({
    data: questions,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    meta: {
      updateData,
    },
  })

  return (
    <div className="w-full h-full bg-base-100">
      <div className="overflow-auto border border-base-300 rounded-lg">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="bg-base-200 border-b-2 border-r border-base-300 px-0 py-2 text-left font-semibold"
                    style={{ width: header.column.columnDef.size }}
                  >
                    <div className="px-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <>
                <tr key={row.id} className="border-b border-base-300 hover:bg-base-100">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="border-r border-base-300 p-0 align-top"
                      style={{ width: cell.column.columnDef.size }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && row.original.options && row.original.options.length > 0 && (
                  row.original.options.map((option, optionIndex) => {
                    const isCorrect = option.includes('[correct]')
                    const optionText = option.replace(/\s*\[correct\]\s*$/, '')
                    const isEditing = editingCell?.questionId === row.original.id &&
                                     editingCell?.field === 'option' &&
                                     editingCell?.optionIndex === optionIndex

                    return (
                      <tr key={`${row.id}-option-${optionIndex}`} className="border-b border-base-300 bg-base-200/30">
                        <td className="border-r border-base-300 p-2 text-center">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-base-300 text-xs font-semibold mx-auto">
                            {String.fromCharCode(65 + optionIndex)}
                          </div>
                        </td>
                        <td className="border-r border-base-300 p-0" colSpan={columns.length - 1}>
                          {isEditing ? (
                            <div className="flex items-center gap-2 px-2 py-1">
                              <button
                                onClick={() => handleToggleCorrect(row.original.id, optionIndex)}
                                className={`btn btn-xs ${isCorrect ? 'btn-success' : 'btn-ghost'}`}
                                disabled={isUpdating}
                                title={t('Mark as correct')}
                              >
                                {isCorrect ? t('Correct') : t('Incorrect')}
                              </button>
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleEditSave()
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    handleEditCancel()
                                  }
                                }}
                                className="input input-bordered input-sm flex-1 text-sm"
                                autoFocus
                                disabled={isUpdating}
                              />
                              <button
                                onClick={handleEditSave}
                                className="btn btn-success btn-xs btn-square"
                                disabled={isUpdating}
                                title={t('Save (Enter)')}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="btn btn-ghost btn-xs btn-square"
                                disabled={isUpdating}
                                title={t('Cancel (Esc)')}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-2 py-1">
                              <button
                                onClick={() => handleToggleCorrect(row.original.id, optionIndex)}
                                className={`btn btn-xs ${isCorrect ? 'btn-success' : 'btn-ghost'}`}
                                disabled={isUpdating}
                                title={t('Mark as correct')}
                              >
                                {isCorrect ? t('Correct') : t('Incorrect')}
                              </button>
                              <div
                                onClick={() => handleEditStart(row.original.id, 'option', optionText, optionIndex)}
                                className={`flex-1 px-2 py-1 text-sm cursor-pointer hover:bg-base-200 rounded ${isCorrect ? 'font-semibold' : ''}`}
                                title={t('Click to edit')}
                              >
                                {optionText}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </>
            ))}
          </tbody>
        </table>

        {questions.length === 0 && (
          <div className="text-center py-12 text-base-content/50">
            <p className="text-sm">{t('No Questions Created Yet')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
