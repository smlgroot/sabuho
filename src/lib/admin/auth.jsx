import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

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
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Redirect to admin after successful login
        if (event === 'SIGNED_IN' && session?.user && location.pathname === '/auth') {
          navigate('/admin')
        }
        
        // Redirect to auth page after logout
        if (event === 'SIGNED_OUT') {
          navigate('/auth')
        }
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
      console.log('Attempting to sign out...')
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.error('Sign out error:', error)
        return { error }
      }
      console.log('Sign out successful')
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