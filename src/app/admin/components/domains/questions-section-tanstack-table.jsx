'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { DataGrid, Row } from 'react-data-grid'
import 'react-data-grid/lib/styles.css'
import { updateQuestion, updateQuestionOptions } from '@/lib/admin/questions'

export function QuestionsSectionTanstackTable({ domain, onDomainUpdate }) {
  const { t } = useTranslation()
  const [isUpdating, setIsUpdating] = useState(false)
  const questions = domain.questions || []

  // Transform questions into flat rows for the grid
  const rows = useMemo(() => {
    const result = []
    questions.forEach((question, qIndex) => {
      // Main question row
      result.push({
        id: `q-${question.id}`,
        questionId: question.id,
        type: 'question',
        rowIndex: qIndex,
        body: question.body || '',
        explanation: question.explanation || '',
      })

      // Option rows
      if (question.options && question.options.length > 0) {
        question.options.forEach((option, optIndex) => {
          const isCorrect = option.includes('[correct]')
          const optionText = option.replace(/\s*\[correct\]\s*$/, '')
          result.push({
            id: `q-${question.id}-opt-${optIndex}`,
            questionId: question.id,
            type: 'option',
            optionIndex: optIndex,
            optionLabel: String.fromCharCode(65 + optIndex),
            optionText,
            isCorrect,
            body: optionText,
            explanation: '',
          })
        })
      }
    })
    return result
  }, [questions])

  // Handle row updates
  const handleRowsChange = useCallback(async (updatedRows, { indexes, column }) => {
    if (isUpdating) return

    const rowIndex = indexes[0]
    const row = updatedRows[rowIndex]

    setIsUpdating(true)
    try {
      if (row.type === 'question') {
        // Update question body or explanation
        const updates = {}
        if (column.key === 'body') {
          updates.body = row.body.trim()
        } else if (column.key === 'explanation') {
          updates.explanation = row.explanation.trim() || null
        }

        const updatedQuestion = await updateQuestion(row.questionId, updates)

        const updatedDomain = {
          ...domain,
          questions: domain.questions?.map(q =>
            q.id === row.questionId ? { ...q, ...updatedQuestion } : q
          )
        }

        if (onDomainUpdate) {
          onDomainUpdate(updatedDomain)
        }
      } else if (row.type === 'option' && column.key === 'body') {
        // Update option text
        const question = questions.find(q => q.id === row.questionId)
        if (!question) return

        const updatedOptions = [...(question.options || [])]
        const wasCorrect = updatedOptions[row.optionIndex].includes('[correct]')
        updatedOptions[row.optionIndex] = wasCorrect
          ? `${row.body.trim()} [correct]`
          : row.body.trim()

        const updatedQuestion = await updateQuestionOptions(row.questionId, updatedOptions)

        const updatedDomain = {
          ...domain,
          questions: domain.questions?.map(q =>
            q.id === row.questionId ? { ...q, options: updatedQuestion.options } : q
          )
        }

        if (onDomainUpdate) {
          onDomainUpdate(updatedDomain)
        }
      }
    } catch (error) {
      console.error('Failed to update:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [domain, onDomainUpdate, questions, isUpdating])

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

      // Remove [correct] from all options
      updatedOptions.forEach((opt, idx) => {
        updatedOptions[idx] = opt.replace(/\s*\[correct\]\s*$/, '')
      })

      // Add [correct] to selected option if it wasn't correct
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

  // Custom row renderer - just use default Row for all rows
  const RowRenderer = useCallback((key, props) => {
    return <Row key={key} {...props} className={props.row.type === 'option' ? 'bg-base-200/30' : ''} />
  }, [])

  // Column definitions
  const columns = useMemo(() => [
    {
      key: 'type',
      name: '',
      width: 60,
      frozen: true,
      renderCell: ({ row }) => {
        if (row.type === 'question') {
          return <div className="px-2 py-1 text-xs font-semibold text-base-content/50">Q{row.rowIndex + 1}</div>
        }
        if (row.type === 'option') {
          return (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-base-300 text-xs font-semibold">
                {row.optionLabel}
              </div>
            </div>
          )
        }
        return null
      },
      editable: false,
    },
    {
      key: 'body',
      name: t('Question'),
      width: 500,
      editable: true,
      renderCell: ({ row }) => {
        if (row.type === 'option') {
          return (
            <div className="flex items-center gap-2 px-2 py-1">
              <button
                onClick={() => handleToggleCorrect(row.questionId, row.optionIndex)}
                className={`btn btn-xs ${row.isCorrect ? 'btn-success' : 'btn-ghost'}`}
                disabled={isUpdating}
                title={t('Mark as correct')}
              >
                {row.isCorrect ? (
                  <>
                    <Check className="h-3 w-3" />
                    {t('Correct')}
                  </>
                ) : (
                  t('Incorrect')
                )}
              </button>
              <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed">
                {row.body}
              </div>
            </div>
          )
        }
        return (
          <div className="px-2 py-1 text-sm whitespace-pre-wrap leading-relaxed">
            {row.body || <span className="text-base-content/40">{t('Click to edit')}</span>}
          </div>
        )
      },
      renderEditCell: ({ row, onRowChange, onClose }) => {
        const inputRef = useCallback((node) => {
          if (node) {
            node.focus()
            // Auto-resize based on content
            const adjustWidth = () => {
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              context.font = '14px system-ui'
              const width = context.measureText(node.value || 'W').width
              node.style.width = Math.max(200, Math.min(800, width + 40)) + 'px'
            }
            adjustWidth()
            node.addEventListener('input', adjustWidth)
          }
        }, [])

        return (
          <input
            ref={inputRef}
            type="text"
            className="fixed p-2 bg-white border-2 border-primary text-sm outline-none shadow-lg"
            style={{ zIndex: 9999 }}
            value={row.body}
            onChange={(e) => onRowChange({ ...row, body: e.target.value })}
            onBlur={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose(false)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                onClose(true)
              }
            }}
          />
        )
      },
    },
    {
      key: 'explanation',
      name: t('Explanation'),
      width: 400,
      editable: (row) => row.type === 'question',
      renderCell: ({ row }) => {
        if (row.type === 'option') return null
        return (
          <div className="px-2 py-1 text-sm whitespace-pre-wrap leading-relaxed">
            {row.explanation || <span className="text-base-content/40">{t('Add explanation...')}</span>}
          </div>
        )
      },
      renderEditCell: ({ row, onRowChange, onClose }) => {
        const inputRef = useCallback((node) => {
          if (node) {
            node.focus()
            // Auto-resize based on content
            const adjustWidth = () => {
              const canvas = document.createElement('canvas')
              const context = canvas.getContext('2d')
              context.font = '14px system-ui'
              const width = context.measureText(node.value || 'W').width
              node.style.width = Math.max(200, Math.min(800, width + 40)) + 'px'
            }
            adjustWidth()
            node.addEventListener('input', adjustWidth)
          }
        }, [])

        return (
          <input
            ref={inputRef}
            type="text"
            className="fixed p-2 bg-white border-2 border-primary text-sm outline-none shadow-lg"
            style={{ zIndex: 9999 }}
            value={row.explanation}
            onChange={(e) => onRowChange({ ...row, explanation: e.target.value })}
            onBlur={onClose}
            placeholder={t('Add explanation...')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                onClose(false)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                onClose(true)
              }
            }}
          />
        )
      },
    },
  ], [t])

  if (questions.length === 0) {
    return (
      <div className="w-full h-full bg-base-100">
        <div className="text-center py-12 text-base-content/50">
          <p className="text-sm">{t('No Questions Created Yet')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-base-100">
      <DataGrid
        columns={columns}
        rows={rows}
        onRowsChange={handleRowsChange}
        rowHeight={45}
        className="rdg-light border border-base-300 rounded-lg"
        style={{ height: '600px' }}
        rowKeyGetter={(row) => row.id}
        renderers={{
          renderRow: RowRenderer,
        }}
      />
    </div>
  )
}
