import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, Info, ChevronLeft, ChevronRight, Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as quizAttemptService from '../../services/quizAttemptService'
import * as supabaseService from '../../services/supabaseService'
import { supabase } from '../../lib/supabase'
import { quizLoadingService } from '../../services/quizLoadingService'

function OnlineQuizScreen() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [quizAttempt, setQuizAttempt] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [attemptQuestions, setAttemptQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const loadingRef = useRef(false)

  useEffect(() => {
    loadQuizAttemptData()
  }, [attemptId])

  useEffect(() => {
    setQuestionStartTime(Date.now())
  }, [currentQuestionIndex])

  // Sync selected answer when navigating between questions
  useEffect(() => {
    if (attemptQuestions.length > 0 && currentQuestionIndex < attemptQuestions.length) {
      const currentAttemptQuestion = attemptQuestions[currentQuestionIndex]
      if (currentAttemptQuestion.is_attempted) {
        // Question has been answered, show the answer
        setShowAnswers(true)
        // Load the selected answer index if available
        // NOTE: selected_answer_index is stored as ORIGINAL index, need to map to display index
        if (currentAttemptQuestion.selected_answer_index !== null && currentAttemptQuestion.selected_answer_index !== undefined) {
          const displayIndex = mapOriginalToDisplayIndex(currentAttemptQuestion.selected_answer_index)
          setSelectedAnswerIndex(displayIndex)
        }
      } else {
        setShowAnswers(false)
        setSelectedAnswerIndex(null)
      }
    }
  }, [currentQuestionIndex, attemptQuestions])

  const loadQuizAttemptData = async () => {
    if (loadingRef.current) {
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)

      // 1. Fetch quiz attempt questions with full question details
      const { data: questionsData, error: questionsError } = await quizAttemptService.fetchQuizAttemptQuestionsWithDetails(attemptId)

      if (questionsError) {
        console.error('Error loading quiz attempt questions:', questionsError)
        alert(t('Failed to load quiz. Please try again.'))
        navigate('/admin/quizzes')
        return
      }

      if (!questionsData || questionsData.length === 0) {
        console.error('No questions found for this quiz attempt')
        alert(t('No questions found for this quiz.'))
        navigate('/admin/quizzes')
        return
      }

      setAttemptQuestions(questionsData)

      // 2. Fetch quiz attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('id', attemptId)
        .single()

      if (attemptError) {
        console.error('Error loading quiz attempt:', attemptError)
      } else {
        setQuizAttempt(attemptData)

        // 3. Fetch quiz details
        const { data: quizData, error: quizError } = await supabaseService.fetchQuizById(attemptData.quiz_id)

        if (quizError) {
          console.error('Error loading quiz:', quizError)
        } else if (quizData && quizData.length > 0) {
          setQuiz(quizData[0])
        }
      }

    } catch (error) {
      console.error('Error loading quiz attempt data:', error)
      alert(t('An error occurred while loading the quiz.'))
      navigate('/admin/quizzes')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  const getCurrentAttemptQuestion = () => attemptQuestions[currentQuestionIndex]

  const getCurrentQuestion = () => {
    const attemptQuestion = getCurrentAttemptQuestion()
    return attemptQuestion?.questions
  }

  const getQuestionOptions = () => {
    const question = getCurrentQuestion()
    const attemptQuestion = getCurrentAttemptQuestion()
    const originalOptions = quizLoadingService.getQuestionOptions(question)

    // If we have a scrambled order, apply it
    if (attemptQuestion?.scrambled_order && Array.isArray(attemptQuestion.scrambled_order)) {
      const scrambledOrder = attemptQuestion.scrambled_order
      return scrambledOrder.map(originalIndex => originalOptions[originalIndex])
    }

    // Fallback to original order (for backwards compatibility)
    return originalOptions
  }

  const getCorrectAnswerIndex = () => {
    const question = getCurrentQuestion()
    const attemptQuestion = getCurrentAttemptQuestion()
    const originalCorrectIndex = quizLoadingService.getCorrectAnswerIndex(question)

    // If we have a scrambled order, find where the correct answer appears in scrambled display
    if (attemptQuestion?.scrambled_order && Array.isArray(attemptQuestion.scrambled_order)) {
      const scrambledOrder = attemptQuestion.scrambled_order
      // Find display position of the original correct answer
      return scrambledOrder.indexOf(originalCorrectIndex)
    }

    // Fallback to original index (for backwards compatibility)
    return originalCorrectIndex
  }

  // Map display index to original index
  const mapDisplayToOriginalIndex = (displayIndex) => {
    const attemptQuestion = getCurrentAttemptQuestion()
    if (attemptQuestion?.scrambled_order && Array.isArray(attemptQuestion.scrambled_order)) {
      return attemptQuestion.scrambled_order[displayIndex]
    }
    return displayIndex // Fallback for backwards compatibility
  }

  // Map original index to display index
  const mapOriginalToDisplayIndex = (originalIndex) => {
    const attemptQuestion = getCurrentAttemptQuestion()
    if (attemptQuestion?.scrambled_order && Array.isArray(attemptQuestion.scrambled_order)) {
      return attemptQuestion.scrambled_order.indexOf(originalIndex)
    }
    return originalIndex // Fallback for backwards compatibility
  }

  const handleAnswerSelect = (optionIndex) => {
    if (!showAnswers) {
      setSelectedAnswerIndex(optionIndex)
    }
  }

  const handleAnswer = async () => {
    if (selectedAnswerIndex !== null) {
      const attemptQuestion = getCurrentAttemptQuestion()
      const correctAnswerIndex = getCorrectAnswerIndex()
      const isCorrect = selectedAnswerIndex === correctAnswerIndex
      const responseTime = Date.now() - questionStartTime

      // Map the display index (what user clicked) to the original index (for storage)
      const originalIndex = mapDisplayToOriginalIndex(selectedAnswerIndex)

      try {
        // Update quiz attempt question in Supabase
        // IMPORTANT: We store the ORIGINAL index, not the display index
        // This allows us to verify correctness even if options are scrambled
        const { error } = await quizAttemptService.recordQuizAnswer(
          attemptQuestion.id,
          isCorrect,
          originalIndex,
          responseTime
        )

        if (error) {
          console.error('Error recording answer:', error)
          alert(t('Failed to save answer. Please try again.'))
          return
        }

        // Update local state
        const updatedAttemptQuestions = [...attemptQuestions]
        updatedAttemptQuestions[currentQuestionIndex] = {
          ...attemptQuestion,
          is_attempted: true,
          is_correct: isCorrect,
          selected_answer_index: originalIndex, // Store original index
          response_time_ms: responseTime
        }
        setAttemptQuestions(updatedAttemptQuestions)

        setShowAnswers(true)
      } catch (error) {
        console.error('Error submitting answer:', error)
        alert(t('An error occurred. Please try again.'))
      }
    }
  }

  const handleNext = async () => {
    if (currentQuestionIndex < attemptQuestions.length - 1) {
      const newIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(newIndex)
      setSelectedAnswerIndex(null)
      setShowAnswers(attemptQuestions[newIndex].is_attempted)
    } else {
      // Quiz complete
      handleQuizCompletion()
    }
  }

  const handleQuizCompletion = () => {
    // Navigate back to admin quizzes page
    navigate('/admin/quizzes')
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      setSelectedAnswerIndex(null)
      setShowAnswers(attemptQuestions[newIndex].is_attempted)
    }
  }

  const currentQuestion = useMemo(() => {
    return getCurrentQuestion()
  }, [attemptQuestions, currentQuestionIndex])

  const questionOptions = useMemo(() => {
    if (!currentQuestion || attemptQuestions.length === 0) {
      return []
    }
    return getQuestionOptions()
  }, [currentQuestion, attemptQuestions.length])

  const correctAnswerIndex = useMemo(() => {
    if (!currentQuestion || attemptQuestions.length === 0) {
      return -1
    }
    return getCorrectAnswerIndex()
  }, [currentQuestion, attemptQuestions.length])

  const answeredCount = attemptQuestions.filter(aq => aq.is_attempted).length
  const progress = attemptQuestions.length > 0 ? (answeredCount / attemptQuestions.length) * 100 : 0

  if (loading) {
    return (
      <div className="fixed inset-0 bg-base-100 z-50 flex justify-center items-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  const handleExitQuiz = () => {
    setShowExitModal(true)
  }

  const confirmExitQuiz = () => {
    setShowExitModal(false)
    navigate('/admin/quizzes')
  }

  const closeButton = (
    <button
      onClick={handleExitQuiz}
      className="btn btn-sm btn-circle btn-error btn-outline hover:btn-error hover:text-error-content transition-all duration-200"
      aria-label={t("Exit quiz and return to quizzes")}
      title={t("Exit Quiz")}
    >
      <X className="w-5 h-5" />
    </button>
  )

  return (
    <>
    <div className="fixed inset-0 bg-base-100 z-50 flex flex-col">
      {/* Header */}
      <div className="navbar bg-base-100 border-b border-base-300 px-4">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {quiz?.name || t('Quiz Challenge')}
            <span className="badge badge-primary badge-sm ml-2 px-3">{t('Online Mode')}</span>
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
                {t('Question')} {currentQuestionIndex + 1} {t('of')} {attemptQuestions.length}
              </span>
              <span className="text-sm text-base-content/70">
                {Math.round(progress)}% {t('Complete')}
              </span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={progress}
              max="100"
            ></progress>
          </div>

          {/* Question Card */}
          <div className="bg-base-200/30 border border-base-300 rounded-lg p-8 mb-6">
              <h2 className="text-2xl font-semibold mb-6 text-base-content">
                {currentQuestion?.body}
              </h2>

              <div className="space-y-3">
                {questionOptions.map((option, index) => {
                  const isSelected = selectedAnswerIndex === index
                  const isCorrect = index === correctAnswerIndex
                  const showBadge = showAnswers

                  let optionClass = 'btn btn-lg justify-start text-left h-auto min-h-16 py-4 px-6 transition-all duration-200 w-full'

                  if (isSelected && !showBadge) {
                    optionClass += ' btn-primary'
                  } else if (showBadge) {
                    if (isCorrect) {
                      optionClass += ' bg-green-50 text-green-800 border-green-200 hover:bg-green-50 hover:text-green-800 cursor-default'
                    } else if (isSelected && !isCorrect) {
                      optionClass += ' bg-red-50 text-red-800 border-red-200 hover:bg-red-50 hover:text-red-800 cursor-default'
                    } else {
                      optionClass += ' bg-base-200 text-base-content border-base-300 hover:bg-base-200 hover:text-base-content cursor-default'
                    }
                  } else {
                    optionClass += ' btn-outline hover:btn-primary'
                  }

                  const handleClick = showAnswers ? undefined : () => handleAnswerSelect(index)

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
                            <div className="bg-green-600 rounded-full p-1.5 ml-3 flex-shrink-0">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {showBadge && isSelected && !isCorrect && (
                            <div className="bg-red-600 rounded-full p-1.5 ml-3 flex-shrink-0">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Your choice indicator */}
                        {showBadge && isSelected && (
                          <div className="flex justify-start">
                            <div className={`badge badge-sm px-3 ${
                              isCorrect
                                ? 'badge-success'
                                : 'badge-error'
                            }`}>
                              {t('Your choice')}
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

      {/* Footer Navigation */}
      <div className="border-t border-base-300 bg-base-100 px-6 py-8 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="btn btn-ghost btn-md flex-shrink-0 min-w-24"
          >
            <ChevronLeft className="w-5 h-5" />
            {t('Previous')}
          </button>

          {/* Center Actions */}
          <div className="flex gap-3 flex-shrink-0">
            {showAnswers && currentQuestion?.explanation && (
              <button
                onClick={() => setShowInfoModal(true)}
                className="btn btn-info btn-md"
              >
                <Info className="w-5 h-5" />
                Info
              </button>
            )}


            {!showAnswers && (
              <button
                onClick={handleAnswer}
                disabled={selectedAnswerIndex === null}
                className="btn btn-primary btn-md"
              >
                {t('Submit Answer')}
              </button>
            )}
          </div>

          {/* Next Button */}
          {showAnswers ? (
            <button
              onClick={handleNext}
              className="btn btn-primary btn-md flex-shrink-0 min-w-24"
            >
              {currentQuestionIndex === attemptQuestions.length - 1 ? (
                <>
                  <Home className="w-5 h-5" />
                  {t('Finish')}
                </>
              ) : (
                <>
                  {t('Next')}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <div className="w-24 flex-shrink-0"></div>
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
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-base-100 z-10 pb-2">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Info className="w-6 h-6 text-info" />
              {t('Answer Review')}
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
              {questionOptions.map((option, index) => {
                const isSelected = selectedAnswerIndex === index
                const isCorrect = index === correctAnswerIndex

                // Only show if it's selected or correct
                if (!isSelected && !isCorrect) return null

                let optionClass = 'btn btn-lg justify-start text-left h-auto min-h-16 py-4 px-6 cursor-default w-full'

                if (isCorrect) {
                  optionClass += ' bg-green-50 text-green-800 border-green-200'
                } else if (isSelected && !isCorrect) {
                  optionClass += ' bg-red-50 text-red-800 border-red-200'
                }

                return (
                  <div key={index} className={optionClass}>
                    <div className="w-full">
                      {/* Main answer text */}
                      <div className="flex items-start justify-between mb-2">
                        <span className="flex-1 font-medium leading-relaxed">{option}</span>
                        {isCorrect && (
                          <div className="bg-green-600 rounded-full p-1.5 ml-3 flex-shrink-0">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {isSelected && !isCorrect && (
                          <div className="bg-red-600 rounded-full p-1.5 ml-3 flex-shrink-0">
                            <X className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Status badges */}
                      <div className="flex gap-2 justify-start">
                        {isCorrect && (
                          <div className="badge badge-success px-3">
                            {t('Correct Answer')}
                          </div>
                        )}
                        {isSelected && (
                          <div className={`badge px-3 ${
                            isCorrect
                              ? 'badge-success'
                              : 'badge-error'
                          }`}>
                            {t('Your Choice')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation Section */}
            {currentQuestion?.explanation && (
              <div className="bg-base-200/30 border border-base-300 rounded-lg p-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
                    <Info className="w-4 h-4 text-info" />
                  </div>
                  {t('Explanation')}
                </h4>
                <div className="prose max-w-none">
                  <p className="text-base-content leading-relaxed">{currentQuestion?.explanation}</p>
                </div>
              </div>
            )}
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
              {t('Are you sure you want to exit this quiz? Your progress has been saved.')}
            </p>

            <div className="alert alert-info">
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-medium">{t('Progress saved')}</h4>
                  <p className="text-sm opacity-80">{t("Your answers have been saved to the database.")}</p>
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
              className="btn btn-primary"
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

export default OnlineQuizScreen
