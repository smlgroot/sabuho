'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/admin/auth'
import { useTranslation } from 'react-i18next'
import { usePlausible } from '@/components/PlausibleProvider'

export function Signup({ onToggleMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const { signUp } = useAuth()
  const { t } = useTranslation()
  const { trackEvent } = usePlausible()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    trackEvent('signup_attempt')

    if (password !== confirmPassword) {
      setError(t('Passwords do not match'))
      trackEvent('signup_failed', { props: { error_type: 'password_mismatch' } })
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters'))
      trackEvent('signup_failed', { props: { error_type: 'password_too_short' } })
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password)
    
    if (error) {
      setError(error.message)
      trackEvent('signup_failed', { props: { error_type: 'auth_error' } })
    } else {
      setMessage(t('Check your email for a confirmation link!'))
      trackEvent('signup_success')
    }
    
    setLoading(false)
  }

  return (
    <div className="card-body">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('Create Account')}</h2>
        <p className="py-4 text-base-content/70">
          {t('Join Sabuho')}
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
            placeholder={t('Create a password (min 6 chars)')}
            className="input input-bordered w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-control">
          <label className="label">
            <span className="label-text">{t('Confirm Password')}</span>
          </label>
          <input
            type="password"
            placeholder={t('Confirm your password')}
            className="input input-bordered w-full"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
        
        {message && (
          <div className="alert alert-success mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{message}</span>
          </div>
        )}
        
        <div className="form-control mt-6">
          <button className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                {t('Creating account...')}
              </>
            ) : (
              t('Sign Up')
            )}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm">
            {t('Already have an account?')}{' '}
            <button
              type="button"
              onClick={() => {
                trackEvent('login_link_clicked', { props: { source: 'signup_page' } })
                onToggleMode()
              }}
              className="link link-primary"
            >
              {t('Sign in')}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}