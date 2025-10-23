import { supabase } from '../lib/supabase'

/**
 * Trophy Service
 *
 * This service manages trophy/achievement tracking for quiz attempts.
 * It uses ratio-based calculations to determine trophy eligibility,
 * making it work with any quiz size.
 */

// Trophy type definitions with their criteria and metadata
export const TROPHY_TYPES = {
  FIRST_BLOOD: {
    type: 'FIRST_BLOOD',
    name: 'First Blood',
    description: 'Answered your first question correctly',
    icon: 'target',
    checkCriteria: (stats) => {
      return stats.correctCount === 1 && stats.totalAnswered === 1
    }
  },

  HAT_TRICK: {
    type: 'HAT_TRICK',
    name: 'Hat Trick',
    description: 'Three consecutive correct answers',
    icon: 'zap',
    checkCriteria: (stats) => {
      return stats.currentStreak >= 3
    }
  },

  HOT_STREAK: {
    type: 'HOT_STREAK',
    name: 'Hot Streak',
    description: 'Five consecutive correct answers',
    icon: 'flame',
    checkCriteria: (stats) => {
      return stats.currentStreak >= 5
    }
  },

  UNSTOPPABLE: {
    type: 'UNSTOPPABLE',
    name: 'Unstoppable',
    description: 'Ten consecutive correct answers',
    icon: 'trophy',
    checkCriteria: (stats) => {
      return stats.currentStreak >= 10
    }
  },

  SHARP_SHOOTER: {
    type: 'SHARP_SHOOTER',
    name: 'Sharp Shooter',
    description: 'Maintain 90% accuracy or higher',
    icon: 'crosshair',
    checkCriteria: (stats) => {
      // Must have answered at least 5 questions and maintain 90%+ accuracy
      return stats.totalAnswered >= 5 && stats.accuracyPercentage >= 90
    }
  },

  PERFECTIONIST: {
    type: 'PERFECTIONIST',
    name: 'Perfectionist',
    description: 'Achieve 100% accuracy on the quiz',
    icon: 'star',
    checkCriteria: (stats) => {
      // Can only be awarded when quiz is complete
      return stats.isQuizComplete &&
             stats.totalAnswered === stats.totalQuestions &&
             stats.accuracyPercentage === 100
    }
  },

  SPEED_DEMON: {
    type: 'SPEED_DEMON',
    name: 'Speed Demon',
    description: 'Average response time under 3 seconds',
    icon: 'gauge',
    checkCriteria: (stats) => {
      // Must have answered at least 5 questions with avg time < 3000ms
      return stats.totalAnswered >= 5 &&
             stats.averageResponseTime > 0 &&
             stats.averageResponseTime < 3000
    }
  },

  LIGHTNING_FAST: {
    type: 'LIGHTNING_FAST',
    name: 'Lightning Fast',
    description: 'Average response time under 1.5 seconds',
    icon: 'bolt',
    checkCriteria: (stats) => {
      // Must have answered at least 5 questions with avg time < 1500ms
      return stats.totalAnswered >= 5 &&
             stats.averageResponseTime > 0 &&
             stats.averageResponseTime < 1500
    }
  },

  COMEBACK_KING: {
    type: 'COMEBACK_KING',
    name: 'Comeback King',
    description: 'Recover with 3+ correct answers after 2+ wrong',
    icon: 'undo-2',
    checkCriteria: (stats) => {
      // Check if user had at least 2 wrong answers followed by 3 correct streak
      return stats.hadComeback && stats.currentStreak >= 3
    }
  },

  HALF_WAY_HERO: {
    type: 'HALF_WAY_HERO',
    name: 'Halfway Hero',
    description: 'Reached the halfway point with 80%+ accuracy',
    icon: 'award',
    checkCriteria: (stats) => {
      const halfWay = Math.floor(stats.totalQuestions / 2)
      return stats.totalAnswered === halfWay &&
             stats.totalAnswered >= 3 &&
             stats.accuracyPercentage >= 80
    }
  }
}

/**
 * Calculate statistics from quiz attempt questions
 * @param {Array} attemptQuestions - Array of quiz attempt questions
 * @param {number} totalQuestions - Total number of questions in the quiz
 * @returns {Object} Statistics object
 */
export function calculateQuizStats(attemptQuestions, totalQuestions) {
  if (!attemptQuestions || attemptQuestions.length === 0) {
    return {
      totalQuestions: totalQuestions || 0,
      totalAnswered: 0,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 0,
      accuracyPercentage: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageResponseTime: 0,
      isQuizComplete: false,
      hadComeback: false
    }
  }

  let correctCount = 0
  let wrongCount = 0
  let skippedCount = 0
  let currentStreak = 0
  let longestStreak = 0
  let totalResponseTime = 0
  let responseTimeCount = 0
  let hadComeback = false
  let consecutiveWrong = 0

  // Process questions to calculate stats
  attemptQuestions.forEach((question, index) => {
    if (question.is_skipped) {
      skippedCount++
      currentStreak = 0
    } else if (question.is_attempted) {
      if (question.is_correct) {
        correctCount++
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)

        // Check for comeback scenario
        if (consecutiveWrong >= 2 && currentStreak >= 3) {
          hadComeback = true
        }
        consecutiveWrong = 0
      } else {
        wrongCount++
        consecutiveWrong++
        currentStreak = 0
      }

      // Track response time
      if (question.response_time_ms && question.response_time_ms > 0) {
        totalResponseTime += question.response_time_ms
        responseTimeCount++
      }
    }
  })

  const totalAnswered = correctCount + wrongCount
  const accuracyPercentage = totalAnswered > 0
    ? Math.round((correctCount / totalAnswered) * 100)
    : 0
  const averageResponseTime = responseTimeCount > 0
    ? Math.round(totalResponseTime / responseTimeCount)
    : 0
  const isQuizComplete = totalAnswered === totalQuestions

  return {
    totalQuestions,
    totalAnswered,
    correctCount,
    wrongCount,
    skippedCount,
    accuracyPercentage,
    currentStreak,
    longestStreak,
    averageResponseTime,
    isQuizComplete,
    hadComeback
  }
}

/**
 * Check which new trophies have been unlocked
 * @param {Object} stats - Current quiz statistics
 * @param {Array} alreadyUnlockedTypes - Array of trophy types already unlocked in this attempt
 * @returns {Array} Array of newly unlocked trophy objects
 */
export function checkForNewTrophies(stats, alreadyUnlockedTypes = []) {
  const newTrophies = []

  Object.values(TROPHY_TYPES).forEach(trophy => {
    // Skip if already unlocked
    if (alreadyUnlockedTypes.includes(trophy.type)) {
      return
    }

    // Check if criteria is met
    if (trophy.checkCriteria(stats)) {
      newTrophies.push({
        type: trophy.type,
        name: trophy.name,
        description: trophy.description,
        icon: trophy.icon,
        metadata: {
          stats: {
            accuracy: stats.accuracyPercentage,
            streak: stats.currentStreak,
            avgResponseTime: stats.averageResponseTime
          }
        }
      })
    }
  })

  return newTrophies
}

/**
 * Save a trophy to the database
 * @param {string} userId - User ID
 * @param {string} quizAttemptId - Quiz attempt ID
 * @param {Object} trophy - Trophy object
 * @returns {Promise<Object>} Result with data and error
 */
export async function saveTrophy(userId, quizAttemptId, trophy) {
  const { data, error } = await supabase
    .from('trophy_unlocks')
    .insert({
      user_id: userId,
      quiz_attempt_id: quizAttemptId,
      trophy_type: trophy.type,
      trophy_name: trophy.name,
      trophy_description: trophy.description,
      trophy_icon: trophy.icon,
      trophy_metadata: trophy.metadata || {}
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Get all trophies for a quiz attempt
 * @param {string} quizAttemptId - Quiz attempt ID
 * @returns {Promise<Object>} Result with data and error
 */
export async function getTrophiesForAttempt(quizAttemptId) {
  const { data, error } = await supabase
    .from('trophy_unlocks')
    .select('*')
    .eq('quiz_attempt_id', quizAttemptId)
    .order('unlocked_at', { ascending: true })

  return { data, error }
}

/**
 * Get all trophies for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with data and error
 */
export async function getUserTrophies(userId) {
  const { data, error } = await supabase
    .from('trophy_unlocks')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  return { data, error }
}

/**
 * Calculate progress toward next trophy
 * @param {Object} stats - Current quiz statistics
 * @param {Array} alreadyUnlockedTypes - Array of trophy types already unlocked
 * @returns {Object} Progress information for next trophy
 */
export function getNextTrophyProgress(stats, alreadyUnlockedTypes = []) {
  const potentialTrophies = []

  Object.values(TROPHY_TYPES).forEach(trophy => {
    // Skip if already unlocked
    if (alreadyUnlockedTypes.includes(trophy.type)) {
      return
    }

    // Calculate progress percentage for this trophy
    let progress = 0
    let label = ''

    switch (trophy.type) {
      case 'FIRST_BLOOD':
        progress = stats.totalAnswered > 0 ? 100 : 0
        label = 'Answer first question correctly'
        break

      case 'HAT_TRICK':
        progress = Math.min((stats.currentStreak / 3) * 100, 100)
        label = `${stats.currentStreak}/3 correct streak`
        break

      case 'HOT_STREAK':
        progress = Math.min((stats.currentStreak / 5) * 100, 100)
        label = `${stats.currentStreak}/5 correct streak`
        break

      case 'UNSTOPPABLE':
        progress = Math.min((stats.currentStreak / 10) * 100, 100)
        label = `${stats.currentStreak}/10 correct streak`
        break

      case 'SHARP_SHOOTER':
        if (stats.totalAnswered >= 5) {
          progress = stats.accuracyPercentage >= 90 ? 100 : (stats.accuracyPercentage / 90) * 100
          label = `${stats.accuracyPercentage}% accuracy (need 90%)`
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `Answer ${stats.totalAnswered}/5 questions`
        }
        break

      case 'PERFECTIONIST':
        if (stats.isQuizComplete) {
          progress = stats.accuracyPercentage
          label = `${stats.accuracyPercentage}% accuracy`
        } else {
          progress = (stats.totalAnswered / stats.totalQuestions) * 100
          label = `${stats.totalAnswered}/${stats.totalQuestions} completed`
        }
        break

      case 'SPEED_DEMON':
        if (stats.totalAnswered >= 5 && stats.averageResponseTime > 0) {
          const speedProgress = Math.max(0, Math.min(100, ((3000 - stats.averageResponseTime) / 3000) * 100))
          progress = speedProgress
          label = `Avg: ${(stats.averageResponseTime / 1000).toFixed(1)}s (need <3s)`
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `Answer ${stats.totalAnswered}/5 questions`
        }
        break

      case 'LIGHTNING_FAST':
        if (stats.totalAnswered >= 5 && stats.averageResponseTime > 0) {
          const speedProgress = Math.max(0, Math.min(100, ((1500 - stats.averageResponseTime) / 1500) * 100))
          progress = speedProgress
          label = `Avg: ${(stats.averageResponseTime / 1000).toFixed(1)}s (need <1.5s)`
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `Answer ${stats.totalAnswered}/5 questions`
        }
        break

      case 'COMEBACK_KING':
        progress = stats.hadComeback && stats.currentStreak >= 3 ? 100 : 0
        label = 'Need comeback with 3+ streak'
        break

      case 'HALF_WAY_HERO':
        const halfWay = Math.floor(stats.totalQuestions / 2);
        if (stats.totalAnswered === halfWay) {
          progress = (stats.accuracyPercentage / 80) * 100
          label = `${stats.accuracyPercentage}% accuracy at halfway`
        } else if (stats.totalAnswered < halfWay) {
          progress = (stats.totalAnswered / halfWay) * 50
          label = `${stats.totalAnswered}/${halfWay} to halfway`
        } else {
          progress = 0
          label = 'Missed (past halfway)'
        }
        break

      default:
        break
    }

    if (progress > 0 && progress < 100) {
      potentialTrophies.push({
        trophy,
        progress: Math.round(progress),
        label
      })
    }
  })

  // Sort by progress (highest first) and return the closest one
  potentialTrophies.sort((a, b) => b.progress - a.progress)

  return potentialTrophies[0] || null
}
