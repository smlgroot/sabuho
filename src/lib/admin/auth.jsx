import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import { upsertUserProfile } from '@/services/userProfileService'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Update user profile for existing sessions (non-blocking)
      if (session?.user) {
        // Make user profile update non-blocking to avoid interfering with auth flow
        setTimeout(async () => {
          try {
            await upsertUserProfile(session.user.id)
          } catch (error) {
            console.error('Failed to update user profile on session load:', error)
          }
        }, 0)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Update user profile on sign in (non-blocking)
        if (event === 'SIGNED_IN' && session?.user) {
          // Make user profile update non-blocking to avoid interfering with auth flow
          setTimeout(async () => {
            try {
              await upsertUserProfile(session.user.id)
            } catch (error) {
              console.error('Failed to update user profile on sign in:', error)
            }
          }, 0)
          
          // Redirect to admin after successful login
          if (location.pathname === '/auth') {
            navigate('/admin')
          }
        }
        
        // Don't redirect automatically after logout - let the component handle it
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate, location.pathname])

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Sign out error:', error)
        return { error }
      }
      return { error: null }
    } catch (err) {
      console.error('Sign out exception:', err)
      return { error: err }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}