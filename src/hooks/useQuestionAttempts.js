import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sabuho_question_attempts';

/**
 * Custom hook for managing question attempts with offline-first approach
 * Stores attempts in localStorage with future Supabase sync capability
 */
export const useQuestionAttempts = (resourceSessionId = null) => {
  const [attempts, setAttempts] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Storage key scoped to resource session if provided
  const storageKey = resourceSessionId
    ? `${STORAGE_KEY}_${resourceSessionId}`
    : STORAGE_KEY;

  // Load attempts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setAttempts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load question attempts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Save attempts to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(attempts));
      } catch (error) {
        console.error('Failed to save question attempts:', error);
      }
    }
  }, [attempts, storageKey, isLoading]);

  // Record a question attempt
  const recordAttempt = useCallback((questionId, selectedAnswerIndex, isCorrect, responseTimeMs = 0) => {
    const attemptData = {
      questionId,
      isAttempted: true,
      isCorrect,
      selectedAnswerIndex,
      attemptedAt: new Date().toISOString(),
      responseTimeMs,
      // Placeholder for future sync
      synced: false,
    };

    setAttempts(prev => ({
      ...prev,
      [questionId]: attemptData,
    }));

    // TODO: Queue for Supabase sync when online
    // syncToSupabase(attemptData);
  }, []);

  // Get attempt for a specific question
  const getAttempt = useCallback((questionId) => {
    return attempts[questionId] || null;
  }, [attempts]);

  // Check if a question has been attempted
  const isAttempted = useCallback((questionId) => {
    return attempts[questionId]?.isAttempted || false;
  }, [attempts]);

  // Check if a question was answered correctly
  const isCorrect = useCallback((questionId) => {
    return attempts[questionId]?.isCorrect || false;
  }, [attempts]);

  // Get all attempts as an array
  const getAllAttempts = useCallback(() => {
    return Object.values(attempts);
  }, [attempts]);

  // Clear all attempts
  const clearAttempts = useCallback(() => {
    setAttempts({});
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear attempts:', error);
    }
  }, [storageKey]);

  // Clear attempts for a specific question
  const clearAttempt = useCallback((questionId) => {
    setAttempts(prev => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    const attemptList = Object.values(attempts);
    const attemptedCount = attemptList.filter(a => a.isAttempted).length;
    const correctCount = attemptList.filter(a => a.isCorrect).length;
    const incorrectCount = attemptedCount - correctCount;

    return {
      total: attemptList.length,
      attempted: attemptedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      unanswered: attemptList.length - attemptedCount,
    };
  }, [attempts]);

  // Placeholder for future Supabase sync
  const syncToSupabase = useCallback(async () => {
    // TODO: Implement Supabase sync
    // 1. Check if online
    // 2. Get unsynced attempts
    // 3. Batch upload to Supabase
    // 4. Mark as synced
    console.log('Supabase sync not yet implemented');
  }, []);

  return {
    attempts,
    isLoading,
    recordAttempt,
    getAttempt,
    isAttempted,
    isCorrect,
    getAllAttempts,
    clearAttempts,
    clearAttempt,
    getStats,
    syncToSupabase,
  };
};
