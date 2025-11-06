import * as supabaseService from './supabaseService'

/**
 * Updates or creates a user profile with last_active_at timestamp
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function upsertUserProfile(userId) {
  try {
    const { data, error } = await supabaseService.upsertUserProfile(userId)

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Gets user profile by user ID
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabaseService.getUserProfile(userId)

    if (error) {
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}