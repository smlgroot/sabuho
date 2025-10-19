import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import * as supabaseService from '@/services/supabaseService'
import { upsertUserProfile, getUserProfile } from '@/services/userProfileService'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const loadUserProfile = async (userId) => {
    try {
      await upsertUserProfile(userId)
      const { data: profile } = await getUserProfile(userId)
      setUserProfile(profile)
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { session } = await supabaseService.getCurrentSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Update user profile for existing sessions (non-blocking)
      if (session?.user) {
        // Make user profile update non-blocking to avoid interfering with auth flow
        setTimeout(() => loadUserProfile(session.user.id), 0)
      }
    }

    getSession()

    const { data: { subscription } } = supabaseService.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Update user profile on sign in (non-blocking)
        if (event === 'SIGNED_IN' && session?.user) {
          // Make user profile update non-blocking to avoid interfering with auth flow
          setTimeout(() => loadUserProfile(session.user.id), 0)

          // Redirect to admin after successful login
          if (location.pathname === '/auth') {
            navigate('/admin')
          }
        }

        // Clear user profile on sign out
        if (event === 'SIGNED_OUT') {
          setUserProfile(null)
        }

        // Don't redirect automatically after logout - let the component handle it
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signUp = async (email, password) => {
    const { error } = await supabaseService.signUp(email, password)
    return { error }
  }

  const signIn = async (email, password) => {
    const { error } = await supabaseService.signIn(email, password)
    return { error }
  }

  const signOut = async () => {
    try {
      const { error } = await supabaseService.signOut('local')
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
    userProfile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    loadUserProfile,
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