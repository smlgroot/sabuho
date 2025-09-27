import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/admin/auth'
import { ThemeProvider } from './components/ThemeProvider'
import HomePage from '@/app/page'
import AdminPage from '@/app/admin/page'
import AuthPage from '@/app/auth/page'
import NotFoundPage from '@/app/not-found'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-base-100 text-base-content font-sans antialiased subpixel-antialiased" style={{ fontFamily: 'var(--font-varela-round)' }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </div>
    </ThemeProvider>
  )
}

export default App