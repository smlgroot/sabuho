import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import HomePage from '@/app/page'
import AdminPage from '@/app/admin/page'
import AuthPage from '@/app/auth/page'
import NotFoundPage from '@/app/not-found'

function App() {
  return (
    <div className="min-h-screen font-sans antialiased" style={{ fontFamily: 'var(--font-varela-round)' }}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </div>
  )
}

export default App