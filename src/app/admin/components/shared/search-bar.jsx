'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { useStore } from '@/store/useStore'

export function SearchBar({ domains, onSelectDomain }) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { setSearchQuery: setGlobalSearchQuery, searchQuery: globalSearchQuery } = useStore()

  useEffect(() => {
    if (searchQuery !== globalSearchQuery) {
      setGlobalSearchQuery(searchQuery)
    }
  }, [searchQuery, globalSearchQuery, setGlobalSearchQuery])

  const flattenDomains = (domains) => {
    const result = []
    
    const traverse = (domains, path = []) => {
      domains.forEach(domain => {
        const currentPath = [...path, domain.name]
        result.push({
          ...domain,
          breadcrumbPath: currentPath.join(' > ')
        })
        
        if (domain.children && domain.children.length > 0) {
          traverse(domain.children, currentPath)
        }
      })
    }
    
    traverse(domains)
    return result
  }

  const filteredDomains = flattenDomains(domains).filter(domain =>
    domain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (domain.description && domain.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelectDomain = (domain) => {
    onSelectDomain(domain)
    setIsOpen(false)
    setSearchQuery('')
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsOpen(false)
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          className="input input-bordered pl-10 pr-10"
          placeholder={t('searchDomains')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(e.target.value.length > 0)
          }}
          onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
        />
        {searchQuery && (
          <button
            className="btn btn-ghost btn-sm absolute right-1 top-1 h-8 w-8 p-0"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchQuery && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <div className="dropdown-content menu bg-base-100 rounded-box border shadow-lg max-h-[300px] overflow-y-auto z-[1] w-full p-2">
              {filteredDomains.length === 0 ? (
                <div className="px-3 py-2 text-center text-base-content/70">{t('noDomainsFound')}</div>
              ) : (
                <div>
                  {filteredDomains.slice(0, 10).map((domain) => {
                    const typedDomain = domain
                    return (
                      <li key={domain.id}>
                        <button
                          onClick={() => handleSelectDomain(domain)}
                          className="w-full text-left p-2 hover:bg-base-200 rounded cursor-pointer"
                        >
                        <div className="flex flex-col gap-1 w-full">
                          <span className="font-medium">{domain.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {typedDomain.breadcrumbPath}
                          </span>
                          {domain.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {domain.description}
                            </span>
                          )}
                        </div>
                        </button>
                      </li>
                    )
                  })}
                  {filteredDomains.length > 10 && (
                    <div className="px-3 py-2 text-xs text-base-content/70">
                      +{filteredDomains.length - 10} more results
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}