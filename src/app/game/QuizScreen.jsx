import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, X, Info, ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { quizLoadingService } from '../../services/quizLoadingService'
import { database } from '../../lib/game/database'

function QuizScreen({ 
  quizId: propQuizId, 
  levelId: propLevelId, 
  readonly: propReadonly = false, 
  onClose, 
  isModal = false 
}) {
  // Use props if provided (modal mode), otherwise use URL params (route mode)
  const { quizId: paramQuizId, levelId: paramLevelId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  
  const quizId = propQuizId || paramQuizId
  const levelId = propLevelId || paramLevelId
  
  const [quiz, setQuiz] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [quizSession, setQuizSession] = useState(null)
  const loadingRef = useRef(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [isReadonly, setIsReadonly] = useState(false)

  useEffect(() => {
    // Check if readonly mode is enabled via URL params or props
    const readonlyParam = searchParams?.get('readonly')
    const isReadonlyMode = propReadonly || readonlyParam === 'true'
    
    setIsReadonly(isReadonlyMode)
    
    loadQuizData(isReadonlyMode)
  }, [quizId, levelId, searchParams, propReadonly])

  // Additional effect to handle readonly mode after questions load
  useEffect(() => {
    if (isReadonly && questions.length > 0) {
      const savedAnswer = answers[currentQuestionIndex]
      if (savedAnswer !== undefined) {
        setSelectedAnswerIndex(savedAnswer)
      }
      setShowAnswers(true)
    }
  }, [isReadonly, questions, currentQuestionIndex, answers])

  useEffect(() => {
    setQuestionStartTime(Date.now())
  }, [currentQuestionIndex])

  const loadQuizData = async (isReadonlyMode = false) => {
    if (loadingRef.current) {
      return
    }
    
    try {
      loadingRef.current = true
      setLoading(true)
      
      // Load level information if levelId is provided
      let level = null
      let levelType = 'normal'
      
      if (levelId) {
        // Get level details from database
        const levels = await database.getQuizLevels(quizId)
        level = levels.find(l => l.id === levelId)
        if (level) {
          setCurrentLevel(level)
          levelType = level.type || 'normal'
        }
      }
      
      // Use quiz loading service to load quiz data
      const userId = 'default_user' // In a real app, get this from auth context
      
      
      const result = await quizLoadingService.loadQuizData(quizId, userId, levelType, levelId)
      
      // In readonly mode, load existing session data BEFORE setting other state
      let initialAnswers = {}
      let initialSelectedAnswer = null
      
      if (isReadonlyMode) {
        try {
          if (result.sessionId) {
            const sessionData = await quizLoadingService.loadQuizSessionData(result.sessionId, result.questions)
            
            if (sessionData.answers && Object.keys(sessionData.answers).length > 0) {
              initialAnswers = sessionData.answers
              initialSelectedAnswer = sessionData.answers[0]
            }
          }
        } catch (error) {
          console.warn('Could not load existing session data for readonly mode:', error)
        }
      }

      
      setQuiz(result.quiz)
      setQuestions(result.questions)
      setAnswers(initialAnswers)
      if (initialSelectedAnswer !== null && initialSelectedAnswer !== undefined) {
        setSelectedAnswerIndex(initialSelectedAnswer)
      }
      if (isReadonlyMode) {
        setShowAnswers(true)
      }
      
      // Set quiz session
      setQuizSession({
        id: result.sessionId,
        quiz_id: quizId,
        level_id: levelId,
        start_time: new Date().toISOString(),
        state: 'in_progress'
      })
      
    } catch (error) {
      console.error('Error loading quiz data:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  const getCurrentQuestion = () => questions[currentQuestionIndex]
  
  const getQuestionOptions = () => {
    const question = getCurrentQuestion()
    return quizLoadingService.getQuestionOptions(question)
  }

  const getCorrectAnswerIndex = () => {
    const question = getCurrentQuestion()
    return quizLoadingService.getCorrectAnswerIndex(question)
  }

  const handleAnswerSelect = (optionIndex) => {
    if (!showAnswers && !isReadonly) {
      setSelectedAnswerIndex(optionIndex)
    }
  }

  const handleAnswer = async () => {
    if (selectedAnswerIndex !== null && !isReadonly) {
      const currentQuestion = getCurrentQuestion()
      const correctAnswerIndex = getCorrectAnswerIndex()
      const isCorrect = selectedAnswerIndex === correctAnswerIndex

      // Update local answers state
      setAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: selectedAnswerIndex
      }))
      
      // Create question attempt in database
      if (quizSession && currentQuestion) {
        try {
          await database.createQuestionAttempt(
            quizSession.id,
            quizId,
            currentQuestion.id,
            selectedAnswerIndex,
            isCorrect
          )
        } catch (error) {
          console.error('Error creating question attempt:', error)
        }
      }
      
      setShowAnswers(true)
    }
  }

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(newIndex)
      const nextAnswer = answers[newIndex]
      setSelectedAnswerIndex(nextAnswer !== undefined ? nextAnswer : null)
      // In readonly mode, always show answers; otherwise show if answered
      if (isReadonly) {
        setShowAnswers(true)
      } else {
        setShowAnswers(!!answers[newIndex])
      }
    } else {
      // Quiz complete - handle level completion
      await handleQuizCompletion()
    }
  }

  const handleQuizCompletion = async () => {
    try {
      // Only mark level as completed if not in readonly mode
      if (levelId && currentLevel && !isReadonly) {
        await database.completeLevelAndUnlockNext(levelId, quizId)
      }
      
      // Handle closing based on modal vs route mode
      if (isModal && onClose) {
        onClose()
      } else {
        navigate('/learning-hub/path')
      }
      
    } catch (error) {
      console.error('Error completing quiz:', error)
      // Still close/navigate back even if there's an error
      if (isModal && onClose) {
        onClose()
      } else {
        navigate('/learning-hub/path')
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      const prevAnswer = answers[newIndex]
      setSelectedAnswerIndex(prevAnswer !== undefined ? prevAnswer : null)
      // In readonly mode, always show answers; otherwise show if answered
      if (isReadonly) {
        setShowAnswers(true)
      } else {
        setShowAnswers(prevAnswer !== undefined)
      }
    }
  }

  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex]
  }, [questions, currentQuestionIndex])
  
  const questionOptions = useMemo(() => {
    if (!currentQuestion || questions.length === 0) {
      return []
    }
    return quizLoadingService.getQuestionOptions(currentQuestion)
  }, [currentQuestion, questions.length])

  const correctAnswerIndex = useMemo(() => {
    if (!currentQuestion || questions.length === 0) {
      return -1
    }
    return quizLoadingService.getCorrectAnswerIndex(currentQuestion)
  }, [currentQuestion, questions.length])

  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  if (loading) {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 flex justify-center items-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const handleExitQuiz = () => {
    if (isReadonly) {
      if (isModal && onClose) {
        onClose()
      } else {
        navigate('/learning-hub')
      }
    } else {
      setShowExitModal(true)
    }
  }

  const confirmExitQuiz = () => {
    setShowExitModal(false)
    if (isModal && onClose) {
      onClose()
    } else {
      navigate('/learning-hub')
    }
  }

  const closeButton = (
    <button
      onClick={handleExitQuiz}
      className="btn btn-sm btn-circle btn-error btn-outline hover:btn-error hover:text-error-content transition-all duration-200 shadow-md"
      aria-label="Exit quiz and return to learning hub"
      title="Exit Quiz"
    >
      <X className="w-5 h-5" />
    </button>
  )

  const wrapperClass = isModal 
    ? "fixed inset-0 bg-base-100 z-50 flex flex-col" 
    : "fixed inset-0 bg-base-100 z-50 flex flex-col"

  return (
    <>
    <div className={wrapperClass}>
      {/* Header */}
      <div className="navbar bg-base-100 border-b border-base-300 px-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {currentLevel ? `${quiz?.name || t('Quiz')} - ${currentLevel.name}` : quiz?.name || t('Quiz')}
            {isReadonly && <span className="badge badge-info badge-sm ml-2">{t('Review Mode')}</span>}
          </h1>
        </div>
        <div className="flex-none">
          {closeButton}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Progress Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-base-content">
                {t('Question')} {currentQuestionIndex + 1} {t('of')} {questions.length}
              </span>
              <span className="text-sm text-base-content/70">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <progress 
              className="progress progress-primary w-full" 
              value={progress} 
              max="100"
            ></progress>
          </div>

          {/* Question Card */}
          <div className="card bg-base-100 shadow-lg mb-6">
            <div className="card-body">
              <h2 className="card-title text-xl font-semibold mb-6 text-base-content">
                {currentQuestion?.body}
              </h2>
              
              <div className="space-y-3">
                {questionOptions.map((option, index) => {
                  const isSelected = selectedAnswerIndex === index
                  const isCorrect = index === correctAnswerIndex
                  const showBadge = showAnswers || isReadonly

                  let optionClass = 'btn btn-lg justify-start text-left h-auto min-h-16 py-4 px-6 transition-all duration-200 w-full'
                  
                  if (isSelected && !showBadge) {
                    optionClass += ' btn-primary'
                  } else if (showBadge) {
                    if (isCorrect) {
                      optionClass += ' bg-success text-success-content border-success hover:bg-success hover:text-success-content cursor-default'
                    } else if (isSelected && !isCorrect) {
                      optionClass += ' bg-error text-error-content border-error hover:bg-error hover:text-error-content cursor-default'
                    } else {
                      optionClass += ' bg-base-200 text-base-content border-base-300 hover:bg-base-200 hover:text-base-content cursor-default'
                    }
                  } else {
                    optionClass += ' btn-outline hover:btn-primary'
                  }

                  const handleClick = (showAnswers || isReadonly) ? undefined : () => handleAnswerSelect(index)

                  return (
                    <button
                      key={index}
                      onClick={handleClick}
                      className={optionClass}
                    >
                      <div className="w-full">
                        {/* Main answer text */}
                        <div className="flex items-start justify-between mb-2">
                          <span className="flex-1 font-medium leading-relaxed">{option}</span>
                          {showBadge && isCorrect && (
                            <div className="bg-success-content rounded-full p-1 ml-3 flex-shrink-0">
                              <Check className="w-4 h-4 text-success" />
                            </div>
                          )}
                          {showBadge && isSelected && !isCorrect && (
                            <div className="bg-error-content rounded-full p-1 ml-3 flex-shrink-0">
                              <X className="w-4 h-4 text-error" />
                            </div>
                          )}
                        </div>
                        
                        {/* Your choice indicator */}
                        {showBadge && isSelected && (
                          <div className="flex justify-start">
                            <div className={`badge badge-sm font-semibold ${
                              isCorrect 
                                ? 'bg-success-content text-success border-success-content' 
                                : 'bg-error-content text-error border-error-content'
                            }`}>
                              Your choice
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-base-300 bg-base-100 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="btn btn-ghost btn-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('Previous')}
          </button>

          {/* Center Actions */}
          <div className="flex gap-2">
            {(showAnswers || isReadonly) && currentQuestion?.explanation && (
              <button
                onClick={() => setShowInfoModal(true)}
                className="btn btn-info btn-sm"
              >
                <Info className="w-4 h-4" />
                Info
              </button>
            )}
            
            
            {!showAnswers && !isReadonly && (
              <button
                onClick={handleAnswer}
                disabled={selectedAnswerIndex === null}
                className="btn btn-primary btn-sm"
              >
                {t('Submit Answer')}
              </button>
            )}
          </div>

          {/* Next Button */}
          {(showAnswers || isReadonly) ? (
            <button
              onClick={handleNext}
              className="btn btn-primary btn-sm"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  <Home className="w-4 h-4" />
                  {t('Finish')}
                </>
              ) : (
                <>
                  {t('Next')}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <div className="w-20"></div>
          )}
        </div>
      </div>
    </div>

      {/* Explanation Modal */}
      <input 
        type="checkbox" 
        id="explanation-modal" 
        className="modal-toggle" 
        checked={showInfoModal}
        onChange={() => setShowInfoModal(!showInfoModal)}
      />
      <div className="modal modal-bottom sm:modal-middle">
        <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-base-100 z-10 pb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Info className="w-6 h-6 text-info" />
              {t('Explanation')}
            </h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setShowInfoModal(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Answer Options Review - Only show selected and correct */}
            <div className="space-y-3">
              <h4 className="text-lg font-medium">{t('Answer Review')}</h4>
              {questionOptions.map((option, index) => {
                const isSelected = selectedAnswerIndex === index
                const isCorrect = index === correctAnswerIndex
                
                // Only show if it's selected or correct
                if (!isSelected && !isCorrect) return null
                
                let optionClass = 'btn btn-lg justify-start text-left h-auto min-h-16 py-4 px-6 cursor-default w-full'
                
                if (isCorrect) {
                  optionClass += ' bg-success text-success-content border-success'
                } else if (isSelected && !isCorrect) {
                  optionClass += ' bg-error text-error-content border-error'
                }

                return (
                  <div key={index} className={optionClass}>
                    <div className="w-full">
                      {/* Main answer text */}
                      <div className="flex items-start justify-between mb-2">
                        <span className="flex-1 font-medium leading-relaxed">{option}</span>
                        {isCorrect && (
                          <div className="bg-success-content rounded-full p-1 ml-3 flex-shrink-0">
                            <Check className="w-4 h-4 text-success" />
                          </div>
                        )}
                        {isSelected && !isCorrect && (
                          <div className="bg-error-content rounded-full p-1 ml-3 flex-shrink-0">
                            <X className="w-4 h-4 text-error" />
                          </div>
                        )}
                      </div>
                      
                      {/* Status badges */}
                      <div className="flex gap-2 justify-start">
                        {isCorrect && (
                          <div className="badge bg-success-content text-success border-success-content font-semibold">
                            Correct Answer
                          </div>
                        )}
                        {isSelected && (
                          <div className={`badge font-semibold ${
                            isCorrect 
                              ? 'bg-success-content text-success border-success-content' 
                              : 'bg-error-content text-error border-error-content'
                          }`}>
                            Your Choice
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation Section */}
            <div className="card bg-base-100 border border-base-300 shadow-sm">
              <div className="card-body">
                <h4 className="card-title text-lg mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
                    <Info className="w-4 h-4 text-info" />
                  </div>
                  {t('Explanation')}
                </h4>
                <div className="prose max-w-none">
                  <p className="text-base-content leading-relaxed">{currentQuestion?.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <label 
          className="modal-backdrop" 
          htmlFor="explanation-modal"
          onClick={() => setShowInfoModal(false)}
        >
        </label>
      </div>

      {/* Exit Confirmation Modal */}
      <input 
        type="checkbox" 
        id="exit-modal" 
        className="modal-toggle" 
        checked={showExitModal}
        onChange={() => setShowExitModal(!showExitModal)}
      />
      <div className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t('Exit Quiz?')}</h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost"
              onClick={() => setShowExitModal(false)}
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <p className="text-base-content mb-4">
              {t('Are you sure you want to exit this quiz? Your progress will be lost.')}
            </p>
            
            <div className="alert alert-warning">
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.876c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L4.044 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="font-medium">Progress will be lost</h4>
                  <p className="text-sm opacity-80">You'll need to restart the quiz from the beginning if you continue.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setShowExitModal(false)}
            >
              {t('Cancel')}
            </button>
            <button
              className="btn btn-error"
              onClick={confirmExitQuiz}
            >
              {t('Exit Quiz')}
            </button>
          </div>
        </div>
        <label 
          className="modal-backdrop" 
          htmlFor="exit-modal"
          onClick={() => setShowExitModal(false)}
        >
        </label>
      </div>
    </>
  )
}

export default QuizScreen