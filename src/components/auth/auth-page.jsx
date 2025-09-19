'use client'

import { useState } from 'react'
import { Login } from './login'
import { Signup } from './signup'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {isLogin ? (
        <Login onToggleMode={() => setIsLogin(false)} />
      ) : (
        <Signup onToggleMode={() => setIsLogin(true)} />
      )}
    </div>
  )
}