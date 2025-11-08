import { supabase } from '../lib/supabase'

/**
 * Resource Session service for handling document processing sessions
 * Used primarily in HomePage for anonymous document uploads and processing
 */

// ============================================================================
// RESOURCE SESSION OPERATIONS
// ============================================================================

export async function createResourceSession(sessionData) {
  const insertData = {
    name: sessionData.name,
    file_path: sessionData.file_path || null,
    url: sessionData.url || null,
    mime_type: sessionData.mime_type || null,
    status: sessionData.status || 'pending'
  };

  // Add resource_repository_id if provided
  if (sessionData.resource_repository_id) {
    insertData.resource_repository_id = sessionData.resource_repository_id;
  }

  const { data, error } = await supabase
    .from('resource_sessions')
    .insert(insertData)
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

/**
 * Fetch resource session by S3 file path (unique key)
 * The S3 key includes a UUID, making it unique per upload
 * @param {string} filePath - S3 key (e.g., "uploads/2024-01-15/uuid/document.pdf")
 * @returns {Promise<object>} - { data, error }
 */
export async function fetchResourceSessionByFilePath(filePath) {
  const { data, error } = await supabase
    .from('resource_sessions')
    .select('*')
    .eq('file_path', filePath)
    .maybeSingle()

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
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type (default: 'application/pdf')
 * @param {string} resourceRepositoryId - Resource repository ID (optional)
 * @returns {Promise<object>} - { uploadUrl, key, jobId, resource_repository_id }
 */
export async function getS3PresignedUrl(filename = 'document.pdf', contentType = 'application/pdf', resourceRepositoryId = null) {
  const lambdaUrl = import.meta.env.VITE_PRESIGN_URL_API

  if (!lambdaUrl) {
    throw new Error('VITE_PRESIGN_URL_API environment variable is not set')
  }

  const requestBody = {
    filename,
    contentType
  };

  // Include resource_repository_id if provided
  if (resourceRepositoryId) {
    requestBody.resource_repository_id = resourceRepositoryId;
  }

  const response = await fetch(lambdaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
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
 * @param {string} resourceRepositoryId - Resource repository ID (optional)
 * @returns {Promise<object>} - { key, jobId, error }
 */
export async function uploadFileToS3(file, resourceRepositoryId = null) {
  try {
    // Get presigned URL from Lambda with filename, content type, and repository ID
    const { uploadUrl, key, jobId } = await getS3PresignedUrl(file.name, file.type, resourceRepositoryId)

    // Calculate SHA256 checksum (currently disabled)
    // const checksum = await calculateSHA256(file)

    // Add repository ID as query param if provided
    let finalUploadUrl = uploadUrl;
    if (resourceRepositoryId) {
      const url = new URL(uploadUrl);
      url.searchParams.set('resource_repository_id', resourceRepositoryId);
      finalUploadUrl = url.toString();
    }

    // Upload to S3 using presigned URL
    const uploadResponse = await fetch(finalUploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
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

/**
 * Fetch questions for a resource session
 * @param {string} sessionId - Resource session ID
 * @returns {Promise<object>} - { data, error, total, sampleCount }
 */
export async function fetchResourceSessionQuestions(sessionId) {
  // Get sample questions (is_sample=false)
  const { data, error } = await supabase
    .from('resource_session_questions')
    .select('*')
    .eq('resource_session_id', sessionId)
    .eq('is_sample', false)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error, total: 0, sampleCount: 0 }
  }

  // Get total count of all questions
  const { count, error: countError } = await supabase
    .from('resource_session_questions')
    .select('*', { count: 'exact', head: true })
    .eq('resource_session_id', sessionId)

  return {
    data,
    error: null,
    total: count || 0,
    sampleCount: data?.length || 0
  }
}

// ============================================================================
// POLLING MECHANISM
// ============================================================================

/**
 * Get the highest progress status from status_history for display
 * Handles out-of-order updates by finding the max page number per stage
 * @param {array} statusHistory - Array of {status, timestamp} objects
 * @returns {string} - The most advanced status to display
 */
function getDisplayStatus(statusHistory) {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  // Track highest page number seen for each stage
  const stageProgress = {};

  statusHistory.forEach(entry => {
    const status = entry.status;
    const match = status.match(/^(.+?)_(\d+)_of_(\d+)$/);

    if (match) {
      const stage = match[1];
      const current = parseInt(match[2], 10);
      const total = parseInt(match[3], 10);

      if (!stageProgress[stage] || current > stageProgress[stage].current) {
        stageProgress[stage] = { stage, current, total };
      }
    }
  });

  // Get the latest entry to determine current stage
  const latestEntry = statusHistory[statusHistory.length - 1];
  const latestStatus = latestEntry.status;

  // If latest status has progress, return the highest for that stage
  const match = latestStatus.match(/^(.+?)_(\d+)_of_(\d+)$/);
  if (match) {
    const stage = match[1];
    const progress = stageProgress[stage];
    return `${progress.stage}_${progress.current}_of_${progress.total}`;
  }

  // Otherwise return the latest status as-is
  return latestStatus;
}

/**
 * Poll resource session status until completion or timeout
 * Can poll by either session ID or S3 file path
 * @param {object} identifier - Either { sessionId: "uuid" } or { filePath: "uploads/..." }
 * @param {object} options - Polling options
 * @param {number} options.intervalMs - Polling interval in milliseconds (default: 2000)
 * @param {number} options.timeoutMs - Maximum polling duration in milliseconds (default: 300000 = 5 minutes)
 * @param {number} options.maxWaitForRecord - Max wait time for record creation in ms (default: 60000 = 1 minute)
 * @param {function} options.onStatusChange - Callback fired when status changes
 * @returns {Promise<object>} - Final resource session data or error
 */
export async function pollResourceSessionStatus(identifier, options = {}) {
  const {
    intervalMs = 2000,
    timeoutMs = 300000, // 5 minutes default timeout
    maxWaitForRecord = 60000, // 1 minute to wait for backend to create record
    onStatusChange = null
  } = options

  const startTime = Date.now()
  let lastDisplayStatus = null
  let recordFound = false

  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeoutMs) {
          clearInterval(pollInterval)
          reject(new Error('Polling timeout: Processing took too long'))
          return
        }

        // Fetch current status using appropriate method
        let session, error
        if (identifier.sessionId) {
          const result = await fetchResourceSession(identifier.sessionId)
          session = result.data
          error = result.error
        } else if (identifier.filePath) {
          const result = await fetchResourceSessionByFilePath(identifier.filePath)
          session = result.data
          error = result.error
        } else {
          clearInterval(pollInterval)
          reject(new Error('Invalid identifier: must provide sessionId or filePath'))
          return
        }

        // If record doesn't exist yet, keep waiting (backend creates it asynchronously)
        if (!session && !error) {
          const elapsedTime = Date.now() - startTime
          if (!recordFound && elapsedTime < maxWaitForRecord) {
            return
          } else if (!recordFound) {
            clearInterval(pollInterval)
            reject(new Error('Resource session not created by backend within timeout'))
            return
          }
        }

        if (error) {
          clearInterval(pollInterval)
          reject(error)
          return
        }

        if (session) {
          recordFound = true
        }

        // Get display status from status_history (handles out-of-order updates)
        const displayStatus = session.status_history && session.status_history.length > 0
          ? getDisplayStatus(session.status_history)
          : session.status;

        // Call status change callback if display status changed
        if (session && displayStatus !== lastDisplayStatus && onStatusChange) {
          onStatusChange(displayStatus, session)
          lastDisplayStatus = displayStatus
        }

        // Check if processing is complete
        if (session && session.status === 'completed') {
          clearInterval(pollInterval)
          resolve(session)
          return
        }

        // Check if processing failed
        if (session && session.status === 'failed') {
          clearInterval(pollInterval)
          reject(new Error('Processing failed'))
          return
        }

        // Continue polling for other statuses: pending, processing, decoding, ai_processing
      } catch (err) {
        clearInterval(pollInterval)
        reject(err)
      }
    }, intervalMs)
  })
}

