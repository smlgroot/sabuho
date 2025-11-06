import * as supabaseService from '@/services/supabaseService'

export async function fetchDomains() {
  // First ensure we have a valid session
  const { session, error: sessionError } = await supabaseService.getCurrentSession()

  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to fetch domains')
  }

  const { data, error } = await supabaseService.fetchDomains(session.user.id)

  if (error) {
    throw new Error(`Failed to fetch domains: ${error.message}`)
  }

  return buildDomainTree(data || [])
}

export async function createDomain(domain) {
  const { session, error: sessionError } = await supabaseService.getCurrentSession()

  if (sessionError || !session?.user) {
    throw new Error('User must be authenticated to create domains')
  }

  const { data, error } = await supabaseService.createDomain(domain, session.user.id)

  if (error) {
    throw new Error(`Failed to create domain: ${error.message}`)
  }

  return data
}

export async function updateDomain(id, updates) {
  const { data, error } = await supabaseService.updateDomain(id, updates)

  if (error) {
    throw new Error(`Failed to update domain: ${error.message}`)
  }

  return data
}

export async function deleteDomain(id) {
  const { error } = await supabaseService.deleteDomain(id)

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