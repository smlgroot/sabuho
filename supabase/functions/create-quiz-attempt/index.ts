// Follow this setup guide to integrate the Deno runtime into your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuizAttemptRequest {
  quizId: string
  selectedTypes: string[] // ['correct', 'wrong', 'unanswered']
  selectedDomainIds: string[]
}

interface AttemptQuestion {
  is_attempted: boolean
  is_correct: boolean
  question_id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Parse the request body
    const { quizId, selectedTypes, selectedDomainIds }: QuizAttemptRequest = await req.json()

    if (!quizId || !selectedTypes || selectedTypes.length === 0 || !selectedDomainIds || selectedDomainIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: quizId, selectedTypes, selectedDomainIds' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Creating quiz attempt for user:', user.id, 'quiz:', quizId, 'types:', selectedTypes)

    // Step 1: Fetch existing quiz attempts for this quiz and user to get insights data
    const { data: attempts, error: attemptsError } = await supabaseClient
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch quiz attempts', details: attemptsError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Step 2: Get all attempt questions for these attempts
    let attemptQuestions: AttemptQuestion[] = []
    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id)

      const { data: questionsData, error: questionsError } = await supabaseClient
        .from('quiz_attempt_questions')
        .select(`
          id,
          quiz_attempt_id,
          question_id,
          is_correct,
          is_attempted,
          questions!inner(id, domain_id)
        `)
        .in('quiz_attempt_id', attemptIds)

      if (questionsError) {
        console.error('Error fetching attempt questions:', questionsError)
      } else if (questionsData) {
        attemptQuestions = questionsData as any
      }
    }

    // Step 3: Filter questions based on selected types
    const questionIds: Set<string> = new Set()

    // Get correct answers
    if (selectedTypes.includes('correct')) {
      attemptQuestions
        .filter((aq: any) => aq.is_attempted && aq.is_correct)
        .forEach((aq: any) => questionIds.add(aq.question_id))
    }

    // Get wrong answers
    if (selectedTypes.includes('wrong')) {
      attemptQuestions
        .filter((aq: any) => aq.is_attempted && !aq.is_correct)
        .forEach((aq: any) => questionIds.add(aq.question_id))
    }

    // Get unanswered questions
    if (selectedTypes.includes('unanswered')) {
      const attemptedQuestionIds = new Set(
        attemptQuestions
          .filter((aq: any) => aq.is_attempted)
          .map((aq: any) => aq.question_id)
      )

      // Fetch all questions from selected domains
      const { data: allQuestions, error: allQuestionsError } = await supabaseClient
        .from('questions')
        .select('id')
        .in('domain_id', selectedDomainIds)

      if (allQuestionsError) {
        console.error('Error fetching all questions:', allQuestionsError)
      } else if (allQuestions) {
        allQuestions
          .filter((q: any) => !attemptedQuestionIds.has(q.id))
          .forEach((q: any) => questionIds.add(q.id))
      }
    }

    const filteredQuestionIds = Array.from(questionIds)

    if (filteredQuestionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions match the selected criteria' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`Found ${filteredQuestionIds.length} questions matching criteria`)

    // Step 4: Fetch question details to determine number of options for scrambling
    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .select('id, options')
      .in('id', filteredQuestionIds)

    if (questionsError) {
      console.error('Error fetching question details:', questionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch question details', details: questionsError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Create a map of questionId -> number of options
    const questionOptionsMap = new Map()
    questions?.forEach((q: any) => {
      const optionsCount = Array.isArray(q.options) ? q.options.length : 0
      questionOptionsMap.set(q.id, optionsCount)
    })

    // Helper function to shuffle an array using Fisher-Yates algorithm
    function shuffleArray(length: number): number[] {
      const array = Array.from({ length }, (_, i) => i)
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
      }
      return array
    }

    // Step 5: Create the quiz_attempt record
    const { data: quizAttempt, error: attemptError } = await supabaseClient
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: user.id,
      })
      .select()
      .single()

    if (attemptError) {
      console.error('Error creating quiz attempt:', attemptError)
      return new Response(
        JSON.stringify({ error: 'Failed to create quiz attempt', details: attemptError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Created quiz attempt:', quizAttempt.id)

    // Step 6: Create quiz_attempt_questions records with scrambled order
    const attemptQuestionsToInsert = filteredQuestionIds.map(questionId => {
      const optionsCount = questionOptionsMap.get(questionId) || 0
      const scrambledOrder = optionsCount > 0 ? shuffleArray(optionsCount) : []

      return {
        quiz_attempt_id: quizAttempt.id,
        question_id: questionId,
        is_correct: false,
        is_skipped: false,
        is_marked_for_review: false,
        is_attempted: false,
        response_time_ms: null,
        confidence_level: null,
        scrambled_order: scrambledOrder,
      }
    })

    const { data: createdQuestions, error: questionsInsertError } = await supabaseClient
      .from('quiz_attempt_questions')
      .insert(attemptQuestionsToInsert)
      .select()

    if (questionsInsertError) {
      console.error('Error creating attempt questions:', questionsInsertError)

      // Clean up: delete the quiz attempt if questions insertion fails
      await supabaseClient
        .from('quiz_attempts')
        .delete()
        .eq('id', quizAttempt.id)

      return new Response(
        JSON.stringify({ error: 'Failed to create attempt questions', details: questionsInsertError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log(`Created ${createdQuestions.length} attempt questions`)

    // Return success response
    return new Response(
      JSON.stringify({
        quizAttempt,
        attemptQuestions: createdQuestions,
        questionCount: createdQuestions.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
