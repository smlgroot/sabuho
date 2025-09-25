import { supabase } from '@/lib/supabase'

/**
 * Updates or creates a user profile with last_active_at timestamp
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function upsertUserProfile(userId) {
  try {
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
          last_active_at: now,
          updated_at: now
        })
        .eq('user_id', userId)
        .select()
    } else {
      // Create new profile with required display_name
      result = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          display_name: '', // Empty string for now - user can update later
          last_active_at: now,
          updated_at: now
        })
        .select()
    }

    const { data, error } = result

    if (error) {
      console.error('Error upserting user profile:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception in upsertUserProfile:', err)
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
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user profile:', error)
      return { data: null, error }
    }

    return { data, error: error?.code === 'PGRST116' ? null : error }
  } catch (err) {
    console.error('Exception in getUserProfile:', err)
    return { data: null, error: err }
  }
}