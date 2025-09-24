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
  async selectQuestions(quizId, questionCount) {
    // Get all questions for the quiz
    const allQuestions = await database.getQuizQuestions(quizId)
    if (allQuestions.length === 0) {
      throw new Error('No questions found for this quiz')
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

      // Get the appropriate number of questions based on level type
      const questionCount = this.getQuestionCountForLevelType(levelType)
      const questions = await this.selectQuestions(quizId, questionCount)

      // Create or get existing quiz session
      const sessionId = await this.createQuizSession(quiz, questions, userId, levelId)

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
    
    console.log('parseOptionsString v2: Input data:', options, 'Type:', typeof options, 'isArray:', Array.isArray(options))
    
    // FIRST: Check if it's already an array - this should handle the current issue
    if (Array.isArray(options)) {
      console.log('parseOptionsString v2: Input is already an array, returning directly:', options)
      return options
    }
    
    // SECOND: If it's a string, try to parse it as JSON
    if (typeof options === 'string') {
      console.log('parseOptionsString v2: Input is string, attempting JSON parse')
      try {
        const result = JSON.parse(options)
        console.log('parseOptionsString v2: JSON parse succeeded:', result)
        if (Array.isArray(result)) {
          return result
        } else {
          console.warn('parseOptionsString v2: JSON parsed but result is not an array:', result)
          return []
        }
      } catch (jsonError) {
        console.error('parseOptionsString v2: JSON parse failed:', jsonError.message)
        console.log('parseOptionsString v2: Attempting fallback string parsing for:', options)
        
        // Fallback for malformed array-like strings
        try {
          let cleaned = options.trim()
          if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            cleaned = cleaned.slice(1, -1)
          }
          
          const parsedOptions = cleaned.split("', '").map(option => {
            return option.replace(/^'|'$/g, '')
          })
          
          console.log('parseOptionsString v2: Fallback parsing successful:', parsedOptions)
          return parsedOptions
        } catch (fallbackError) {
          console.error('parseOptionsString v2: All parsing methods failed:', fallbackError)
          return []
        }
      }
    }
    
    // THIRD: Handle unexpected data types
    console.error('parseOptionsString v2: Unexpected data type, returning empty array. Type:', typeof options, 'Value:', options)
    return []
  }

  /**
   * Gets questions for display (removes [correct] markers from options for display)
   */
  getQuestionOptions(question) {
    if (!question) {
      console.log('getQuestionOptions: No question provided')
      return []
    }
    
    if (!question.options) {
      console.log('getQuestionOptions: Question has no options field', question)
      return []
    }

    try {
      console.log('getQuestionOptions: Parsing options', question.options)
      const options = this.parseOptionsString(question.options)
      if (!Array.isArray(options)) {
        console.log('getQuestionOptions: Options is not an array', options)
        return []
      }
      const processedOptions = options.map(option => {
        if (typeof option !== 'string') {
          console.log('getQuestionOptions: Option is not a string', option)
          return String(option)
        }
        return option.replace(/\s*\[correct\]\s*$/, '')
      })
      console.log('getQuestionOptions: Processed options', processedOptions)
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