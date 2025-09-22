import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { database } from '../../lib/game/database'
import { quizClaimService } from '@/services/quizClaimService'
import useGameStore from '../../store/useGameStore'
import { useAuth } from '@/lib/admin/auth'

function Quizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [checkingClaimed, setCheckingClaimed] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const  isAuthenticated  = !!user

  console.log('user', user)
  console.log('isAuthenticated', isAuthenticated)

  const loadQuizzes = async () => {
    try {
      setLoading(true)
      const savedQuizzes = await database.getQuizzes()
      setQuizzes(savedQuizzes)
    } catch (err) {
      console.error('Error loading quizzes:', err)
      setError('Failed to load quizzes')
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
        setError('Please enter a valid code')
        return
      }
      
      const result = await quizClaimService.claimQuiz(code.trim())
      
      if (!result.success) {
        setError(result.error || 'Failed to claim quiz')
        return
      }

      setCode('')
      setShowBottomSheet(false)
      await loadQuizzes()
      
    } catch (err) {
      console.error('Error claiming quiz:', err)
      setError('Failed to verify code')
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
      setError('Please log in to check for claimed quizzes')
      setSuccessMessage('')
      return
    }

    setCheckingClaimed(true)
    setError('')
    setSuccessMessage('')

    try {
      const result = await quizClaimService.checkAndDownloadClaimedQuizzes()
      
      if (!result.success) {
        setError(result.error || 'Failed to check claimed quizzes')
        return
      }

      if (result.downloadedCount > 0) {
        // Refresh the quiz list after downloading
        await loadQuizzes()
        setSuccessMessage(`Successfully downloaded ${result.downloadedCount} claimed quiz${result.downloadedCount !== 1 ? 'es' : ''}!`)
      } else {
        setSuccessMessage('No new claimed quizzes found to download')
      }
      
    } catch (err) {
      console.error('Error checking claimed quizzes:', err)
      setError('Failed to check claimed quizzes')
    } finally {
      setCheckingClaimed(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
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
    <>
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success mb-6">
          <span>{successMessage}</span>
        </div>
      )}
    </>
  )

  const ActionButtons = ({ size = 'default' }) => (
    <div className={`flex gap-2 ${size === 'default' ? 'flex-col space-y-3' : ''}`}>
      <button 
        className={`btn btn-primary ${size === 'default' ? 'w-full' : 'btn-sm'}`}
        onClick={openBottomSheet}
      >
        Add Quiz
      </button>
      {isAuthenticated && (
        <button 
          className={`btn btn-outline ${size === 'default' ? 'w-full' : 'btn-sm'} ${checkingClaimed ? 'loading' : ''}`}
          onClick={checkClaimedQuizzes}
          disabled={checkingClaimed}
        >
          {checkingClaimed 
            ? (size === 'default' ? 'Checking Claimed Quizzes...' : 'Checking...') 
            : (size === 'default' ? 'Check for Claimed Quizzes' : 'Check Claimed')
          }
        </button>
      )}
    </div>
  )

  const EmptyState = () => (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-base-content">
          No quizzes yet<span className="text-primary">.</span>
        </h2>
        <p className="text-base-content/70">
          Enter a quiz code to get started 🔑
        </p>
      </div>
      <ActionButtons />
    </div>
  )

  const QuizList = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ActionButtons size="compact" />
      </div>

      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div 
            key={quiz.id} 
            className="card bg-base-100 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer" 
            onClick={() => navigate(`/quiz/${quiz.id}`)}
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="card-title text-lg mb-1">
                    {quiz.name}
                  </h3>
                  <p className="text-sm text-base-content/70">
                    Created: {formatDate(quiz.created_at)}
                  </p>
                  {quiz.is_published && (
                    <div className="badge badge-success badge-sm mt-2">Published</div>
                  )}
                </div>
                <div className="opacity-50 hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <AlertMessages />
        {quizzes.length === 0 ? <EmptyState /> : <QuizList />}
      </div>

      <dialog className={`modal ${showBottomSheet ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Add Quiz</h3>
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
                <span className="label-text font-semibold">Quiz code</span>
              </label>
              <input
                type="text"
                id="quiz-code-modal"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your quiz code"
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
                {claiming ? 'Adding Quiz' : 'Add Quiz'}
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