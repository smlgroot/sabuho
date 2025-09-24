'use client'

import { useAuth } from '@/lib/admin/auth'

export function UserMenu({ onProfileClick, profileSidebarOpen }) {
  const { user } = useAuth()

  if (!user) return null

  const getUserInitials = (email) => {
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <div>
      <button 
        onClick={onProfileClick}
        className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${
          profileSidebarOpen ? 'btn-active bg-primary/10 text-primary' : ''
        }`}
      >
        <div className="avatar placeholder">
          <div className="bg-primary text-primary-content rounded-full w-8 h-8 flex items-center justify-center">
            <span className="text-sm">{getUserInitials(user.email || 'U')}</span>
          </div>
        </div>
      </button>
    </div>
  )
}