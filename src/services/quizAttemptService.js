import { supabase } from '../lib/supabase'

/**
 * Service for managing quiz attempt questions
 *
 * IMPORTANT: Quiz attempt creation is handled by the Supabase Edge Function 'create-quiz-attempt'
 * This service contains client-side functions for updating quiz attempt questions.
 *
 * SCRAMBLED OPTIONS SYSTEM:
 * --------------------------
 * To prevent position memorization, each quiz attempt question has a scrambled_order array.
 *
 * Example: scrambled_order = [2, 0, 3, 1]
 * - Display position 0 shows original option 2
 * - Display position 1 shows original option 0
 * - Display position 2 shows original option 3
 * - Display position 3 shows original option 1
 *
 * INDEX MAPPING:
 * --------------
 * - selectedAnswerIndex: Always stored as ORIGINAL index (not display position)
 * - When user clicks display position i, we map: originalIndex = scrambled_order[i]
 * - When showing results, we reverse map: displayIndex = scrambled_order.indexOf(originalIndex)
 * - Correctness is checked against ORIGINAL correct index
 *
 * This approach ensures:
 * 1. Options appear in random order (prevents memorization)
 * 2. Same scrambled order is shown when navigating back (consistency)
 * 3. Correctness can be verified regardless of display order
 * 4. Works even if question options are updated in the database
 */

/**
 * Update a quiz attempt question with answer data
 * @param {string} attemptQuestionId - The quiz attempt question ID
 * @param {Object} updates - Object containing fields to update
 * @returns {Promise<Object>} - Object containing updated data and error if any
 */
export async function updateQuizAttemptQuestion(attemptQuestionId, updates) {
  const { data, error } = await supabase
    .from('quiz_attempt_questions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', attemptQuestionId)
    .select()
    .single()

  return { data, error }
}

/**
 * Record an answer for a quiz attempt question
 *
 * IMPORTANT: selectedAnswerIndex must be the ORIGINAL index, NOT the display position!
 * The calling code should map display position to original index using scrambled_order.
 *
 * @param {string} attemptQuestionId - The quiz attempt question ID
 * @param {boolean} isCorrect - Whether the answer is correct
 * @param {number} selectedAnswerIndex - The ORIGINAL index of the selected answer option (not display position)
 * @param {number} responseTimeMs - Response time in milliseconds
 * @param {number} confidenceLevel - Confidence level (optional)
 * @returns {Promise<Object>} - Object containing updated data and error if any
 *
 * @example
 * // If user clicks display position 1, and scrambled_order is [2, 0, 3, 1]:
 * const originalIndex = scrambled_order[1] // = 0
 * await recordQuizAnswer(questionId, isCorrect, originalIndex, responseTime)
 */
export async function recordQuizAnswer(attemptQuestionId, isCorrect, selectedAnswerIndex = null, responseTimeMs = null, confidenceLevel = null) {
  const updates = {
    is_attempted: true,
    is_correct: isCorrect,
    response_time_ms: responseTimeMs,
    confidence_level: confidenceLevel
  }

  // Store the ORIGINAL index (not display position)
  // This allows correctness verification regardless of scrambled display order
  if (selectedAnswerIndex !== null) {
    updates.selected_answer_index = selectedAnswerIndex
  }

  return await updateQuizAttemptQuestion(attemptQuestionId, updates)
}

/**
 * Mark a quiz attempt question as skipped
 * @param {string} attemptQuestionId - The quiz attempt question ID
 * @returns {Promise<Object>} - Object containing updated data and error if any
 */
export async function markQuestionAsSkipped(attemptQuestionId) {
  return await updateQuizAttemptQuestion(attemptQuestionId, {
    is_skipped: true
  })
}

/**
 * Mark a quiz attempt question for review
 * @param {string} attemptQuestionId - The quiz attempt question ID
 * @param {boolean} marked - Whether to mark or unmark for review
 * @returns {Promise<Object>} - Object containing updated data and error if any
 */
export async function markQuestionForReview(attemptQuestionId, marked = true) {
  return await updateQuizAttemptQuestion(attemptQuestionId, {
    is_marked_for_review: marked
  })
}

/**
 * Fetch quiz attempt questions with full question details
 * @param {string} quizAttemptId - The quiz attempt ID
 * @returns {Promise<Object>} - Object containing questions data and error if any
 */
export async function fetchQuizAttemptQuestionsWithDetails(quizAttemptId) {
  const { data, error } = await supabase
    .from('quiz_attempt_questions')
    .select(`
      *,
      questions:question_id (
        id,
        type,
        body,
        explanation,
        difficulty,
        options,
        domain_id
      )
    `)
    .eq('quiz_attempt_id', quizAttemptId)
    .order('created_at', { ascending: true })

  return { data, error }
}
