'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/store/useStore'

export function DomainForm({ isOpen, onClose, domain, parentId, onSubmit }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (domain) {
      setName(domain.name)
      setDescription(domain.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [domain])

  useEffect(() => {
    if (!isOpen) {
      // Clear form when dialog closes
      setName('')
      setDescription('')
      setLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const domainData = {
        name,
        description: description || null,
        parent_id: parentId || null
      }

      await onSubmit(domainData)

      // Clear form fields after successful submission
      setName('')
      setDescription('')

      onClose()
    } catch (error) {
      console.error('Failed to save domain:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box relative max-w-md">
        <h3 className="font-bold text-lg mb-4">
          {domain ? t('Edit Domain') : t('Create New Domain')}
        </h3>
        <button 
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label" htmlFor="name">
              <span className="label-text">{t('name')}</span>
            </label>
            <input
              id="name"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Domain name')}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label" htmlFor="description">
              <span className="label-text">{t('description')}</span>
            </label>
            <textarea
              id="description"
              className="textarea textarea-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Optional description')}
              rows={3}
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('saving') : domain ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}