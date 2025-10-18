import { supabase } from '../lib/supabase'

/**
 * Centralized Supabase service for all database operations
 * This file consolidates all Supabase queries to avoid duplication
 */

// ============================================================================
// AUTH OPERATIONS
// ============================================================================

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut(scope = 'local') {
  const { error } = await supabase.auth.signOut({ scope })
  return { error }
}

export async function verifyOtp(token_hash, type) {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
  return { data, error }
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    return { data: null, error }
  }

  return { data, error: error?.code === 'PGRST116' ? null : error }
}

export async function upsertUserProfile(userId, updates = {}) {
  const now = new Date().toISOString()

  // Check if profile exists first
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  let result
  if (existingProfile) {
    // Update existing profile
    result = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        last_active_at: now,
        updated_at: now
      })
      .eq('user_id', userId)
      .select()
  } else {
    // Create new profile
    result = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name: updates.display_name || '',
        ...updates,
        last_active_at: now,
        updated_at: now
      })
      .select()
  }

  return result
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()

  return { data, error }
}

// ============================================================================
// USER CREDITS OPERATIONS
// ============================================================================

export async function getUserCredits(userId) {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { data: null, error }
  }

  return { data, error: error?.code === 'PGRST116' ? null : error }
}

export async function updateUserCredits(userId, credits) {
  const { data, error } = await supabase
    .from('user_credits')
    .update({ credits })
    .eq('user_id', userId)
    .select()

  return { data, error }
}

export async function deductUserCredit(userId, amount = 1) {
  const { data: creditsData } = await getUserCredits(userId)
  const currentCredits = creditsData?.credits || 0

  return updateUserCredits(userId, currentCredits - amount)
}

// ============================================================================
// DOMAIN OPERATIONS
// ============================================================================

export async function fetchDomains(authorId) {
  const { data, error } = await supabase
    .from('domains')
    .select(`
      *,
      resources:resources(*),
      questions:questions(*)
    `)
    .eq('author_id', authorId)
    .order('created_at', { ascending: true })

  return { data, error }
}

export async function fetchDomainsByIds(domainIds) {
  const { data, error } = await supabase
    .from('domains')
    .select('*')
    .in('id', domainIds)

  return { data, error }
}

export async function createDomain(domain, authorId) {
  const insertData = {
    author_id: authorId,
    parent_id: domain.parent_id,
    name: domain.name,
    description: domain.description,
    domain_type: domain.domain_type
  }

  const { data, error } = await supabase
    .from('domains')
    .insert(insertData)
    .select()
    .single()

  return { data, error }
}

export async function updateDomain(id, updates) {
  const { data, error } = await supabase
    .from('domains')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteDomain(id) {
  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('id', id)

  return { error }
}

// ============================================================================
// QUIZ OPERATIONS
// ============================================================================

export async function fetchQuizzes(authorId) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: true })

  return { data, error }
}

export async function fetchQuizById(quizId) {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', quizId)

  return { data, error }
}

export async function createQuiz(payload, authorId) {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      name: payload.name,
      description: payload.description ?? null,
      domains: JSON.stringify(payload.domains),
      is_published: payload.is_published ?? false,
      num_questions: payload.num_questions ?? 0,
      author_id: authorId,
    })
    .select()
    .single()

  return { data, error }
}

export async function updateQuiz(id, payload) {
  const { data, error } = await supabase
    .from('quizzes')
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.domains !== undefined ? { domains: JSON.stringify(payload.domains) } : {}),
      ...(payload.is_published !== undefined ? { is_published: payload.is_published } : {}),
      ...(payload.num_questions !== undefined ? { num_questions: payload.num_questions } : {}),
      ...(payload.published_at !== undefined ? { published_at: payload.published_at } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export async function deleteQuiz(id, authorId) {
  // First check if the quiz exists and user owns it
  const { data: quiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, author_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return { error: fetchError }
  }

  if (!quiz) {
    return { error: new Error('Quiz not found') }
  }

  if (quiz.author_id !== authorId) {
    return { error: new Error('You can only delete your own quizzes') }
  }

  // Now delete the quiz
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .eq('author_id', authorId) // Extra safety check

  return { error }
}

// ============================================================================
// QUIZ CODE OPERATIONS
// ============================================================================

export async function fetchQuizCodeByCode(code) {
  const { data, error } = await supabase
    .from('quiz_codes')
    .select('id, quiz_id')
    .eq('code', code.trim())
    .single()

  return { data, error }
}

export async function fetchQuizCodes(quizId) {
  const { data, error } = await supabase
    .from('quiz_codes')
    .select(`
      id,
      code,
      created_at,
      user_quiz_codes(id, user_id)
    `)
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function createQuizCode(authorId, quizId, code) {
  const { data, error } = await supabase
    .from('quiz_codes')
    .insert({
      author_id: authorId,
      quiz_id: quizId,
      code: code
    })
    .select()
    .single()

  return { data, error }
}

// ============================================================================
// USER QUIZ CODE OPERATIONS
// ============================================================================

export async function checkUserQuizCodeClaim(userId, quizCodeId) {
  const { data, error } = await supabase
    .from('user_quiz_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_code_id', quizCodeId)
    .single()

  return { data, error }
}

export async function createUserQuizCode(userId, quizId, quizCodeId) {
  const { data, error } = await supabase
    .from('user_quiz_codes')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      quiz_code_id: quizCodeId
    })
    .select()

  return { data, error }
}

export async function fetchUserQuizCodes(userId) {
  const { data, error } = await supabase
    .from('user_quiz_codes')
    .select(`
      quiz_id,
      quiz_code_id,
      quiz_codes!inner(id, code)
    `)
    .eq('user_id', userId)

  return { data, error }
}

// ============================================================================
// QUESTION OPERATIONS
// ============================================================================

export async function fetchQuestionsByDomainIds(domainIds) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .in('domain_id', domainIds)

  return { data, error }
}

export async function createQuestion(questionData, authorId) {
  const { options, ...questionFields } = questionData

  // Convert options to string array format for JSONB storage
  const optionsArray = options.map(option => option.label)

  const { data, error } = await supabase
    .from('questions')
    .insert({
      ...questionFields,
      author_id: authorId,
      options: optionsArray
    })
    .select()
    .single()

  return { data, error }
}

export async function updateQuestion(questionId, updates) {
  const { data, error } = await supabase
    .from('questions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', questionId)
    .select()
    .single()

  return { data, error }
}

export async function deleteQuestion(questionId) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  return { error }
}

export async function moveQuestionsToDomain(questionIds, targetDomainId) {
  const { data, error } = await supabase
    .from('questions')
    .update({
      domain_id: targetDomainId,
      updated_at: new Date().toISOString()
    })
    .in('id', questionIds)
    .select()

  return { data, error }
}

// ============================================================================
// RESOURCE OPERATIONS
// ============================================================================

export async function uploadResourceFile(file, userId, domainId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${userId}/${domainId}_${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(filePath, file)

  if (uploadError) {
    return { filePath: null, publicUrl: null, error: uploadError }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(filePath)

  return { filePath, publicUrl, error: null }
}

export async function createResource(resourceData) {
  const { data, error } = await supabase
    .from('resources')
    .insert(resourceData)
    .select()
    .single()

  return { data, error }
}

export async function fetchResource(resourceId) {
  const { data, error } = await supabase
    .from('resources')
    .select('id, name, status, mime_type, created_at, updated_at, domain_id, author_id, description, file_path, url')
    .eq('id', resourceId)
    .single()

  return { data, error }
}

export async function updateResource(resourceId, updates) {
  const { data, error } = await supabase
    .from('resources')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', resourceId)
    .select()
    .single()

  return { data, error }
}

export async function deleteResourceFile(filePath) {
  const { error } = await supabase.storage
    .from('resources')
    .remove([filePath])

  return { error }
}

export async function deleteResource(resourceId) {
  // Get resource details first
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('file_path')
    .eq('id', resourceId)
    .single()

  if (fetchError) {
    return { error: fetchError }
  }

  // Delete from storage
  if (resource.file_path) {
    const { error: storageError } = await deleteResourceFile(resource.file_path)
    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError.message)
    }
  }

  // Delete from database
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId)

  return { error }
}

// ============================================================================
// QUIZ LEARNING LEVEL OPERATIONS
// ============================================================================

export async function fetchQuizLearningLevelNames() {
  const { data, error } = await supabase
    .from('quiz_learning_level_names')
    .select('*')

  return { data, error }
}

// ============================================================================
// QUIZ ATTEMPTS OPERATIONS
// ============================================================================

export async function fetchQuizAttemptsByQuiz(quizId) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, user_id, created_at, updated_at')
    .eq('quiz_id', quizId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export async function fetchQuizAttemptQuestions(quizAttemptIds) {
  const { data, error } = await supabase
    .from('quiz_attempt_questions')
    .select(`
      id,
      quiz_attempt_id,
      question_id,
      is_correct,
      is_skipped,
      is_marked_for_review,
      is_attempted,
      response_time_ms,
      confidence_level,
      questions!inner(id, domain_id)
    `)
    .in('quiz_attempt_id', quizAttemptIds)

  return { data, error }
}

export async function fetchQuizInsightsData(quizId, selectedDomainIds = []) {
  // Fetch all attempts for this quiz
  const { data: attempts, error: attemptsError } = await fetchQuizAttemptsByQuiz(quizId)

  if (attemptsError) {
    return { data: null, error: attemptsError }
  }

  // Count total questions available from selected domains (efficient count query)
  let totalAvailableQuestions = 0
  if (selectedDomainIds.length > 0) {
    const { count, error: countError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .in('domain_id', selectedDomainIds)

    if (!countError && count !== null) {
      totalAvailableQuestions = count
    }
  }

  // If no attempts, return with total available questions
  if (!attempts || attempts.length === 0) {
    return {
      data: {
        attempts: [],
        attemptQuestions: [],
        totalAvailableQuestions
      },
      error: null
    }
  }

  // Fetch all attempt questions
  const attemptIds = attempts.map(a => a.id)
  const { data: attemptQuestions, error: questionsError } = await fetchQuizAttemptQuestions(attemptIds)

  if (questionsError) {
    return { data: null, error: questionsError }
  }

  return {
    data: {
      attempts,
      attemptQuestions,
      totalAvailableQuestions
    },
    error: null
  }
}
