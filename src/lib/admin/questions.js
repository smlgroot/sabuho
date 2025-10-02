import * as supabaseService from '@/services/supabaseService'

export async function createQuestion(questionData) {
  const { user } = await supabaseService.getCurrentUser()

  if (!user) {
    throw new Error('User must be authenticated to create questions')
  }

  const { data: question, error: questionError } = await supabaseService.createQuestion(questionData, user.id)

  if (questionError) {
    throw new Error(`Failed to create question: ${questionError.message}`)
  }

  return question
}

export async function updateQuestion(questionId, updates) {
  const { data, error } = await supabaseService.updateQuestion(questionId, updates)

  if (error) {
    throw new Error(`Failed to update question: ${error.message}`)
  }

  return data
}

export async function deleteQuestion(questionId) {
  const { error } = await supabaseService.deleteQuestion(questionId)

  if (error) {
    throw new Error(`Failed to delete question: ${error.message}`)
  }
}

export async function fetchQuestionOptions(questionId) {
  const { data, error } = await supabaseService.updateQuestion(questionId, {})

  if (error) {
    throw new Error(`Failed to fetch question options: ${error.message}`)
  }

  return data?.options || []
}

export async function updateQuestionOptions(questionId, options) {
  const { data, error } = await supabaseService.updateQuestion(questionId, { options })

  if (error) {
    throw new Error(`Failed to update question options: ${error.message}`)
  }

  return data
}

export async function addQuestionOption(questionId, newOption) {
  // First fetch current options
  const currentOptions = await fetchQuestionOptions(questionId)

  // Add new option to the array
  const updatedOptions = [...currentOptions, newOption]

  // Update the question with new options
  return updateQuestionOptions(questionId, updatedOptions)
}

export async function removeQuestionOption(questionId, optionIndex) {
  // First fetch current options
  const currentOptions = await fetchQuestionOptions(questionId)

  // Remove option at the specified index
  const updatedOptions = currentOptions.filter((_, index) => index !== optionIndex)

  // Update the question with new options
  return updateQuestionOptions(questionId, updatedOptions)
}

export async function moveQuestionsToDomain(questionIds, targetDomainId) {
  const { data, error } = await supabaseService.moveQuestionsToDomain(questionIds, targetDomainId)

  if (error) {
    throw new Error(`Failed to move questions: ${error.message}`)
  }

  return data
}