import Dexie from 'dexie'

export const DATABASE_NAME = 'quiz_quest.db';

class SabuhoDatabase extends Dexie {
  constructor() {
    super('SabuhoAppDB')
    
    this.version(1).stores({
      codes: '++id, code, verified, updated_at, tombstone',
      outbox: '++id, op, payload, created_at, retries',
      meta: 'key, value',
      domains: 'id, parent_id, root_parent_id, author_id, name, created_at, updated_at',
      quizzes: 'id, author_id, name, is_published, created_at, updated_at',
      questions: 'id, quiz_id, domain_id, author_id, body, explanation, options, resource_id, created_at, updated_at',
      quiz_learning_levels: 'id, quiz_id, index_position, name, type, is_unlocked, is_completed, created_at, updated_at',
      quiz_learning_level_names: 'id, name, type, created_at, updated_at',
      quiz_sessions: 'id, user_id, quiz_id, level_id, start_time',
      question_attempts: '++id, session_id, quiz_id, question_id, selected_answer_index, is_correct, timestamp'
    })
    
    // Add indexes for performance
    this.codes.defineClass({
      id: Number,
      code: String,
      verified: Boolean,
      updated_at: Date,
      tombstone: Boolean
    })
    
    this.outbox.defineClass({
      id: Number,
      op: String, // 'insert', 'update', 'delete'
      payload: Object,
      created_at: Date,
      retries: Number
    })
    
    this.meta.defineClass({
      key: String,
      value: String
    })
  }
}

class DatabaseManager {
  constructor() {
    this.db = new SabuhoDatabase()
    if (import.meta.env && import.meta.env.DEV) {
      console.log('Setting window.db in development mode')
      window.db = this.db;
    }
  }

  // Codes operations
  async saveCode(code) {
    const codeData = {
      code: code.trim(),
      verified: false,
      updated_at: new Date(),
      tombstone: false
    }
    
    const id = await this.db.codes.add(codeData)
    
    // Add to outbox for sync
    await this.addToOutbox('insert', { ...codeData, id })
    
    return id
  }


  // Outbox operations for sync
  async addToOutbox(operation, payload) {
    return await this.db.outbox.add({
      op: operation,
      payload,
      created_at: new Date(),
      retries: 0
    })
  }

  async getOutboxEntries() {
    return await this.db.outbox
      .orderBy('created_at')
      .toArray()
  }

  async clearOutboxEntry(id) {
    return await this.db.outbox.delete(id)
  }

  async incrementRetries(id) {
    const entry = await this.db.outbox.get(id)
    if (entry) {
      await this.db.outbox.update(id, { retries: entry.retries + 1 })
    }
  }

  // Meta operations
  async setMeta(key, value) {
    return await this.db.meta.put({ key, value })
  }

  async getMeta(key) {
    const result = await this.db.meta.get(key)
    return result ? result.value : null
  }

  async getLastSyncedAt() {
    return await this.getMeta('last_synced_at')
  }

  async setLastSyncedAt(timestamp) {
    return await this.setMeta('last_synced_at', timestamp)
  }

  // Utility operations
  async clearAllCodes() {
    await this.db.codes.clear()
    await this.db.outbox.clear()
  }


  // Quiz-related operations
  async saveQuiz(quiz) {
    return await this.db.quizzes.put(quiz)
  }

  async saveDomain(domain) {
    return await this.db.domains.put(domain)
  }

  async saveQuestions(questions) {
    return await this.db.transaction('rw', this.db.questions, async () => {
      for (const question of questions) {
        await this.db.questions.put(question)
      }
    })
  }

  async saveLevelNames(levelNames) {
    return await this.db.transaction('rw', this.db.quiz_learning_level_names, async () => {
      for (const levelName of levelNames) {
        await this.db.quiz_learning_level_names.put(levelName)
      }
    })
  }

  async getQuizzes() {
    return await this.db.quizzes.orderBy('created_at').reverse().toArray()
  }

  async getQuiz(quizId) {
    return await this.db.quizzes.where('id').equals(quizId).first()
  }

  async getQuizQuestions(quizId) {
    return await this.db.questions.where('quiz_id').equals(quizId).toArray()
  }

  async checkCodeExists(code) {
    const existingCode = await this.db.codes
      .where('code')
      .equals(code.trim())
      .first()
    return existingCode
  }

  async checkQuizExists(quizId) {
    const existingQuiz = await this.db.quizzes
      .where('id')
      .equals(quizId)
      .first()
    return existingQuiz
  }

  async getQuizLevels(quizId) {
    return await this.db.quiz_learning_levels
      .where('quiz_id')
      .equals(quizId)
      .sortBy('index_position')
  }

  async saveLevels(levels) {
    return await this.db.transaction('rw', this.db.quiz_learning_levels, async () => {
      for (const level of levels) {
        await this.db.quiz_learning_levels.put(level)
      }
    })
  }

  async updateLevelProgress(levelId, isUnlocked, isCompleted) {
    return await this.db.quiz_learning_levels.update(levelId, {
      is_unlocked: isUnlocked ? 1 : 0,
      is_completed: isCompleted ? 1 : 0,
      updated_at: new Date().toISOString()
    })
  }

  async unlockNextLevel(currentLevelId, quizId) {
    // Get all levels for this quiz sorted by index
    const levels = await this.getQuizLevels(quizId)
    const currentLevelIndex = levels.findIndex(level => level.id === currentLevelId)
    
    if (currentLevelIndex !== -1 && currentLevelIndex < levels.length - 1) {
      const nextLevel = levels[currentLevelIndex + 1]
      // Only unlock if not already unlocked, preserve completion status
      if (!nextLevel.is_unlocked) {
        return await this.updateLevelProgress(nextLevel.id, true, Boolean(nextLevel.is_completed))
      }
    }
    
    return null
  }

  async completeLevelAndUnlockNext(levelId, quizId) {
    // Mark current level as completed
    await this.updateLevelProgress(levelId, true, true)
    
    // Unlock the next level
    return await this.unlockNextLevel(levelId, quizId)
  }

  // Quiz session operations
  async createQuizSession(userId, quizId, levelId) {
    const sessionData = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      quiz_id: quizId,
      level_id: levelId,
      start_time: new Date().toISOString()
    }
    
    await this.db.quiz_sessions.put(sessionData)
    return sessionData.id
  }

  async getQuizSession(sessionId) {
    return await this.db.quiz_sessions.where('id').equals(sessionId).first()
  }

  async getExistingQuizSession(userId, quizId, levelId) {
    const session = await this.db.quiz_sessions
      .where('user_id').equals(userId)
      .and(session => session.quiz_id === quizId && session.level_id === levelId)
      .first()
    
    return session
  }

  async getOrCreateQuizSession(userId, quizId, levelId) {
    try {
      let existingSession = await this.getExistingQuizSession(userId, quizId, levelId)
      
      if (existingSession) {
        return existingSession.id
      }
      
      const newSessionId = await this.createQuizSession(userId, quizId, levelId)
      return newSessionId
    } catch (error) {
      console.error('Error in getOrCreateQuizSession:', error)
      
      const existingSession = await this.getExistingQuizSession(userId, quizId, levelId)
      if (existingSession) {
        return existingSession.id
      }
      
      throw error
    }
  }

  // Question attempt operations
  async createQuestionAttempt(sessionId, quizId, questionId, selectedAnswerIndex, isCorrect) {
    const attemptData = {
      session_id: sessionId,
      quiz_id: quizId,
      question_id: questionId,
      selected_answer_index: selectedAnswerIndex,
      is_correct: isCorrect,
      timestamp: new Date().toISOString()
    }
    
    return await this.db.question_attempts.add(attemptData)
  }

  async getQuestionAttempts(sessionId) {
    const attempts = await this.db.question_attempts
      .where('session_id')
      .equals(sessionId)
      .toArray()
    
    attempts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    
    return attempts
  }

  async getQuestionAttempt(sessionId, questionId) {
    return await this.db.question_attempts
      .where('session_id').equals(sessionId)
      .and(attempt => attempt.question_id === questionId)
      .first()
  }
}

export const database = new DatabaseManager()