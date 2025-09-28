import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Hash, HelpCircle } from 'lucide-react'
import { database } from '../../lib/game/database'

function QuizDetail({ quiz, onBack }) {
  const [domains, setDomains] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    loadQuizData()
  }, [quiz])

  const loadQuizData = async () => {
    if (!quiz) return

    try {
      setLoading(true)
      
      // Fetch all questions for this quiz
      const questions = await database.getQuizQuestions(quiz.id)
      setTotalQuestions(questions.length)
      
      // Parse domains from quiz data
      let domainIds = []
      if (quiz.domains) {
        if (Array.isArray(quiz.domains)) {
          domainIds = quiz.domains
        } else if (typeof quiz.domains === 'string') {
          try {
            const parsed = JSON.parse(quiz.domains)
            domainIds = Array.isArray(parsed) ? parsed : []
          } catch {
            domainIds = quiz.domains.split(',').map(id => id.trim()).filter(id => id.length > 0)
          }
        }
      }

      // Fetch domain details and calculate question counts per domain
      const domainsWithCounts = await Promise.all(
        domainIds.map(async (domainId) => {
          // Get domain details
          const domain = await database.db.domains.where('id').equals(domainId).first()
          
          // Count questions for this domain
          const domainQuestions = questions.filter(q => q.domain_id === domainId)
          
          return {
            id: domainId,
            name: domain ? domain.name : `Domain ${domainId}`,
            questionCount: domainQuestions.length
          }
        })
      )
      
      setDomains(domainsWithCounts)
      
    } catch (error) {
      console.error('Error loading quiz data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-base-content mb-3">{quiz.name}</h1>
        {quiz.description && (
          <p className="text-lg text-base-content/70 mt-2">{quiz.description}</p>
        )}
      </div>

      {/* Domains Summary */}
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Hash className="w-6 h-6 text-secondary" />
              <h3 className="text-lg font-semibold">{t("Domains")}</h3>
            </div>
            <div className="badge badge-primary badge-lg">
              {totalQuestions} {t("questions")}
            </div>
          </div>
          
          {domains.length > 0 ? (
            <div className="space-y-2">
              {domains.map((domain, index) => (
                <div key={domain.id} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                  <span className="font-medium">{domain.name}</span>
                  <span className="text-sm text-base-content/70">{domain.questionCount} {t("questions")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-base-content/70">
              <Hash className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t("No domains configured for this quiz")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuizDetail