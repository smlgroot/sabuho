'use client'

import { useAuth } from '@/lib/admin/auth'
import { useNavigate, Navigate } from 'react-router-dom'
import { UserMenu } from './auth/components/user-menu'

export default function HomePage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold text-gray-800">Sabuho Admin</h1>
        <UserMenu />
      </header>
      
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Sabuho Admin</h2>
          <p className="text-gray-600 text-lg mb-8">Manage your learning domains, quizzes, and educational content all in one place.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/admin')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go to Admin Panel
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Browse Content
            </button>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">📚</div>
              <h3 className="font-semibold text-lg mb-2">Manage Domains</h3>
              <p className="text-gray-600 text-sm">Organize your learning content into structured domains and sub-domains.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-green-600 text-3xl mb-4">🧠</div>
              <h3 className="font-semibold text-lg mb-2">Create Quizzes</h3>
              <p className="text-gray-600 text-sm">Build engaging quizzes and assessments for your learning content.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-purple-600 text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-4">Track Progress</h3>
              <p className="text-gray-600 text-sm">Monitor learning progress and analyze performance metrics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
