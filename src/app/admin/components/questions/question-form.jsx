'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'

export function QuestionForm({ 
  isOpen, 
  onClose, 
  domainId, 
  resources, 
  question, 
  onSubmit 
}) {
  const { t } = useTranslation()
  const [body, setBody] = useState('')
  const [explanation, setExplanation] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (question) {
      setBody(question.body)
      setExplanation(question.explanation || '')
      setResourceId(question.resource_id || '')
      setOptions(question.options || ['', ''])
    } else {
      setBody('')
      setExplanation('')
      setResourceId(resources[0]?.id || '')
      setOptions(['', ''])
    }
  }, [question, resources])

  const addOption = () => {
    setOptions([...options, ''])
  }

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!body.trim()) return
    if (!resourceId) return
    if (options.length < 2) return
    if (options.some(opt => !opt.trim())) {
      alert(t('allOptionsMustHaveLabels'))
      return
    }

    setLoading(true)

    try {
      const questionData = {
        domain_id: domainId,
        body: body.trim(),
        explanation: explanation.trim() || undefined,
        resource_id: resourceId,
        options: options.map((option, index) => ({
          label: option.trim(),
          is_correct: index === 0, // First option is correct by default
          order_index: index
        }))
      }

      await onSubmit(questionData)
      onClose()
    } catch (error) {
      console.error('Failed to save question:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box relative max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">
          {question ? t('editQuestion') : t('createNewQuestion')}
        </h3>
        <button 
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        
        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="form-control">
            <label className="label" htmlFor="resource">
              <span className="label-text">{t('sourceResource')}</span>
            </label>
            <select
              id="resource"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="select select-bordered w-full"
              required
            >
              <option value="">{t('selectAResource')}</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="body">
              <span className="label-text">{t('question')}</span>
            </label>
            <textarea
              id="body"
              className="textarea textarea-bordered"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('enterYourQuestionHere')}
              rows={3}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label" htmlFor="explanation">
              <span className="label-text">{t('explanationOptional')}</span>
            </label>
            <textarea
              id="explanation"
              className="textarea textarea-bordered"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder={t('explainTheCorrectAnswer')}
              rows={2}
            />
          </div>

          <div className="card bg-base-100 border">
            <div className="card-body">
              <div className="flex flex-row items-center justify-between mb-4">
                <h4 className="card-title text-base">{t('answerOptions')}</h4>
                <button type="button" className="btn btn-outline btn-sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addOption')}
                </button>
              </div>
              <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="badge badge-secondary">{t('option')} {index + 1}</div>
                    <div className="flex-1" />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeOption(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <input
                    className="input input-bordered"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`${t('option')} ${index + 1} ${t('text')}`}
                    required
                  />
                  
                </div>
              ))}
              </div>
            </div>
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('saving') : question ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}