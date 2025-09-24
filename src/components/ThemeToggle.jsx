import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeContext } from './ThemeProvider'

export function ThemeToggle({ size = 'sm', variant = 'ghost' }) {
  const { theme, toggleTheme, isDark } = useThemeContext()

  return (
    <label className={`swap swap-rotate btn btn-${size} btn-${variant}`}>
      <input 
        type="checkbox" 
        checked={isDark}
        onChange={toggleTheme}
        className="sr-only"
      />
      <Moon className={`swap-on ${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />
      <Sun className={`swap-off ${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />
    </label>
  )
}