import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Quiz Attempt View Component
 * Displays questions for quiz attempts with answer selection and tracking
 * Similar to OnlineGamePage but optimized for HomePage context with localStorage
 */
const QuizAttemptView = ({
  questions,
  selectedStates,
  recordAttempt,
  getAttempt,
  onComplete,
  onExit
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionScrambles, setQuestionScrambles] = useState({});

  // Generate scrambled orders for all questions on mount
  useEffect(() => {
    const scrambles = {};
    questions.forEach(question => {
      const optionsCount = parseOptions(question.options).length;
      scrambles[question.id] = generateScrambledOrder(optionsCount);
    });
    setQuestionScrambles(scrambles);
  }, [questions]);

  // Reset question start time when navigating
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  // Sync selected answer when navigating between questions
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      const attempt = getAttempt(currentQuestion.id);

      if (attempt && attempt.isAttempted) {
        // Question has been answered
        setShowAnswers(true);
        // Map original index to display index
        const displayIndex = mapOriginalToDisplayIndex(
          attempt.selectedAnswerIndex,
          questionScrambles[currentQuestion.id]
        );
        setSelectedAnswerIndex(displayIndex);
      } else {
        setShowAnswers(false);
        setSelectedAnswerIndex(null);
      }
    }
  }, [currentQuestionIndex, questions, getAttempt, questionScrambles]);

  // Generate a scrambled order array
  const generateScrambledOrder = (length) => {
    const order = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  };

  // Parse options (handle string or array)
  const parseOptions = (options) => {
    if (!options) return [];
    if (Array.isArray(options)) return options;

    try {
      const result = JSON.parse(options);
      if (Array.isArray(result)) return result;
    } catch (e) {
      // Ignore parse errors
    }
    return [];
  };

  // Get current question
  const currentQuestion = useMemo(() => {
    return questions[currentQuestionIndex];
  }, [questions, currentQuestionIndex]);

  // Get question options with [correct] markers removed
  const getCleanOptions = useCallback((question) => {
    if (!question) return [];

    const options = parseOptions(question.options);
    return options.map(option => {
      if (typeof option !== 'string') return String(option);
      return option.replace(/\s*\[correct\]\s*$/, '');
    });
  }, []);

  // Get scrambled options for display
  const questionOptions = useMemo(() => {
    if (!currentQuestion) return [];

    const cleanOptions = getCleanOptions(currentQuestion);
    const scrambleOrder = questionScrambles[currentQuestion.id];

    if (!scrambleOrder) return cleanOptions;

    return scrambleOrder.map(originalIndex => cleanOptions[originalIndex]);
  }, [currentQuestion, questionScrambles, getCleanOptions]);

  // Get correct answer index in original options
  const getCorrectAnswerOriginalIndex = useCallback((question) => {
    if (!question) return -1;

    const options = parseOptions(question.options);
    return options.findIndex(option => String(option).includes('[correct]'));
  }, []);

  // Get correct answer index in scrambled display
  const getCorrectAnswerDisplayIndex = useCallback(() => {
    if (!currentQuestion) return -1;

    const originalIndex = getCorrectAnswerOriginalIndex(currentQuestion);
    const scrambleOrder = questionScrambles[currentQuestion.id];

    if (!scrambleOrder) return originalIndex;

    return scrambleOrder.indexOf(originalIndex);
  }, [currentQuestion, questionScrambles, getCorrectAnswerOriginalIndex]);

  // Map display index to original index
  const mapDisplayToOriginalIndex = (displayIndex, scrambleOrder) => {
    if (!scrambleOrder) return displayIndex;
    return scrambleOrder[displayIndex];
  };

  // Map original index to display index
  const mapOriginalToDisplayIndex = (originalIndex, scrambleOrder) => {
    if (!scrambleOrder) return originalIndex;
    return scrambleOrder.indexOf(originalIndex);
  };

  // Handle answer selection
  const handleAnswerSelect = (optionIndex) => {
    if (!showAnswers) {
      setSelectedAnswerIndex(optionIndex);
    }
  };

  // Handle submit answer
  const handleAnswer = () => {
    if (selectedAnswerIndex === null) return;

    const correctDisplayIndex = getCorrectAnswerDisplayIndex();
    const isCorrect = selectedAnswerIndex === correctDisplayIndex;
    const responseTime = Date.now() - questionStartTime;

    // Map display index to original index for storage
    const originalIndex = mapDisplayToOriginalIndex(
      selectedAnswerIndex,
      questionScrambles[currentQuestion.id]
    );

    // Record attempt in localStorage
    recordAttempt(currentQuestion.id, originalIndex, isCorrect, responseTime);

    setShowAnswers(true);
  };

  // Navigate to next question
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswerIndex(null);
      setShowAnswers(false);
    } else {
      // Quiz complete
      handleQuizCompletion();
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswerIndex(null);
      setShowAnswers(false);
    }
  };

  // Handle quiz completion
  const handleQuizCompletion = () => {
    // Calculate final stats
    const totalQuestions = questions.length;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach(question => {
      const attempt = getAttempt(question.id);
      if (!attempt || !attempt.isAttempted) {
        unanswered++;
      } else if (attempt.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    });

    onComplete({
      total: totalQuestions,
      correct,
      incorrect,
      unanswered,
      accuracy: totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0,
    });
  };

  // Handle exit
  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    onExit();
  };

  // Get answer status class
  const getAnswerClass = (optionIndex) => {
    if (!showAnswers) {
      return selectedAnswerIndex === optionIndex ? 'btn-primary' : 'btn-outline';
    }

    const correctIndex = getCorrectAnswerDisplayIndex();

    if (optionIndex === correctIndex) {
      return 'btn-success';
    }

    if (optionIndex === selectedAnswerIndex && optionIndex !== correctIndex) {
      return 'btn-error';
    }

    return 'btn-outline opacity-50';
  };

  // Get answer icon
  const getAnswerIcon = (optionIndex) => {
    if (!showAnswers) return null;

    const correctIndex = getCorrectAnswerDisplayIndex();

    if (optionIndex === correctIndex) {
      return <span className="ml-2">✓</span>;
    }

    if (optionIndex === selectedAnswerIndex && optionIndex !== correctIndex) {
      return <span className="ml-2">✗</span>;
    }

    return null;
  };

  // Calculate progress
  const progress = useMemo(() => {
    let answered = 0;
    questions.forEach(question => {
      const attempt = getAttempt(question.id);
      if (attempt && attempt.isAttempted) {
        answered++;
      }
    });
    return {
      answered,
      total: questions.length,
      percentage: questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0,
    };
  }, [questions, getAttempt]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">No questions available</p>
          <button onClick={onExit} className="btn btn-primary mt-4">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <div className="bg-base-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleExit}
              className="btn btn-ghost btn-sm"
              aria-label="Exit quiz"
            >
              ← Exit
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
              <div className="text-xs text-base-content/70">
                {progress.answered} answered ({progress.percentage}%)
              </div>
            </div>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-base-300">
        <div
          className="h-1 bg-primary transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Question Card */}
          <div className="card bg-base-100 shadow-lg mb-6">
            <div className="card-body">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold flex-1">
                  {currentQuestion.body}
                </h2>
                {currentQuestion.explanation && (
                  <button
                    onClick={() => setShowInfoModal(true)}
                    className="btn btn-ghost btn-sm btn-circle"
                    aria-label="Show explanation"
                  >
                    ℹ️
                  </button>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 mt-6">
                {questionOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showAnswers}
                    className={`btn btn-lg w-full justify-start text-left normal-case h-auto min-h-[3rem] py-3 ${getAnswerClass(index)}`}
                  >
                    <span className="flex-1">{option}</span>
                    {getAnswerIcon(index)}
                  </button>
                ))}
              </div>

              {/* Submit Button */}
              {!showAnswers && (
                <div className="mt-6">
                  <button
                    onClick={handleAnswer}
                    disabled={selectedAnswerIndex === null}
                    className="btn btn-primary btn-lg w-full"
                  >
                    Submit Answer
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Difficulty Badge */}
          <div className="flex justify-center gap-2 mb-4">
            <div className={`badge ${
              currentQuestion.difficulty === 'easy' ? 'badge-success' :
              currentQuestion.difficulty === 'medium' ? 'badge-warning' :
              'badge-error'
            }`}>
              {currentQuestion.difficulty || 'medium'}
            </div>
            <div className="badge badge-ghost">
              {currentQuestion.type || 'multiple-choice'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-base-100 border-t border-base-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="btn btn-outline"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!showAnswers}
              className="btn btn-primary"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Exit Quiz?</h3>
            <p className="py-4">
              Are you sure you want to exit? Your progress will be saved.
            </p>
            <div className="modal-action">
              <button onClick={() => setShowExitModal(false)} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={confirmExit} className="btn btn-primary">
                Exit Quiz
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowExitModal(false)} />
        </dialog>
      )}

      {/* Info/Explanation Modal */}
      {showInfoModal && currentQuestion.explanation && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Explanation</h3>
            <p className="py-4">{currentQuestion.explanation}</p>
            <div className="modal-action">
              <button onClick={() => setShowInfoModal(false)} className="btn">
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowInfoModal(false)} />
        </dialog>
      )}
    </div>
  );
};

export default QuizAttemptView;
