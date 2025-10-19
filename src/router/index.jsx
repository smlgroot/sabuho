import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import RootLayout from '@/layouts/RootLayout'

// Lazy load all pages for better code splitting
const HomePage = lazy(() => import('@/pages/HomePage'))
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const ConfirmEmailPage = lazy(() => import('@/pages/ConfirmEmailPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const OnlineGamePage = lazy(() => import('@/pages/OnlineGamePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="loading loading-spinner loading-lg"></div>
      <p className="text-base-content/70 mt-2">Loading...</p>
    </div>
  </div>
)

// Wrapper component to add Suspense to lazy loaded routes
const LazyPage = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <LazyPage>
            <HomePage />
          </LazyPage>
        ),
      },
      {
        path: 'auth',
        element: (
          <LazyPage>
            <AuthPage />
          </LazyPage>
        ),
      },
      {
        path: 'auth/confirm-email',
        element: (
          <LazyPage>
            <ConfirmEmailPage />
          </LazyPage>
        ),
      },
      {
        path: 'admin',
        element: (
          <LazyPage>
            <AdminPage />
          </LazyPage>
        ),
        children: [
          {
            index: true,
            element: null, // Will redirect to domains by default
          },
          {
            path: 'domains',
            element: null, // Handled by AdminPage
          },
          {
            path: 'quizzes',
            element: null, // Handled by AdminPage
          },
        ],
      },
      {
        path: 'online-game/:attemptId',
        element: (
          <LazyPage>
            <OnlineGamePage />
          </LazyPage>
        ),
      },
      {
        path: '*',
        element: (
          <LazyPage>
            <NotFoundPage />
          </LazyPage>
        ),
      },
    ],
  },
])
