/**
 * Utility functions for calculating question statistics and filtering
 */

/**
 * Calculate statistics from questions and attempts
 * @param {Array} questions - Array of question objects
 * @param {Object} attempts - Attempts object from useQuestionAttempts
 * @returns {Object} Statistics object with counts
 */
export const calculateQuestionStats = (questions, attempts) => {
  if (!questions || questions.length === 0) {
    return {
      total: 0,
      unanswered: 0,
      correct: 0,
      incorrect: 0,
    };
  }

  let unanswered = 0;
  let correct = 0;
  let incorrect = 0;

  questions.forEach(question => {
    const attempt = attempts[question.id];

    if (!attempt || !attempt.isAttempted) {
      unanswered++;
    } else if (attempt.isCorrect) {
      correct++;
    } else {
      incorrect++;
    }
  });

  return {
    total: questions.length,
    unanswered,
    correct,
    incorrect,
  };
};

/**
 * Filter questions based on selected states
 * @param {Array} questions - Array of question objects
 * @param {Object} attempts - Attempts object from useQuestionAttempts
 * @param {Array} selectedStates - Array of selected states: ['unanswered', 'correct', 'incorrect']
 * @returns {Array} Filtered questions
 */
export const filterQuestionsByState = (questions, attempts, selectedStates) => {
  if (!questions || questions.length === 0) {
    return [];
  }

  if (!selectedStates || selectedStates.length === 0) {
    return [];
  }

  return questions.filter(question => {
    const attempt = attempts[question.id];

    // Check if unanswered
    if (selectedStates.includes('unanswered')) {
      if (!attempt || !attempt.isAttempted) {
        return true;
      }
    }

    // Check if correct
    if (selectedStates.includes('correct')) {
      if (attempt && attempt.isAttempted && attempt.isCorrect) {
        return true;
      }
    }

    // Check if incorrect
    if (selectedStates.includes('incorrect')) {
      if (attempt && attempt.isAttempted && !attempt.isCorrect) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Get question state for a specific question
 * @param {Object} question - Question object
 * @param {Object} attempts - Attempts object from useQuestionAttempts
 * @returns {string} State: 'unanswered' | 'correct' | 'incorrect'
 */
export const getQuestionState = (question, attempts) => {
  const attempt = attempts[question.id];

  if (!attempt || !attempt.isAttempted) {
    return 'unanswered';
  }

  return attempt.isCorrect ? 'correct' : 'incorrect';
};

/**
 * Group questions by state
 * @param {Array} questions - Array of question objects
 * @param {Object} attempts - Attempts object from useQuestionAttempts
 * @returns {Object} Questions grouped by state
 */
export const groupQuestionsByState = (questions, attempts) => {
  const grouped = {
    unanswered: [],
    correct: [],
    incorrect: [],
  };

  if (!questions || questions.length === 0) {
    return grouped;
  }

  questions.forEach(question => {
    const state = getQuestionState(question, attempts);
    grouped[state].push(question);
  });

  return grouped;
};

/**
 * Calculate accuracy percentage
 * @param {Object} stats - Stats object from calculateQuestionStats
 * @returns {number} Accuracy percentage (0-100)
 */
export const calculateAccuracy = (stats) => {
  const attempted = stats.correct + stats.incorrect;
  if (attempted === 0) return 0;
  return Math.round((stats.correct / attempted) * 100);
};

/**
 * Calculate progress percentage
 * @param {Object} stats - Stats object from calculateQuestionStats
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (stats) => {
  if (stats.total === 0) return 0;
  const attempted = stats.correct + stats.incorrect;
  return Math.round((attempted / stats.total) * 100);
};
