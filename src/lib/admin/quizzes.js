import * as supabaseService from '@/services/supabaseService'

export async function fetchQuizzes() {
  const { session, error: sessionError } = await supabaseService.getCurrentSession()
  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to fetch quizzes')
  }

  const { data, error } = await supabaseService.fetchQuizzes(session.user.id)

  if (error) {
    throw new Error(`Failed to fetch quizzes: ${error.message}`)
  }

  return data || []
}

export async function createQuiz(payload) {
  const { user } = await supabaseService.getCurrentUser()
  if (!user) throw new Error('User must be authenticated to create quizzes')

  const { data, error } = await supabaseService.createQuiz(payload, user.id)

  if (error) {
    throw new Error(`Failed to create quiz: ${error.message}`)
  }

  return data
}

export async function updateQuiz(id, payload) {
  const { data, error } = await supabaseService.updateQuiz(id, payload)

  if (error) {
    throw new Error(`Failed to update quiz: ${error.message}`)
  }

  return data
}

export async function deleteQuiz(id) {
  const { user, error: authError } = await supabaseService.getCurrentUser()
  if (authError || !user) {
    throw new Error('User must be authenticated to delete quizzes')
  }

  const { error } = await supabaseService.deleteQuiz(id, user.id)

  if (error) {
    throw new Error(error.message || `Failed to delete quiz`)
  }
}