import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreVertical, FileText, XCircle, CheckCircle, X } from 'lucide-react'
import { database } from '../../lib/game/database'
import { quizClaimService } from '@/services/quizClaimService'
import useGameStore from '../../store/useGameStore'
import { useAuth } from '@/lib/admin/auth'

function Quizzes({ onQuizSelect, selectedQuiz }) {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [checkingClaimed, setCheckingClaimed] = useState(false)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const  isAuthenticated  = !!user
  const { t } = useTranslation()


  const loadQuizzes = async () => {
    try {
      setLoading(true)
      const savedQuizzes = await database.getQuizzes()
      setQuizzes(savedQuizzes)
    } catch (err) {
      console.error('Error loading quizzes:', err)
      setError(t('Failed to load quizzes'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuizzes()
  }, [])

  const handleClaimQuiz = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setClaiming(true)

    try {
      if (!code || code.trim().length < 4) {
        setError(t('Please enter a valid code'))
        return
      }
      
      const result = await quizClaimService.claimQuiz(code.trim())
      
      if (!result.success) {
        setError(result.error || t('Failed to claim quiz'))
        return
      }

      setCode('')
      setShowBottomSheet(false)
      await loadQuizzes()
      
    } catch (err) {
      console.error('Error claiming quiz:', err)
      setError(t('Failed to verify code'))
    } finally {
      setClaiming(false)
    }
  }

  const openBottomSheet = () => {
    setError('')
    setSuccessMessage('')
    setCode('')
    setShowBottomSheet(true)
  }

  const checkClaimedQuizzes = async () => {
    if (!isAuthenticated) {
      setError(t('Please log in to check for claimed quizzes'))
      setSuccessMessage('')
      return
    }

    setCheckingClaimed(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await quizClaimService.checkAndDownloadClaimedQuizzes()

      if (!result.success) {
        setError(result.error || t('Failed to check claimed quizzes'))
        return
      }

      if (result.downloadedCount > 0) {
        // Refresh the quiz list after downloading
        await loadQuizzes()
        setSuccessMessage(t('Successfully downloaded {{count}} claimed quiz{{plural}}!', {
          count: result.downloadedCount,
          plural: result.downloadedCount !== 1 ? 'zes' : '',
          word: result.downloadedCount === 1 ? t('quiz') : t('quizzes')
        }))
      } else {
        setSuccessMessage(t('No new claimed quizzes found to download'))
      }

    } catch (err) {
      console.error('Error checking claimed quizzes:', err)
      setError('Failed to check claimed quizzes')
    } finally {
      setCheckingClaimed(false)
    }
  }

  const checkForUpdates = async () => {
    setCheckingUpdates(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await quizClaimService.checkForUpdates()

      if (!result.success) {
        setError(result.error || t('Failed to check for updates'))
        return
      }

      setSuccessMessage(result.message)

    } catch (err) {
      console.error('Error checking for updates:', err)
      setError(t('Failed to check for updates'))
    } finally {
      setCheckingUpdates(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return t('Unknown')
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const AlertMessages = () => (
    <div className="space-y-3">
      {checkingClaimed && (
        <div role="alert" className="alert alert-info shadow-lg">
          <span className="loading loading-spinner loading-sm"></span>
          <span>{t('Checking for claimed quizzes...')}</span>
        </div>
      )}
      {checkingUpdates && (
        <div role="alert" className="alert alert-info shadow-lg">
          <span className="loading loading-spinner loading-sm"></span>
          <span>{t('Checking for updates...')}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="alert alert-error shadow-lg relative pr-12">
          <XCircle className="h-6 w-6 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            className="btn btn-xs btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => setError('')}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div role="alert" className="alert alert-success shadow-lg relative pr-12">
          <CheckCircle className="h-6 w-6 shrink-0" />
          <span className="flex-1">{successMessage}</span>
          <button
            className="btn btn-xs btn-circle btn-ghost absolute top-2 right-2"
            onClick={() => setSuccessMessage('')}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )

  const ActionButtons = ({ size = 'default', showUpdateButton = true }) => (
    size === 'default' ? (
      <div className="flex flex-col gap-3">
        <button
          className="btn btn-primary w-full"
          onClick={openBottomSheet}
        >
          {t('Add Quiz')}
        </button>

        {(isAuthenticated || showUpdateButton) && (
          <>
            <div className="divider text-xs opacity-50">{t('or')}</div>

            <div className="flex flex-col gap-2">
              {isAuthenticated && (
                <button
                  className={`btn btn-outline w-full ${checkingClaimed ? 'loading' : ''}`}
                  onClick={checkClaimedQuizzes}
                  disabled={checkingClaimed}
                >
                  {checkingClaimed ? t('Checking Claimed Quizzes...') : t('Check for Claimed Quizzes')}
                </button>
              )}
              {showUpdateButton && (
                <button
                  className={`btn btn-outline w-full ${checkingUpdates ? 'loading' : ''}`}
                  onClick={checkForUpdates}
                  disabled={checkingUpdates}
                >
                  {checkingUpdates ? t('Checking for Updates...') : t('Check for Updates')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    ) : (
      <div className="flex gap-2 items-center">
        <button
          className="btn btn-primary btn-sm"
          onClick={openBottomSheet}
        >
          {t('Add Quiz')}
        </button>

        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-outline btn-sm">
            <MoreVertical className="w-4 h-4" />
          </div>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
            {isAuthenticated && (
              <li>
                <button
                  className={checkingClaimed ? 'loading' : ''}
                  onClick={checkClaimedQuizzes}
                  disabled={checkingClaimed}
                >
                  {checkingClaimed ? t('Checking Claimed Quizzes...') : t('Check for Claimed Quizzes')}
                </button>
              </li>
            )}
            {showUpdateButton && (
              <li>
                <button
                  className={checkingUpdates ? 'loading' : ''}
                  onClick={checkForUpdates}
                  disabled={checkingUpdates}
                >
                  {checkingUpdates ? t('Checking for Updates...') : t('Check for Updates')}
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    )
  )

  const EmptyState = () => (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-base-content">
          {t('No quizzes yet')}<span className="text-primary">.</span>
        </h2>
        <p className="text-base-content/70">
          {t('Enter a quiz code to get started 🔑')}
        </p>
      </div>
      <ActionButtons showUpdateButton={false} />
    </div>
  )

  const QuizList = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ActionButtons size="compact" />
      </div>

      <div className="space-y-1 overflow-x-hidden">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="w-full min-w-0">
            <div className="flex items-center group relative min-w-0">
              <button
                className={`btn flex-1 justify-start pr-8 text-left min-w-0 ${selectedQuiz && selectedQuiz.id === quiz.id ? 'btn-active bg-primary/10 text-primary' : 'btn-ghost'}`}
                onClick={() => onQuizSelect ? onQuizSelect(quiz) : navigate(`/quiz/${quiz.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 truncate min-w-0">{quiz.name}</span>
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <AlertMessages />
        {quizzes.length === 0 ? <EmptyState /> : <QuizList />}
      </div>

      <dialog className={`modal ${showBottomSheet ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('Add Quiz')}</h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setShowBottomSheet(false)}
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleClaimQuiz} className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="quiz-code-modal">
                <span className="label-text font-semibold">{t('Quiz code')}</span>
              </label>
              <input
                type="text"
                id="quiz-code-modal"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('Enter your quiz code')}
                className="input input-bordered w-full tracking-widest"
                autoFocus={showBottomSheet}
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowBottomSheet(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={claiming}
                className={`btn btn-primary ${claiming ? 'loading' : ''}`}
              >
                {claiming ? t('Adding Quiz') : t('Add Quiz')}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setShowBottomSheet(false)}>close</button>
        </form>
      </dialog>
    </div>
  )
}

export default Quizzes