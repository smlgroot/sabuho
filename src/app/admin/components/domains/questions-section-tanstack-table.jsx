'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { updateQuestion, updateQuestionOptions } from '@/lib/admin/questions'

const columnHelper = createColumnHelper()

// Helper function to convert newlines to HTML for display
const textToHtml = (text) => {
  if (!text) return ''
  return text.replace(/\n/g, '<br />')
}

export function QuestionsSectionTanstackTable({ domain, onDomainUpdate }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState({})
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const questions = domain.questions || []

  // Handle inline edit start
  const handleEditStart = (questionId, field, currentValue, optionIndex = null) => {
    if (!isUpdating) {
      setEditingCell({ questionId, field, optionIndex })
      setEditValue(currentValue || '')
    }
  }

  // Handle inline edit save
  const handleEditSave = async (questionId, field, element, optionIndex = null) => {
    if (!editingCell || isUpdating) return

    const question = questions.find(q => q.id === questionId)
    if (!question) return

    // Convert innerHTML to text preserving line breaks
    const newValue = element.innerHTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div>/gi, '\n')
      .replace(/<\/div>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')

    let currentValue
    if (field === 'body') {
      currentValue = question.body
    } else if (field === 'explanation') {
      currentValue = question.explanation || ''
    } else if (field === 'option') {
      const optionText = question.options?.[optionIndex] || ''
      currentValue = optionText.replace(/\s*\[correct\]\s*$/, '')
    }

    if (newValue.trim() === currentValue.trim()) {
      setEditingCell(null)
      return
    }

    setIsUpdating(true)
    try {
      if (field === 'option') {
        // Update single option
        const updatedOptions = [...(question.options || [])]
        const wasCorrect = updatedOptions[optionIndex].includes('[correct]')
        updatedOptions[optionIndex] = wasCorrect ? `${newValue.trim()} [correct]` : newValue.trim()

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
          updates.body = newValue.trim()
        } else if (field === 'explanation') {
          updates.explanation = newValue.trim() || null
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
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  // Toggle option as correct
  const handleToggleCorrect = async (questionId, optionIndex) => {
    if (isUpdating) return

    const question = questions.find(q => q.id === questionId)
    if (!question) return

    setIsUpdating(true)
    try {
      const updatedOptions = [...(question.options || [])]
      const currentOption = updatedOptions[optionIndex]
      const isCurrentlyCorrect = currentOption.includes('[correct]')

      // Remove [correct] from all options
      updatedOptions.forEach((opt, idx) => {
        updatedOptions[idx] = opt.replace(/\s*\[correct\]\s*$/, '')
      })

      // Add [correct] to the selected option if it wasn't correct
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
  }

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingCell(null)
    setEditValue('')
  }

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
        cell: ({ row }) => {
          const question = row.original
          const isEditing = editingCell?.questionId === question.id && editingCell?.field === 'body'

          return (
            <div
              contentEditable={!isUpdating}
              suppressContentEditableWarning
              onFocus={(e) => {
                if (!isEditing) {
                  handleEditStart(question.id, 'body', question.body)
                }
              }}
              onBlur={(e) => {
                if (isEditing) {
                  handleEditSave(question.id, 'body', e.currentTarget)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleEditCancel()
                  e.currentTarget.blur()
                }
              }}
              className={`w-full h-full px-2 py-1 text-sm cursor-text hover:outline hover:outline-2 hover:outline-primary/20 focus:outline focus:outline-2 focus:outline-primary ${isEditing ? 'bg-base-100' : ''}`}
              title={t('Click to edit')}
              dangerouslySetInnerHTML={{ __html: textToHtml(question.body) }}
            >
            </div>
          )
        },
        size: 500,
      }),
      columnHelper.accessor('explanation', {
        header: () => <span className="font-semibold text-xs uppercase">{t('Explanation')}</span>,
        cell: ({ row }) => {
          const question = row.original
          const isEditing = editingCell?.questionId === question.id && editingCell?.field === 'explanation'

          return (
            <div
              contentEditable={!isUpdating}
              suppressContentEditableWarning
              onFocus={(e) => {
                if (!isEditing) {
                  handleEditStart(question.id, 'explanation', question.explanation)
                }
              }}
              onBlur={(e) => {
                if (isEditing) {
                  handleEditSave(question.id, 'explanation', e.currentTarget)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleEditCancel()
                  e.currentTarget.blur()
                }
              }}
              className={`w-full h-full px-2 py-1 text-sm cursor-text hover:outline hover:outline-2 hover:outline-primary/20 focus:outline focus:outline-2 focus:outline-primary min-h-[2rem] ${isEditing ? 'bg-base-100' : ''}`}
              title={t('Click to edit')}
              data-placeholder={question.explanation ? '' : t('Add explanation...')}
              style={!question.explanation ? { color: 'var(--fallback-bc,oklch(var(--bc)/0.4))' } : {}}
              dangerouslySetInnerHTML={{ __html: question.explanation ? textToHtml(question.explanation) : t('Empty') }}
            >
            </div>
          )
        },
        size: 400,
      }),
    ],
    [t, editingCell, editValue, isUpdating]
  )

  // Table instance
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
                              contentEditable={!isUpdating}
                              suppressContentEditableWarning
                              onFocus={(e) => {
                                if (!isEditing) {
                                  handleEditStart(row.original.id, 'option', optionText, optionIndex)
                                }
                              }}
                              onBlur={(e) => {
                                if (isEditing) {
                                  handleEditSave(row.original.id, 'option', e.currentTarget, optionIndex)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                  handleEditCancel()
                                  e.currentTarget.blur()
                                }
                              }}
                              className={`flex-1 px-2 py-1 text-sm cursor-text hover:outline hover:outline-2 hover:outline-primary/20 focus:outline focus:outline-2 focus:outline-primary rounded ${isEditing ? 'bg-base-100' : ''} ${isCorrect ? 'font-semibold' : ''}`}
                              title={t('Click to edit')}
                            >
                              {optionText}
                            </div>
                          </div>
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
