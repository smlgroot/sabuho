import * as supabaseService from '@/services/supabaseService'

export async function uploadResource(file, domainId, name, description) {
  // Get authenticated user
  const { user } = await supabaseService.getCurrentUser()

  if (!user) {
    throw new Error('User must be authenticated to upload resources')
  }

  // Upload file to Supabase storage
  const { filePath, publicUrl, error: uploadError } = await supabaseService.uploadResourceFile(file, user.id, domainId)

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Create resource record
  const { data, error } = await supabaseService.createResource({
    domain_id: domainId,
    author_id: user.id,
    name,
    description: description || null,
    file_path: filePath,
    url: publicUrl,
    mime_type: file.type
  })

  if (error) {
    // Clean up uploaded file if database insert fails
    await supabaseService.deleteResourceFile(filePath)
    throw new Error(`Failed to create resource record: ${error.message}`)
  }

  return data
}

export async function deleteResource(resourceId) {
  const { error } = await supabaseService.deleteResource(resourceId)

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`)
  }
}

export async function updateResource(resourceId, updates) {
  const { data, error } = await supabaseService.updateResource(resourceId, updates)

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`)
  }

  return data
}

export async function checkResourceStatus(resourceId) {
  const { data, error } = await supabaseService.fetchResource(resourceId)

  if (error) {
    throw new Error(`Failed to fetch resource status: ${error.message}`)
  }

  return data
}