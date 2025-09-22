import { supabase } from './supabase'

export async function createQuestion(questionData) {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to create questions')
  }

  const { options, ...questionFields } = questionData
  
  // Convert options to string array format for JSONB storage
  const optionsArray = options.map(option => option.label)
  
  // Create question with options as JSONB
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .insert({
      ...questionFields,
      author_id: user.id,
      options: optionsArray
    })
    .select()
    .single()

  if (questionError) {
    throw new Error(`Failed to create question: ${questionError.message}`)
  }

  return question
}

export async function updateQuestion(
  questionId,
  updates
) {
  const { data, error } = await supabase
    .from('questions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', questionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update question: ${error.message}`)
  }

  return data
}

export async function deleteQuestion(questionId) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) {
    throw new Error(`Failed to delete question: ${error.message}`)
  }
}

export async function fetchQuestionOptions(questionId) {
  const { data, error } = await supabase
    .from('questions')
    .select('options')
    .eq('id', questionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch question options: ${error.message}`)
  }

  return data?.options || []
}

export async function updateQuestionOptions(
  questionId,
  options
) {
  const { data, error } = await supabase
    .from('questions')
    .update({ options, updated_at: new Date().toISOString() })
    .eq('id', questionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update question options: ${error.message}`)
  }

  return data
}

export async function addQuestionOption(
  questionId,
  newOption
) {
  // First fetch current options
  const currentOptions = await fetchQuestionOptions(questionId)
  
  // Add new option to the array
  const updatedOptions = [...currentOptions, newOption]
  
  // Update the question with new options
  return updateQuestionOptions(questionId, updatedOptions)
}

export async function removeQuestionOption(
  questionId,
  optionIndex
) {
  // First fetch current options
  const currentOptions = await fetchQuestionOptions(questionId)
  
  // Remove option at the specified index
  const updatedOptions = currentOptions.filter((_, index) => index !== optionIndex)
  
  // Update the question with new options
  return updateQuestionOptions(questionId, updatedOptions)
}

export async function moveQuestionsToDomain(
  questionIds,
  targetDomainId
) {
  const { data, error } = await supabase
    .from('questions')
    .update({ domain_id: targetDomainId, updated_at: new Date().toISOString() })
    .in('id', questionIds)
    .select()

  if (error) {
    throw new Error(`Failed to move questions: ${error.message}`)
  }

  return data
}