'use client'

import { useAuth } from '@/lib/auth'

export function Profile() {
  const { user, signOut } = useAuth()

  if (!user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="card max-w-2xl mx-auto bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Profile</h2>
          <p className="text-base-content/70">
            Manage your account information and settings
          </p>
          
          <div className="space-y-6">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text">Email</span>
              </label>
              <input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="input input-bordered bg-base-200"
              />
              <label className="label">
                <span className="label-text-alt">
                  Email cannot be changed. Contact support if you need to update your email.
                </span>
              </label>
            </div>
            
            <div className="form-control">
              <label className="label" htmlFor="user-id">
                <span className="label-text">User ID</span>
              </label>
              <input
                id="user-id"
                value={user.id}
                disabled
                className="input input-bordered bg-base-200 font-mono text-xs"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Account Created</span>
              </label>
              <input
                value={new Date(user.created_at).toLocaleString()}
                disabled
                className="input input-bordered bg-base-200"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Last Sign In</span>
              </label>
              <input
                value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
                disabled
                className="input input-bordered bg-base-200"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                className="btn btn-outline w-full"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}