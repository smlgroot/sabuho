import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/lib/admin/auth'
import { ThemeProvider } from '@/components/ThemeProvider'
import { PlausibleProvider } from '@/components/PlausibleProvider'

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PlausibleProvider>
        <div
          className="min-h-screen bg-base-100 text-base-content font-sans antialiased subpixel-antialiased"
          style={{ fontFamily: 'var(--font-varela-round)' }}
        >
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </div>
      </PlausibleProvider>
    </ThemeProvider>
  )
}
