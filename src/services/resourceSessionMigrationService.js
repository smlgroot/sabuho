import * as supabaseService from './supabaseService'
import { supabase } from '../lib/supabase'

/**
 * Migrates resource session data to user's domains and questions
 * @param {string} filePath - The S3 file path (key) used to identify the resource session
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{success: boolean, domainIds: string[], questionCount: number, error: Error|null}>}
 */
export async function migrateResourceSessionToUserData(filePath, userId) {
  try {
    // 1. Fetch resource session by file_path and check if already migrated
    const { data: resourceSession, error: sessionError } = await supabase
      .from('resource_sessions')
      .select('id, name, topic_page_range, is_migrated')
      .eq('file_path', filePath)
      .single()

    if (sessionError) {
      console.error('Error fetching resource session:', sessionError)
      return { success: false, domainIds: [], questionCount: 0, error: sessionError }
    }

    if (!resourceSession) {
      return { success: false, domainIds: [], questionCount: 0, error: new Error('Resource session not found') }
    }

    console.log('Found resource session:', resourceSession)

    // 2. Check if already migrated
    if (resourceSession.is_migrated) {
      console.log('Resource session already migrated, skipping')
      return {
        success: false,
        domainIds: [],
        questionCount: 0,
        error: new Error('This quiz has already been saved to your account')
      }
    }

    // 3. Mark as migrated immediately to prevent double migration
    const { error: updateError } = await supabase
      .from('resource_sessions')
      .update({ is_migrated: true, updated_at: new Date().toISOString() })
      .eq('id', resourceSession.id)

    if (updateError) {
      console.error('Error marking session as migrated:', updateError)
      // Continue with migration even if update fails
    } else {
      console.log('Marked resource session as migrated')
    }

    // 4. Fetch resource_session_domains
    const { data: sessionDomains, error: domainsError } = await supabase
      .from('resource_session_domains')
      .select('*')
      .eq('resource_session_id', resourceSession.id)
      .order('created_at', { ascending: true })

    if (domainsError) {
      console.error('Error fetching session domains:', domainsError)
      return { success: false, domainIds: [], questionCount: 0, error: domainsError }
    }

    if (!sessionDomains || sessionDomains.length === 0) {
      console.warn('No domains found for resource session')
      return { success: false, domainIds: [], questionCount: 0, error: new Error('No domains found') }
    }

    console.log(`Found ${sessionDomains.length} session domains`)

    // 5. Create parent domain with resource session name
    const parentDomainData = {
      author_id: userId,
      parent_id: null,
      name: resourceSession.name || 'Imported Quiz',
      description: `Imported from resource session on ${new Date().toLocaleDateString()}`,
      domain_type: 'folder'
    }

    const { data: parentDomain, error: parentDomainError } = await supabase
      .from('domains')
      .insert(parentDomainData)
      .select()
      .single()

    if (parentDomainError) {
      console.error('Error creating parent domain:', parentDomainError)
      return { success: false, domainIds: [], questionCount: 0, error: parentDomainError }
    }

    console.log('Created parent domain:', parentDomain)

    // 6. Create child domains from resource_session_domains
    const domainMappings = {} // Maps old session domain ID to new domain ID
    const createdDomainIds = [parentDomain.id]

    for (const sessionDomain of sessionDomains) {
      const domainData = {
        author_id: userId,
        parent_id: parentDomain.id,
        name: sessionDomain.name,
        description: `Pages ${sessionDomain.page_range_start}-${sessionDomain.page_range_end}`,
        domain_type: 'folder'
      }

      const { data: newDomain, error: domainError } = await supabase
        .from('domains')
        .insert(domainData)
        .select()
        .single()

      if (domainError) {
        console.error('Error creating domain:', domainError)
        continue
      }

      domainMappings[sessionDomain.id] = newDomain.id
      createdDomainIds.push(newDomain.id)
      console.log(`Created domain: ${sessionDomain.name} -> ${newDomain.id}`)
    }

    // 7. Fetch resource_session_questions for all domains
    const { data: sessionQuestions, error: questionsError } = await supabase
      .from('resource_session_questions')
      .select('*')
      .eq('resource_session_id', resourceSession.id)
      .order('created_at', { ascending: true })

    if (questionsError) {
      console.error('Error fetching session questions:', questionsError)
      return { success: false, domainIds: createdDomainIds, questionCount: 0, error: questionsError }
    }

    if (!sessionQuestions || sessionQuestions.length === 0) {
      console.warn('No questions found for resource session')
      return { success: true, domainIds: createdDomainIds, questionCount: 0, error: null }
    }

    console.log(`Found ${sessionQuestions.length} session questions`)

    // 8. Create questions with mapped domain IDs
    let createdQuestionCount = 0
    const questionsToInsert = []

    for (const sessionQuestion of sessionQuestions) {
      const newDomainId = domainMappings[sessionQuestion.resource_session_domain_id]

      if (!newDomainId) {
        console.warn(`No domain mapping found for question ${sessionQuestion.id}, skipping`)
        continue
      }

      const questionData = {
        domain_id: newDomainId,
        author_id: userId,
        type: sessionQuestion.type || 'multiple_options',
        body: sessionQuestion.body,
        explanation: sessionQuestion.explanation,
        options: sessionQuestion.options,
        difficulty: null,
        resource_id: null
      }

      questionsToInsert.push(questionData)
    }

    // Batch insert questions
    if (questionsToInsert.length > 0) {
      const { data: createdQuestions, error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting questions:', insertError)
        return { success: false, domainIds: createdDomainIds, questionCount: 0, error: insertError }
      }

      createdQuestionCount = createdQuestions.length
      console.log(`Created ${createdQuestionCount} questions`)
    }

    return {
      success: true,
      domainIds: createdDomainIds,
      questionCount: createdQuestionCount,
      error: null
    }
  } catch (error) {
    console.error('Exception in migrateResourceSessionToUserData:', error)
    return { success: false, domainIds: [], questionCount: 0, error }
  }
}
