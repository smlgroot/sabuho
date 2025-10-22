import { Outlet } from 'react-router-dom'
import { AuthProvider } from '@/lib/admin/auth'
import { ThemeProvider } from '@/components/ThemeProvider'
import { PostHogProvider } from '@/components/PostHogProvider'

export default function RootLayout() {
  return (
    <ThemeProvider>
      <PostHogProvider>
        <div
          className="min-h-screen bg-base-100 text-base-content font-sans antialiased subpixel-antialiased"
          style={{ fontFamily: 'var(--font-varela-round)' }}
        >
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </div>
      </PostHogProvider>
    </ThemeProvider>
  )
}
