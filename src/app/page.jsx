'use client'

import { useAuth } from '@/lib/admin/auth'
import { useNavigate } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [language, setLanguage] = useState('en')
  const { t } = useTranslation()

  const handleMainButton = () => {
    if (user) {
      navigate('/admin')
    } else {
      navigate('/auth')
    }
  }

  const handleHeaderButton = async () => {
    if (user) {
      await signOut()
      navigate('/')
    } else {
      navigate('/auth')
    }
  }

  const changeLanguage = (lng) => {
    setLanguage(lng)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/70 mt-2">{t("Loading...")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <h1 className="btn btn-ghost normal-case text-xl font-black">
{t("Sabuho Admin")}<span className="text-primary">.</span>
          </h1>
        </div>
        <div className="flex-none">
          <div className="flex gap-2">
            {/* Language Selector */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                <Globe className="w-4 h-4" />
                {language === 'es' ? 'ES' : 'EN'}
              </div>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                <li>
                  <button 
                    onClick={() => changeLanguage('en')}
                    className={language === 'en' ? 'active' : ''}
                  >
                    🇺🇸 English
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => changeLanguage('es')}
                    className={language === 'es' ? 'active' : ''}
                  >
                    🇪🇸 Spanish
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Theme Switch */}
            <ThemeToggle />

            <button 
              onClick={handleHeaderButton}
              className="btn btn-primary"
            >
{user ? t("Logout") : t("Sign In")}
            </button>
          </div>
        </div>
      </header>
      
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-4xl w-full">
          <div className="hero-content text-center">
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black mb-6 text-base-content leading-tight">
                Welcome{user ? `, ${user.email}` : ""}
                <span className="text-primary">.</span>
              </h1>

              <p className="text-lg sm:text-xl lg:text-2xl text-base-content/70 mb-12 font-light max-w-2xl mx-auto">
{t("Manage your learning domains, quizzes, and educational content all in one place.")}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
                <button
                  onClick={handleMainButton}
                  className="btn btn-primary btn-lg text-lg px-8 py-4 min-w-48 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
{user ? t("Go to Admin Panel") : t("Login")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
