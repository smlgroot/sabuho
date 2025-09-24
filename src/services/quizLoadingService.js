import { database } from '../lib/game/database'

export class QuizLoadingService {
  // Version: 2024-09-15-fix-array-parsing
  /**
   * Gets the question count for a level type
   */
  getQuestionCountForLevelType(levelType = 'normal') {
    switch (levelType) {
      case 'normal':
        return 3
      case 'mini_boss':
        return 5
      case 'boss':
        return 10
      default:
        return 3
    }
  }

  /**
   * Selects questions for a quiz session with proper limiting
   */
  async selectQuestions(quizId, questionCount, sessionId = null) {
    // Get all questions for the quiz
    const allQuestions = await database.getQuizQuestions(quizId)
    if (allQuestions.length === 0) {
      throw new Error('No questions found for this quiz')
    }

    // If we have a sessionId, try to use questions from existing session for consistency
    if (sessionId) {
      try {
        const questionAttempts = await database.getQuestionAttempts(sessionId)
        console.log('selectQuestions: Checking session for existing questions:', {
          sessionId,
          attemptsFound: questionAttempts ? questionAttempts.length : 0,
          attempts: questionAttempts
        })
        
        if (questionAttempts && questionAttempts.length > 0) {
          // Get unique question IDs in the order they were attempted
          const seenQuestionIds = new Set()
          const questionIds = []
          
          for (const attempt of questionAttempts) {
            if (!seenQuestionIds.has(attempt.question_id)) {
              questionIds.push(attempt.question_id)
              seenQuestionIds.add(attempt.question_id)
            }
          }
          
          // Map question IDs to actual question objects
          const sessionQuestions = questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean)
          
          if (sessionQuestions.length > 0) {
            console.log('Using existing session questions:', {
              sessionId,
              questionsFound: sessionQuestions.length,
              questionIds,
              sessionQuestions: sessionQuestions.map(q => ({ id: q.id, body: q.body?.substring(0, 50) + '...' }))
            })
            return sessionQuestions
          }
        }
      } catch (error) {
        console.warn('Could not load session questions, falling back to random selection:', error)
      }
    }

    // For now, just randomly select the required number of questions
    // In a more advanced implementation, we could prioritize unattempted questions
    const shuffledQuestions = [...allQuestions].sort(() => Math.random() - 0.5)
    return shuffledQuestions.slice(0, questionCount)
  }

  /**
   * Loads a quiz with its questions from the database
   */
  async loadQuizData(quizId, userId, levelType = 'normal', levelId = null) {
    try {
      // Get quiz data
      const quiz = await database.getQuiz(quizId)
      if (!quiz) {
        throw new Error('Quiz not found')
      }

      // Get or create quiz session first to check for existing questions
      const sessionId = await database.getOrCreateQuizSession(userId, quiz.id, levelId)

      // Get the appropriate number of questions based on level type
      const questionCount = this.getQuestionCountForLevelType(levelType)
      const questions = await this.selectQuestions(quizId, questionCount, sessionId)

      return {
        quiz,
        questions,
        sessionId
      }
    } catch (error) {
      console.error('Error in quiz loading service:', error)
      throw error
    }
  }

  /**
   * Creates a quiz session
   */
  async createQuizSession(quiz, questions, userId, levelId = null) {
    // Create quiz session in the database
    const sessionId = await database.getOrCreateQuizSession(userId, quiz.id, levelId)
    
    return sessionId
  }

  /**
   * Loads existing quiz session data for readonly mode
   */
  async loadQuizSessionData(sessionId, questions) {
    try {
      // Get the session
      const session = await database.getQuizSession(sessionId)
      if (!session) {
        throw new Error('Quiz session not found')
      }

      // Get question attempts for this session
      const questionAttempts = await database.getQuestionAttempts(sessionId)
      
      console.log('Loading session data:', {
        sessionId,
        session,
        questionAttempts: questionAttempts.length,
        questions: questions.length,
        attempts: questionAttempts.map(att => ({
          question_id: att.question_id,
          selected_answer_index: att.selected_answer_index
        }))
      })
      
      // Convert attempts to answers format expected by QuizScreen
      // Match question attempts to current quiz questions by question_id
      const answers = {}
      
      console.log('DEBUGGING loadQuizSessionData - mapping attempts to questions:', {
        sessionId,
        questionsCount: questions.length,
        attemptsCount: questionAttempts.length,
        questionIds: questions.map(q => q.id),
        attemptQuestionIds: questionAttempts.map(a => a.question_id)
      })
      
      questions.forEach((question, questionIndex) => {
        console.log(`Looking for question ${questionIndex} with id: ${question.id}`)
        const attempt = questionAttempts.find(att => att.question_id === question.id)
        if (attempt) {
          answers[questionIndex] = attempt.selected_answer_index
          console.log(`✓ Mapped question ${questionIndex} (id: ${question.id}) to answer ${attempt.selected_answer_index}`)
        } else {
          console.log(`✗ No attempt found for question ${questionIndex} (id: ${question.id})`)
        }
      })

      console.log('Final answers mapping:', answers)

      return {
        session,
        questionAttempts,
        answers
      }
    } catch (error) {
      console.error('Error loading quiz session data:', error)
      throw error
    }
  }

  /**
   * Parses options data that could be a string or already parsed array
   */
  parseOptionsString(options) {
    if (!options) {
      console.log('parseOptionsString: No options provided, returning empty array')
      return []
    }
        
    // FIRST: Check if it's already an array - this should handle the current issue
    if (Array.isArray(options)) {
      return options
    }
    
    // SECOND: If it's a string, try to parse it as JSON
    if (typeof options === 'string') {
      try {
        const result = JSON.parse(options)
        if (Array.isArray(result)) {
          return result
        } else {
          return []
        }
      } catch (jsonError) {
        
        // Fallback for malformed array-like strings
        try {
          let cleaned = options.trim()
          if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            cleaned = cleaned.slice(1, -1)
          }
          
          const parsedOptions = cleaned.split("', '").map(option => {
            return option.replace(/^'|'$/g, '')
          })
          
          return parsedOptions
        } catch (fallbackError) {
          console.error('parseOptionsString v2:  All parsing methods failed:', fallbackError)
          return []
        }
      }
    }
    
    // THIRD: Handle unexpected data types
    console.error('parseOptionsString  v2: Unexpected data type, returning empty array. Type:', typeof options, 'Value:', options)
    return []
  }

  /**
   * Gets questions for display (removes [correct] markers from options for display)
   */
  getQuestionOptions(question) {
    if (!question) {
      return []
    }
    
    if (!question.options) {
      return []
    }

    try {
      const options = this.parseOptionsString(question.options)
      if (!Array.isArray(options)) {
        return []
      }
      const processedOptions = options.map(option => {
        if (typeof option !== 'string') {
          return String(option)
        }
        return option.replace(/\s*\[correct\]\s*$/, '')
      })
      return processedOptions
    } catch (error) {
      console.error('getQuestionOptions: Error parsing options', error, question.options)
      return []
    }
  }

  /**
   * Finds the correct answer index
   */
  getCorrectAnswerIndex(question) {
    if (!question) {
      console.log('getCorrectAnswerIndex: No question provided')
      return -1
    }
    
    if (!question.options) {
      console.log('getCorrectAnswerIndex: Question has no options field', question)
      return -1
    }

    try {
      const options = this.parseOptionsString(question.options)
      if (!Array.isArray(options)) {
        console.log('getCorrectAnswerIndex: Options is not an array', options)
        return -1
      }
      const correctIndex = options.findIndex(option => String(option).includes('[correct]'))
      console.log('getCorrectAnswerIndex: Correct index found', correctIndex, 'in options', options)
      return correctIndex
    } catch (error) {
      console.error('getCorrectAnswerIndex: Error parsing options', error, question.options)
      return -1
    }
  }
}

export const quizLoadingService = new QuizLoadingService()