import { supabase } from '../supabase'

export async function fetchQuizzes() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to fetch quizzes')
  }

  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('author_id', session.user.id)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch quizzes: ${error.message}`)
  }

  return data || []
}

export async function createQuiz(payload) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User must be authenticated to create quizzes')

  const { data, error } = await supabase
    .from('quizzes')
    .insert({
      name: payload.name,
      description: payload.description ?? null,
      domains: JSON.stringify(payload.domains),
      is_published: payload.is_published ?? false,
      num_questions: payload.num_questions ?? 0,
      author_id: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create quiz: ${error.message}`)
  }

  return data
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update quiz: ${error.message}`)
  }

  return data
}

export async function deleteQuiz(id) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User must be authenticated to delete quizzes')
  }

  // First check if the quiz exists and user owns it
  const { data: quiz, error: fetchError } = await supabase
    .from('quizzes')
    .select('id, author_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to find quiz: ${fetchError.message}`)
  }

  if (!quiz) {
    throw new Error('Quiz not found')
  }

  if (quiz.author_id !== user.id) {
    throw new Error('You can only delete your own quizzes')
  }

  // Now delete the quiz
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)
    .eq('author_id', user.id) // Extra safety check

  if (error) {
    throw new Error(`Failed to delete quiz: ${error.message}`)
  }
}