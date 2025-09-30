import { supabase } from '../lib/supabase'
import { database } from '../lib/game/database'
import i18n from '../i18n'

const LevelType = {
  NORMAL: 'normal',
  MINI_BOSS: 'mini_boss',
  BOSS: 'boss'
}

const LEVEL_CONFIGS = {
  [LevelType.NORMAL]: {
    baseQuestionRatio: 0.15,
    maxQuestionRatio: 0.25,
    difficultyMultiplier: 1.0,
    requiresPreviousCompletion: false,
    spaceRepetitionWeight: 0.3,
    frequency: 2
  },
  [LevelType.MINI_BOSS]: {
    baseQuestionRatio: 0,
    maxQuestionRatio: 0,
    difficultyMultiplier: 1.3,
    requiresPreviousCompletion: true,
    spaceRepetitionWeight: 0.5,
    frequency: 6
  },
  [LevelType.BOSS]: {
    baseQuestionRatio: 0,
    maxQuestionRatio: 0,
    difficultyMultiplier: 1.6,
    requiresPreviousCompletion: true,
    spaceRepetitionWeight: 0.7,
    frequency: 12
  }
}

class QuizClaimService {
  async claimQuiz(code) {
    try {
      // 1. Check if code already exists in local database
      const existingCode = await database.checkCodeExists(code)
      if (existingCode) {
        return {
          success: false,
          error: i18n.t('This quiz code has already been added to your library'),
          isDuplicate: true
        }
      }

      // 2. Look up the code in quiz_codes table to get the quiz_id and code_id
      const { data: quizCode, error: codeError } = await supabase
        .from('quiz_codes')
        .select('id, quiz_id')
        .eq('code', code.trim())
        .single()


      if (codeError) {
        throw new Error('Invalid code or code not found')
      }

      if (!quizCode) {
        throw new Error('Code not found')
      }

      const quizId = quizCode.quiz_id

      // 3. Check if this code has already been claimed by the current user
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: existingClaim, error: claimError } = await supabase
            .from('user_quiz_codes')
            .select('id')
            .eq('user_id', user.id)
            .eq('quiz_code_id', quizCode.id)
            .single()

          if (claimError && claimError.code !== 'PGRST116') { // PGRST116 is "no rows found"
            console.warn('Error checking for existing claim:', claimError)
          } else if (existingClaim) {
            return {
              success: false,
              error: i18n.t('You have already claimed this specific quiz code'),
              isDuplicate: true
            }
          }
        }
      } catch (claimCheckError) {
        console.warn('Error checking if code already claimed:', claimCheckError)
      }

      // 4. Check if quiz already exists in local database
      const existingQuiz = await database.checkQuizExists(quizId)
      if (existingQuiz) {
        return {
          success: false,
          error: i18n.t('This quiz is already in your library'),
          isDuplicate: true,
          existingQuiz
        }
      }

      // 5. Load the quiz data
      const quiz = await this.loadQuiz(quizId)
      
      // 6. Load domains referenced by the quiz
      const domains = await this.loadDomainsFromQuiz(quiz)
      
      // 7. Load questions for this quiz
      const questions = await this.loadQuestionsForQuiz(quiz)

      // 8. Save everything to local database
      // Save domains first (for foreign key relationships)
      for (const domain of domains) {
        await database.saveDomain(domain)
      }
      
      // Save the quiz
      await database.saveQuiz(quiz)

      // Save questions
      if (questions && questions.length > 0) {
        await database.saveQuestions(questions)
      }

      // 9. Sync learning level names for local use (non-fatal if it fails)
      try {
        await this.syncLearningLevelNames()
      } catch (e) {
        console.warn('Failed to sync quiz_learning_level_names:', e)
      }

      // 10. Generate and save learning levels (non-fatal if it fails)
      try {
        if (questions && questions.length > 0) {
          await this.generateAndSaveLevels(quiz.id, questions)
        } else {
          console.warn('Skipping level generation: no questions available for this quiz')
        }
      } catch (e) {
        console.warn('Failed to generate/save learning levels:', e)
      }

      // 11. Save the code as verified
      await database.saveCode(code)

      // 12. Save user_quiz_codes record to Supabase (if user is authenticated)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { error: userQuizCodeError } = await supabase
            .from('user_quiz_codes')
            .insert({
              user_id: user.id,
              quiz_id: quizId,
              quiz_code_id: quizCode.id
            })
          
          if (userQuizCodeError) {
            console.warn('Failed to save user_quiz_codes record:', userQuizCodeError)
          }
        }
      } catch (userQuizCodeError) {
        console.warn('Error saving user_quiz_codes record:', userQuizCodeError)
      }
      
      return {
        success: true,
        quiz,
        totalQuestions: questions ? questions.length : 0,
        totalDomains: domains ? domains.length : 0
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : i18n.t('An unknown error occurred')
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async loadQuiz(quizId) {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)


    if (error) {
      throw new Error(`Failed to fetch quiz: ${error.message}`)
    }

    if (!quizzes || quizzes.length === 0) {
      throw new Error(`Quiz not found: ${quizId}`)
    }

    if (quizzes.length > 1) {
      throw new Error(`Multiple quizzes found with ID: ${quizId}`)
    }

    return quizzes[0]
  }

  async loadDomainsFromQuiz(quiz) {
    try {
      // Handle null, undefined, or empty domains field
      if (!quiz.domains) {
        console.warn(`Quiz ${quiz.id} has no domains field`)
        return []
      }

      let domainIds = []
      
      // Check if domains is already an array
      if (Array.isArray(quiz.domains)) {
        domainIds = quiz.domains
      } 
      // Check if domains is a string
      else if (typeof quiz.domains === 'string') {
        // If it's an empty string, return empty array
        if (quiz.domains.trim() === '') {
          console.warn(`Quiz ${quiz.id} has empty domains field`)
          return []
        }

        // Try to parse as JSON first
        try {
          domainIds = JSON.parse(quiz.domains)
        } catch (parseError) {
          console.warn(`Failed to parse domains JSON for quiz ${quiz.id}:`, parseError)
          
          // Check if it's a simple comma-separated list
          if (quiz.domains.includes(',')) {
            domainIds = quiz.domains.split(',').map(id => id.trim()).filter(Boolean)
          } else {
            // Single domain ID
            domainIds = [quiz.domains.trim()]
          }
        }
      }
      // Handle other data types 
      else {
        console.warn(`Quiz ${quiz.id} has unexpected domains type:`, typeof quiz.domains, quiz.domains)
        return []
      }
      
      if (!Array.isArray(domainIds) || domainIds.length === 0) {
        console.warn(`Quiz ${quiz.id} has no valid domain IDs`)
        return []
      }


      const { data: domains, error } = await supabase
        .from('domains')
        .select('*')
        .in('id', domainIds)

      if (error) {
        throw new Error(`Failed to fetch domains: ${error.message}`)
      }

      return domains || []
    } catch (e) {
      console.warn(`Failed to load domains for quiz ${quiz.id}:`, e)
      return []
    }
  }

  async loadQuestionsForQuiz(quiz) {
    try {
      // Handle null, undefined, or empty domains field
      if (!quiz.domains) {
        console.warn(`Quiz ${quiz.id} has no domains field`)
        return []
      }

      let domainIds = []
      
      // Check if domains is already an array
      if (Array.isArray(quiz.domains)) {
        domainIds = quiz.domains
      } 
      // Check if domains is a string
      else if (typeof quiz.domains === 'string') {
        // If it's an empty string, return empty array
        if (quiz.domains.trim() === '') {
          console.warn(`Quiz ${quiz.id} has empty domains field`)
          return []
        }

        // Try to parse as JSON first
        try {
          domainIds = JSON.parse(quiz.domains)
        } catch (parseError) {
          console.warn(`Failed to parse domains JSON for quiz ${quiz.id}:`, parseError)
          
          // Check if it's a simple comma-separated list
          if (quiz.domains.includes(',')) {
            domainIds = quiz.domains.split(',').map(id => id.trim()).filter(Boolean)
          } else {
            // Single domain ID
            domainIds = [quiz.domains.trim()]
          }
        }
      }
      // Handle other data types 
      else {
        console.warn(`Quiz ${quiz.id} has unexpected domains type:`, typeof quiz.domains, quiz.domains)
        return []
      }
      
      if (!Array.isArray(domainIds) || domainIds.length === 0) {
        console.warn(`Quiz ${quiz.id} has no valid domain IDs`)
        return []
      }


      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .in('domain_id', domainIds)

      if (error) {
        throw new Error(`Failed to fetch questions: ${error.message}`)
      }

      // Update questions to reference the quiz
      const questionsWithQuizId = (questions || []).map(q => ({
        ...q,
        quiz_id: quiz.id
      }))


      return questionsWithQuizId
    } catch (e) {
      console.warn(`Failed to load questions for quiz ${quiz.id}:`, e)
      return []
    }
  }

  async syncLearningLevelNames() {
    const { data, error } = await supabase
      .from('quiz_learning_level_names')
      .select('*')

    if (error) {
      throw new Error(`Failed to fetch quiz_learning_level_names: ${error.message}`)
    }

    if (data && data.length > 0) {
      await database.saveLevelNames(data)
    }
  }

  async generateAndSaveLevels(quizId, questions) {
    const questionCount = questions.length

    if (questionCount === 0) {
      throw new Error('No questions found for this quiz. Please add questions before generating levels.')
    }
    
    if (questionCount < 3) {
      throw new Error(`Insufficient questions for level generation. Found ${questionCount} questions, but minimum 3 required for basic level structure.`)
    }

    const levels = await this.generateLevels(questionCount)
    const now = new Date().toISOString()

    // Map generated levels to local persistence shape
    const rows = levels.map((lvl) => ({
      id: `qll_${quizId}_${lvl.index}`,
      quiz_id: quizId,
      index_position: lvl.index,
      name: lvl.name,
      type: lvl.type,
      is_unlocked: lvl.isUnlocked ? 1 : 0,
      is_completed: lvl.isCompleted ? 1 : 0,
      created_at: now,
      updated_at: now,
    }))

    // Save levels to database (need to add this method to DatabaseManager)
    for (const level of rows) {
      await database.db.quiz_learning_levels.put(level)
    }
  }

  async generateLevels(questionCount) {
    if (questionCount < 3) {
      throw new Error(`Insufficient questions for level generation. Found ${questionCount} questions, but minimum 3 required for basic level structure.`)
    }
    
    if (questionCount < 5) {
      console.warn(`Limited question pool (${questionCount} questions). Only normal levels will be generated.`)
    } else if (questionCount < 15) {
      console.warn(`Small question pool (${questionCount} questions). Mini-boss levels will not be available.`)
    } else if (questionCount < 25) {
      console.warn(`Medium question pool (${questionCount} questions). Boss levels will not be available.`)
    }

    const levelStructure = this.calculateLevelStructure(questionCount)
    const levelNames = await this.loadLevelNames()

    const levels = []
    let questionIndex = 0
    const levelTypeCounts = {
      [LevelType.NORMAL]: 0,
      [LevelType.MINI_BOSS]: 0,
      [LevelType.BOSS]: 0
    }

    for (let i = 0; i < levelStructure.length; i++) {
      const { type, count } = levelStructure[i]
      const config = LEVEL_CONFIGS[type]

      let questionsForLevel
      
      if (type === LevelType.NORMAL) {
        // Normal levels consume questions from the pool
        questionsForLevel = Math.min(count, questionCount - questionIndex)
      } else {
        // Special levels (mini-boss, boss) are review-based and don't consume from pool
        questionsForLevel = count
      }

      const name = this.selectLevelName(levelNames, type, levelTypeCounts[type])
      levelTypeCounts[type]++

      const prerequisiteLevels = config.requiresPreviousCompletion ?
        this.findPrerequisites(levels, type) : []

      levels.push({
        index: i,
        name,
        type,
        isUnlocked: i === 0, // First level is always unlocked
        isCompleted: false,
        questionCount: questionsForLevel,
        estimatedDifficulty: config.difficultyMultiplier,
        prerequisiteLevels
      })

      // Only normal levels consume questions from the pool
      if (type === LevelType.NORMAL) {
        questionIndex += questionsForLevel
        
        // Break only if we've consumed all questions AND there are no more special levels to process
        if (questionIndex >= questionCount) {
          // Check if there are any remaining special levels (mini-boss, boss) to process
          const hasRemainingSpecialLevels = levelStructure.slice(i + 1).some(level => 
            level.type === LevelType.MINI_BOSS || level.type === LevelType.BOSS
          )
          
          if (!hasRemainingSpecialLevels) {
            break
          }
        }
      }
    }

    return levels
  }

  calculateLevelStructure(questionCount) {
    const structure = []

    const normalConfig = LEVEL_CONFIGS[LevelType.NORMAL]
    
    // Calculate questions per normal level using ratio
    const questionsPerNormalLevel = Math.ceil(questionCount * normalConfig.baseQuestionRatio)
    
    let questionsRemaining = questionCount
    let levelIndex = 0
    
    // Generate levels until all questions are consumed
    while (questionsRemaining > 0) {
      // Add normal level
      const questionsForThisLevel = Math.min(questionsPerNormalLevel, questionsRemaining)
      structure.push({ type: LevelType.NORMAL, count: questionsForThisLevel })
      questionsRemaining -= questionsForThisLevel
      levelIndex++
      
      // Check if we should add a mini-boss (every 2 normal levels, and we have enough total questions)
      if (levelIndex % normalConfig.frequency === 0 && questionCount >= 15) {
        structure.push({ type: LevelType.MINI_BOSS, count: 0 }) // 0 = calculated later during gameplay
      }
      
      // Check if we should add a boss (every 4 cycles of normal+mini-boss pattern)
      // This means after 8 normal levels (4 cycles of 2 normal + 1 mini-boss each)
      if (levelIndex % 8 === 0 && questionCount >= 100) {
        // Replace the last mini-boss with a boss if it exists
        if (structure.length > 0 && structure[structure.length - 1].type === LevelType.MINI_BOSS) {
          structure[structure.length - 1] = { type: LevelType.BOSS, count: 0 }
        } else {
          structure.push({ type: LevelType.BOSS, count: 0 })
        }
        
        // If we've consumed all questions, end here
        if (questionsRemaining === 0) {
          break
        }
      }
    }
    
    // If we ended without a boss but have enough questions, replace final mini-boss with boss
    if (questionCount >= 100 && structure.length > 1) {
      const lastLevel = structure[structure.length - 1]
      
      if (lastLevel.type === LevelType.MINI_BOSS) {
        structure[structure.length - 1] = { type: LevelType.BOSS, count: 0 }
      } else if (lastLevel.type === LevelType.NORMAL) {
        structure.push({ type: LevelType.BOSS, count: 0 })
      }
    }

    return structure
  }

  async loadLevelNames() {
    // Try to get from local database first, fallback to defaults
    try {
      const normalNames = await this.getLevelNamesByType(LevelType.NORMAL)
      const miniBossNames = await this.getLevelNamesByType(LevelType.MINI_BOSS)
      const bossNames = await this.getLevelNamesByType(LevelType.BOSS)

      return {
        [LevelType.NORMAL]: normalNames.length > 0 ? normalNames : [
          i18n.t("Forest Camp"), i18n.t("River Rapids"), i18n.t("Sky Peak"), i18n.t("Moonlit Meadow"), i18n.t("Secret Grove")
        ],
        [LevelType.MINI_BOSS]: miniBossNames.length > 0 ? miniBossNames : [
          i18n.t("Shadow Guardian"), i18n.t("Storm Sentinel"), i18n.t("Crystal Warden"), i18n.t("Fire Keeper"), i18n.t("Ice Monarch")
        ],
        [LevelType.BOSS]: bossNames.length > 0 ? bossNames : [
          i18n.t("Ancient Dragon"), i18n.t("Void Emperor"), i18n.t("Titan of Knowledge"), i18n.t("Master of Mysteries"), i18n.t("Final Challenge")
        ]
      }
    } catch (e) {
      console.warn('Failed to load level names from database, using defaults:', e)
      return {
        [LevelType.NORMAL]: [i18n.t("Forest Camp"), i18n.t("River Rapids"), i18n.t("Sky Peak"), i18n.t("Moonlit Meadow"), i18n.t("Secret Grove")],
        [LevelType.MINI_BOSS]: [i18n.t("Shadow Guardian"), i18n.t("Storm Sentinel"), i18n.t("Crystal Warden"), i18n.t("Fire Keeper"), i18n.t("Ice Monarch")],
        [LevelType.BOSS]: [i18n.t("Ancient Dragon"), i18n.t("Void Emperor"), i18n.t("Titan of Knowledge"), i18n.t("Master of Mysteries"), i18n.t("Final Challenge")]
      }
    }
  }

  async getLevelNamesByType(type) {
    try {
      const rows = await database.db.quiz_learning_level_names
        .where('type')
        .equals(type)
        .sortBy('created_at')
      return rows.map(r => r.name)
    } catch (e) {
      console.warn(`Failed to get level names for type ${type}:`, e)
      return []
    }
  }

  selectLevelName(levelNames, type, typeIndex) {
    const namesForType = levelNames[type]
    return namesForType[typeIndex % namesForType.length]
  }

  findPrerequisites(existingLevels, currentType) {
    if (currentType === LevelType.NORMAL) return []

    const prerequisites = []
    const lastNormalIndex = existingLevels.map((l, i) => l.type === LevelType.NORMAL ? i : -1)
      .filter(i => i !== -1)
      .pop()

    if (lastNormalIndex !== undefined) {
      prerequisites.push(lastNormalIndex)
    }

    if (currentType === LevelType.BOSS) {
      const lastMiniBossIndex = existingLevels.map((l, i) => l.type === LevelType.MINI_BOSS ? i : -1)
        .filter(i => i !== -1)
        .pop()
      if (lastMiniBossIndex !== undefined) {
        prerequisites.push(lastMiniBossIndex)
      }
    }

    return prerequisites
  }

  async checkAndDownloadClaimedQuizzes() {
    try {

      // 1. Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('User not authenticated')
      }


      // 2. Get all quiz codes claimed by this user from Supabase
      const { data: userQuizCodes, error: claimedError } = await supabase
        .from('user_quiz_codes')
        .select(`
          quiz_id,
          quiz_code_id,
          quiz_codes!inner(id, code)
        `)
        .eq('user_id', user.id)

      if (claimedError) {
        throw new Error(`Failed to fetch claimed quizzes: ${claimedError.message}`)
      }


      if (!userQuizCodes || userQuizCodes.length === 0) {
        return {
          success: true,
          downloadedCount: 0,
          message: i18n.t('No claimed quizzes found')
        }
      }

      // 3. Check which quizzes are not yet in local database
      const quizzesToDownload = []

      for (const userQuizCode of userQuizCodes) {
        const quizId = userQuizCode.quiz_id
        const existingQuiz = await database.checkQuizExists(quizId)

        if (!existingQuiz) {
          quizzesToDownload.push({
            quizId,
            code: userQuizCode.quiz_codes.code
          })
        }
      }


      if (quizzesToDownload.length === 0) {
        return {
          success: true,
          downloadedCount: 0,
          message: i18n.t('All claimed quizzes are already downloaded')
        }
      }

      // 4. Download each missing quiz using the existing claim logic
      let downloadedCount = 0
      const errors = []

      for (const { quizId, code } of quizzesToDownload) {
        try {

          // Load the quiz data
          const quiz = await this.loadQuiz(quizId)

          // Load domains referenced by the quiz
          const domains = await this.loadDomainsFromQuiz(quiz)

          // Load questions for this quiz
          const questions = await this.loadQuestionsForQuiz(quiz)

          // Save everything to local database
          // Save domains first (for foreign key relationships)
          for (const domain of domains) {
            await database.saveDomain(domain)
          }

          // Save the quiz
          await database.saveQuiz(quiz)

          // Save questions
          if (questions && questions.length > 0) {
            await database.saveQuestions(questions)
          }

          // Sync learning level names for local use (non-fatal if it fails)
          try {
            await this.syncLearningLevelNames()
          } catch (e) {
            console.warn('Failed to sync quiz_learning_level_names:', e)
          }

          // Generate and save learning levels (non-fatal if it fails)
          try {
            if (questions && questions.length > 0) {
              await this.generateAndSaveLevels(quiz.id, questions)
            } else {
              console.warn('Skipping level generation: no questions available for this quiz')
            }
          } catch (e) {
            console.warn('Failed to generate/save learning levels:', e)
          }

          // Save the code as verified (don't duplicate if it already exists)
          const existingCode = await database.checkCodeExists(code)
          if (!existingCode) {
            await database.saveCode(code)
          }

          downloadedCount++

        } catch (error) {
          console.error(`Failed to download quiz ${quizId}:`, error)
          errors.push(`Failed to download quiz with code ${code}: ${error.message}`)
        }
      }

      if (errors.length > 0 && downloadedCount === 0) {
        throw new Error(`Failed to download any quizzes. Errors: ${errors.join(', ')}`)
      }

      return {
        success: true,
        downloadedCount,
        errors: errors.length > 0 ? errors : null,
        message: downloadedCount > 0
          ? i18n.t('Successfully downloaded {{count}} quiz{{plural}}!', {
            count: downloadedCount,
            plural: downloadedCount !== 1 ? 'es' : ''
          })
          : i18n.t('No new quizzes were downloaded')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : i18n.t('An unknown error occurred')
      console.error('Error checking and downloading claimed quizzes:', error)

      return {
        success: false,
        error: errorMessage,
        downloadedCount: 0
      }
    }
  }

  async checkForUpdates() {
    try {
      // 1. Get all local quizzes
      const localQuizzes = await database.getQuizzes()

      if (!localQuizzes || localQuizzes.length === 0) {
        return {
          success: true,
          newDomainsCount: 0,
          newQuestionsCount: 0,
          message: i18n.t('No local quizzes to check for updates')
        }
      }

      let totalNewDomains = 0
      let totalNewQuestions = 0

      // 2. For each local quiz, check for new domains and questions
      for (const localQuiz of localQuizzes) {
        try {
          // Fetch fresh quiz data from Supabase
          const remoteQuiz = await this.loadQuiz(localQuiz.id)

          // Load remote domains
          const remoteDomains = await this.loadDomainsFromQuiz(remoteQuiz)

          // 3. Compare remote domains with local domains
          const localDomainIds = new Set(
            (await database.db.domains.toArray()).map(d => d.id)
          )

          const newDomains = remoteDomains.filter(d => !localDomainIds.has(d.id))

          if (newDomains.length > 0) {
            // Save new domains
            for (const domain of newDomains) {
              await database.saveDomain(domain)
            }
            totalNewDomains += newDomains.length
          }

          // 4. Load remote questions
          const remoteQuestions = await this.loadQuestionsForQuiz(remoteQuiz)

          // 5. Compare remote questions with local questions
          const localQuestionIds = new Set(
            (await database.db.questions.toArray()).map(q => q.id)
          )

          const newQuestions = remoteQuestions.filter(q => !localQuestionIds.has(q.id))

          if (newQuestions.length > 0) {
            // Save new questions
            await database.saveQuestions(newQuestions)
            totalNewQuestions += newQuestions.length
          }

        } catch (error) {
          console.error(`Failed to check updates for quiz ${localQuiz.id}:`, error)
          // Continue checking other quizzes even if one fails
        }
      }

      return {
        success: true,
        newDomainsCount: totalNewDomains,
        newQuestionsCount: totalNewQuestions,
        message: totalNewDomains > 0 || totalNewQuestions > 0
          ? i18n.t('Found {{domainCount}} new domain{{domainPlural}} and {{questionCount}} new question{{questionPlural}}', {
              domainCount: totalNewDomains,
              domainPlural: totalNewDomains !== 1 ? 's' : '',
              questionCount: totalNewQuestions,
              questionPlural: totalNewQuestions !== 1 ? 's' : ''
            })
          : i18n.t('No updates found. Everything is up to date!')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : i18n.t('An unknown error occurred')
      console.error('Error checking for updates:', error)

      return {
        success: false,
        error: errorMessage,
        newDomainsCount: 0,
        newQuestionsCount: 0
      }
    }
  }
}

export const quizClaimService = new QuizClaimService()