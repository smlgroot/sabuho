import { useState, useEffect } from 'react'

const THEME_KEY = 'sabuho-theme'
const VALID_THEMES = ['light', 'dark']

export function useTheme() {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    
    const stored = window.localStorage?.getItem(THEME_KEY)
    if (stored && VALID_THEMES.includes(stored)) {
      return stored
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const setTheme = (newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return
    
    setThemeState(newTheme)
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(THEME_KEY, newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
      
      // Also set class for CSS custom properties
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e) => {
      // Only update if user hasn't manually set a theme
      const stored = window.localStorage?.getItem(THEME_KEY)
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  }
}