import { supabase } from '../supabase'

export async function fetchDomains() {
  // First ensure we have a valid session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to fetch domains')
  }

  const { data, error } = await supabase
    .from('domains')
    .select(`
      *,
      resources:resources(*),
      questions:questions(*)
    `)
    .eq('author_id', session.user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Database error:', error)
    throw new Error(`Failed to fetch domains: ${error.message}`)
  }

  return buildDomainTree(data || [])
}

export async function createDomain(domain) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to create domains')
  }

  const insertData = {
    author_id: session.user.id,
    parent_id: domain.parent_id,
    name: domain.name,
    description: domain.description,
    thumbnail_url: domain.thumbnail_url,
    question_count: domain.question_count
  }

  const { data, error } = await supabase
    .from('domains')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Database error:', error)
    throw new Error(`Failed to create domain: ${error.message}`)
  }

  return data
}

export async function updateDomain(id, updates) {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('domains')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update domain: ${error.message}`)
  }

  return data
}

export async function deleteDomain(id) {
  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete domain: ${error.message}`)
  }
}

function buildDomainTree(domains) {
  const domainMap = new Map()
  const rootDomains = []

  domains.forEach(domain => {
    domainMap.set(domain.id, {
      ...domain,
      children: []
    })
  })

  domains.forEach(domain => {
    const domainWithChildren = domainMap.get(domain.id)
    
    if (domain.parent_id) {
      const parent = domainMap.get(domain.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(domainWithChildren)
      }
    } else {
      rootDomains.push(domainWithChildren)
    }
  })

  return rootDomains
}