'use client'

import { Plus, FileText, Coins } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function QuizList({ quizzes, onCreateQuiz, onEditQuiz, onDeleteQuiz }) {
  const { t } = useTranslation()
  const { selectedQuiz, setSelectedQuiz, setSelectedDomain } = useStore()
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)

  // Load user credits
  const loadUserCredits = async () => {
    setIsLoadingCredits(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setUserCredits(credits?.credits || 0)
    } catch (error) {
      console.error('Failed to load user credits:', error)
      setUserCredits(0)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  useEffect(() => {
    loadUserCredits()
  }, [])

  return (
    <div className="space-y-4">
      {/* Credits Header */}
      <div className="card border">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t("Credits")}</h3>
            </div>
            <div className="text-right">
              {isLoadingCredits ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <div className="text-3xl font-bold text-primary">{userCredits}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Add Quiz Button */}
      <button
        className="btn btn-primary w-full"
        onClick={() => {
          setSelectedDomain(null)
          setSelectedQuiz(null)
          onCreateQuiz()
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("Add Quiz")}
      </button>
      
      {/* Quizzes List */}
      <div className="space-y-1 overflow-x-hidden">
        {quizzes.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p>No quizzes yet</p>
              <p className="text-sm opacity-70 mt-1">{t("Click the button above to create your first quiz")}</p>
            </div>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="w-full min-w-0">
              <div className="flex items-center group relative min-w-0">
                <button
                  className={`btn btn-ghost flex-1 justify-start text-left min-w-0 ${selectedQuiz?.id === quiz.id ? 'btn-active bg-primary/10 text-primary' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditQuiz(quiz);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="flex-1 truncate min-w-0">{quiz.name}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}