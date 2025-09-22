'use client'

import { useState } from 'react'
import { Login } from './login'
import { Signup } from './signup'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse w-full max-w-md">
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          {isLogin ? (
            <Login onToggleMode={() => setIsLogin(false)} />
          ) : (
            <Signup onToggleMode={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  )
}