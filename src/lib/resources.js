import { supabase } from './supabase'

export async function uploadResource(
  file,
  domainId,
  name,
  description
) {
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User must be authenticated to upload resources')
  }

  // Upload file to Supabase storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${domainId}_${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('resources')
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('resources')
    .getPublicUrl(filePath);

  // Create resource record
  const { data, error } = await supabase
    .from('resources')
    .insert({
      domain_id: domainId,
      author_id: user.id,
      name,
      description: description || null,
      file_path: filePath,
      url: publicUrl,
      mime_type: file.type
    })
    .select()
    .single()

  if (error) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('resources').remove([filePath])
    throw new Error(`Failed to create resource record: ${error.message}`)
  }

  return data
}

export async function deleteResource(resourceId) {
  // Get resource details first
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('file_path')
    .eq('id', resourceId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch resource: ${fetchError.message}`)
  }

  // Delete from storage
  if (resource.file_path) {
    const { error: storageError } = await supabase.storage
      .from('resources')
      .remove([resource.file_path])

    if (storageError) {
      console.warn('Failed to delete file from storage:', storageError.message)
    }
  }

  // Delete from database
  const { error } = await supabase
    .from('resources')
    .delete()
    .eq('id', resourceId)

  if (error) {
    throw new Error(`Failed to delete resource: ${error.message}`)
  }
}

export async function updateResource(
  resourceId,
  updates
) {
  const { data, error } = await supabase
    .from('resources')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', resourceId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update resource: ${error.message}`)
  }

  return data
}

export async function checkResourceStatus(resourceId) {
  const { data, error } = await supabase
    .from('resources')
    .select('id, name, status, mime_type, created_at, updated_at, domain_id, author_id, description, file_path, url')
    .eq('id', resourceId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch resource status: ${error.message}`)
  }

  return data
}