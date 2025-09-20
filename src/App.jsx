import React from 'react'
import { AuthProvider } from '@/lib/auth'
import HomePage from '@/app/page'
import AdminPage from '@/app/admin/page'

function App() {
  // Simple routing based on URL path
  const currentPath = window.location.pathname

  let Component
  if (currentPath === '/admin') {
    Component = AdminPage
  } else {
    Component = HomePage
  }

  return (
    <div className="min-h-screen font-sans antialiased" style={{ fontFamily: 'var(--font-varela-round)' }}>
      <AuthProvider>
        <Component />
      </AuthProvider>
    </div>
  )
}

export default App