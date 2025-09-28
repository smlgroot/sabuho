'use client'

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Mail, Loader } from 'lucide-react'

export function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading') // 'loading', 'success', 'error', 'expired'
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!token_hash || type !== 'email') {
        setStatus('error')
        setMessage('Invalid confirmation link. Please check your email for the correct link.')
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        })

        if (error) {
          console.error('Email confirmation error:', error)
          if (error.message.includes('expired')) {
            setStatus('expired')
            setMessage('This confirmation link has expired. Please sign up again to receive a new confirmation email.')
          } else {
            setStatus('error')
            setMessage(error.message || 'Failed to confirm email. Please try again.')
          }
        } else {
          setStatus('success')
          setMessage('Your email has been confirmed successfully! You can now sign in.')
        }
      } catch (err) {
        console.error('Confirmation exception:', err)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    confirmEmail()
  }, [searchParams])

  const handleBackToLogin = () => {
    navigate('/auth')
  }

  const handleResendConfirmation = () => {
    navigate('/auth')
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader className="w-16 h-16 text-primary animate-spin" />
      case 'success':
        return <CheckCircle className="w-16 h-16 text-success" />
      case 'error':
      case 'expired':
        return <XCircle className="w-16 h-16 text-error" />
      default:
        return <Mail className="w-16 h-16 text-base-content/50" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return 'Confirming Your Email...'
      case 'success':
        return 'Email Confirmed!'
      case 'expired':
        return 'Link Expired'
      case 'error':
        return 'Confirmation Failed'
      default:
        return 'Email Confirmation'
    }
  }

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col w-full max-w-md">
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body text-center">
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>
            
            <h1 className="text-2xl font-bold text-base-content mb-4">
              {getStatusTitle()}
            </h1>
            
            <p className="text-base-content/70 mb-6">
              {message}
            </p>

            <div className="card-actions justify-center">
              {status === 'success' && (
                <button 
                  onClick={handleBackToLogin}
                  className="btn btn-primary btn-wide"
                >
                  Sign In Now
                </button>
              )}
              
              {(status === 'error' || status === 'expired') && (
                <div className="flex flex-col gap-2 w-full">
                  {status === 'expired' && (
                    <button 
                      onClick={handleResendConfirmation}
                      className="btn btn-primary btn-wide"
                    >
                      Sign Up Again
                    </button>
                  )}
                  <button 
                    onClick={handleBackToLogin}
                    className="btn btn-outline btn-wide"
                  >
                    Back to Login
                  </button>
                </div>
              )}
              
              {status === 'loading' && (
                <button className="btn btn-outline btn-wide" disabled>
                  Please wait...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}