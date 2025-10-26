import { supabase } from '../lib/supabase'

/**
 * Resource Session service for handling document processing sessions
 * Used primarily in HomePage for anonymous document uploads and processing
 */

// ============================================================================
// RESOURCE SESSION OPERATIONS
// ============================================================================

export async function createResourceSession(sessionData) {
  const { data, error } = await supabase
    .from('resource_sessions')
    .insert({
      name: sessionData.name,
      file_path: sessionData.file_path || null,
      url: sessionData.url || null,
      mime_type: sessionData.mime_type || null,
      status: sessionData.status || 'pending'
    })
    .select()
    .single()

  return { data, error }
}

export async function fetchResourceSession(sessionId) {
  const { data, error } = await supabase
    .from('resource_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  return { data, error }
}

export async function updateResourceSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('resource_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single()

  return { data, error }
}

/**
 * Get presigned URL from AWS Lambda for S3 upload
 * @returns {Promise<object>} - { uploadUrl, key, jobId }
 */
export async function getS3PresignedUrl() {
  const lambdaUrl = 'https://nadlzhoqp0.execute-api.us-east-1.amazonaws.com/dev/presign-url'

  const response = await fetch(lambdaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get presigned URL: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result
}

/**
 * Calculate SHA256 checksum of file
 * @param {File} file - File to calculate checksum for
 * @returns {Promise<string>} - Base64 encoded SHA256 checksum
 */
async function calculateSHA256(file) {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  return hashBase64
}

/**
 * Upload file to S3 using presigned URL
 * @param {File} file - File to upload
 * @returns {Promise<object>} - { key, jobId, error }
 */
export async function uploadFileToS3(file) {
  try {
    // Get presigned URL from Lambda
    const { uploadUrl, key, jobId } = await getS3PresignedUrl()

    // Calculate SHA256 checksum
    // const checksum = await calculateSHA256(file)

    // Upload to S3 with checksum
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
        // 'x-amz-checksum-sha256': checksum
      },
      body: file
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(`S3 upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    return { key, jobId, error: null }
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    return { key: null, jobId: null, error }
  }
}

export async function uploadResourceSessionFile(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  // Use a special 'temp' folder for anonymous uploads
  const filePath = `temp/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('resources-files')
    .upload(filePath, file)

  if (uploadError) {
    return { filePath: null, publicUrl: null, error: uploadError }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('resources-files')
    .getPublicUrl(filePath)

  return { filePath, publicUrl, error: null }
}

export async function deleteResourceSessionFile(filePath) {
  const { error } = await supabase.storage
    .from('resources-files')
    .remove([filePath])

  return { error }
}

// ============================================================================
// RESOURCE SESSION DOMAINS OPERATIONS
// ============================================================================

export async function fetchResourceSessionDomains(sessionId) {
  const { data, error } = await supabase
    .from('resource_session_domains')
    .select('*')
    .eq('resource_session_id', sessionId)
    .order('page_range_start', { ascending: true })

  return { data, error }
}

// ============================================================================
// POLLING MECHANISM
// ============================================================================

/**
 * Poll resource session status until completion or timeout
 * @param {string} sessionId - Resource session ID to poll
 * @param {object} options - Polling options
 * @param {number} options.intervalMs - Polling interval in milliseconds (default: 2000)
 * @param {number} options.timeoutMs - Maximum polling duration in milliseconds (default: 300000 = 5 minutes)
 * @param {function} options.onStatusChange - Callback fired when status changes
 * @returns {Promise<object>} - Final resource session data or error
 */
export async function pollResourceSessionStatus(sessionId, options = {}) {
  const {
    intervalMs = 2000,
    timeoutMs = 300000, // 5 minutes default timeout
    onStatusChange = null
  } = options

  const startTime = Date.now()
  let lastStatus = null

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(pollInterval)
          reject(new Error('Polling timeout: Processing took too long'))
          return
        }

        // Fetch current status
        const { data: session, error } = await fetchResourceSession(sessionId)

        if (error) {
          clearInterval(pollInterval)
          reject(error)
          return
        }

        // Call status change callback if status changed
        if (session.status !== lastStatus && onStatusChange) {
          onStatusChange(session.status, session)
          lastStatus = session.status
        }

        // Check if processing is complete
        if (session.status === 'completed') {
          clearInterval(pollInterval)
          resolve(session)
          return
        }

        // Check if processing failed
        if (session.status === 'failed') {
          clearInterval(pollInterval)
          reject(new Error('Processing failed'))
          return
        }

        // Continue polling for other statuses: pending, uploading, decoding, ai_processing
      } catch (err) {
        clearInterval(pollInterval)
        reject(err)
      }
    }, intervalMs)
  })
}

/**
 * Start processing a resource session via Heroku service
 * @param {string} sessionId - Resource session ID
 * @returns {Promise<object>} - Response from Heroku service
 */
export async function startResourceSessionProcessing(sessionId) {
  const herokuServiceUrl = import.meta.env.VITE_HEROKU_SERVICE_URL

  if (!herokuServiceUrl) {
    throw new Error('VITE_HEROKU_SERVICE_URL environment variable is not set')
  }

  const response = await fetch(herokuServiceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resource_session_id: sessionId
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Heroku service error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  return result
}
