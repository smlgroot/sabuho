import { supabase } from './supabase'

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
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete quiz: ${error.message}`)
  }
}