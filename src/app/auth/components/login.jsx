'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/admin/auth'
import { useTranslation } from 'react-i18next'

export function Login({ onToggleMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)
    
    if (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  return (
    <div className="card-body">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('Welcome Back')}</h2>
        <p className="py-4 text-base-content/70">
          {t('Sign in to access Quiz Quest Admin')}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('Email')}</span>
          </label>
          <input
            type="email"
            placeholder={t('email@example.com')}
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('Password')}</span>
          </label>
          <input
            type="password"
            placeholder={t('Enter your password')}
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && (
          <div className="alert alert-error mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <div className="form-control mt-6">
          <button className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                {t('Signing in...')}
              </>
            ) : (
              t('Sign In')
            )}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm">
            {t("Don't have an account?")}{' '}
            <button
              type="button"
              onClick={onToggleMode}
              className="link link-primary"
            >
              {t('Sign up')}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}