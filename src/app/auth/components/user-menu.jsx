'use client'

import { useAuth } from '@/lib/admin/auth'
import { User, LogOut, Settings, HelpCircle, Keyboard, Moon } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()

  if (!user) return null

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Failed to sign out:', error)
        alert('Failed to sign out. Please try again.')
      }
    } catch (err) {
      console.error('Sign out error:', err)
      alert('Failed to sign out. Please try again.')
    }
  }

  const getUserInitials = (email) => {
    return email.substring(0, 2).toUpperCase()
  }

  const formatUserEmail = (email) => {
    if (email.length > 20) {
      return email.substring(0, 17) + '...'
    }
    return email
  }

  return (
    <div>
      <div className="dropdown dropdown-top dropdown-start w-full">
        <div tabIndex={0} role="button" className="btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16">
          <div className="avatar placeholder">
            <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-sm">{getUserInitials(user.email || 'U')}</span>
            </div>
          </div>
        </div>
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-56">
          <li className="menu-title">
            <span>My Account</span>
          </li>
          <li>
            <a>
              <Settings className="w-4 h-4" />
              Profile Settings
            </a>
          </li>
          <li>
            <a>
              <Keyboard className="w-4 h-4" />
              Keyboard Shortcuts
            </a>
          </li>
          <li>
            <a>
              <Moon className="w-4 h-4" />
              Theme Settings
            </a>
          </li>
          <li><hr></hr></li>
          <li>
            <a>
              <HelpCircle className="w-4 h-4" />
              Help & Support
            </a>
          </li>
          <li><hr></hr></li>
          <li>
            <a onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign out
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}