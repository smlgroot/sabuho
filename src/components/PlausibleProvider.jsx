import React, { createContext, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Plausible from 'plausible-tracker'

const PlausibleContext = createContext({})

export const usePlausible = () => useContext(PlausibleContext)

export function PlausibleProvider({ children }) {
  const location = useLocation()
  
  const plausible = Plausible({
    domain: window.location.hostname,
    trackLocalhost: false,
    apiHost: 'https://plausible.io'
  })

  useEffect(() => {
    plausible.enableAutoPageviews()
  }, [plausible])

  // Track navigation events based on URL patterns
  useEffect(() => {
    const path = location.pathname
    const search = location.search
    
    // Determine the page section based on URL
    let pageSection = 'home'
    let pageType = 'page_view'
    
    if (path.includes('/admin')) {
      pageSection = 'admin'
      pageType = 'admin_page_view'
    } else if (path.includes('/auth')) {
      pageSection = 'auth'
      pageType = 'auth_page_view'
    } else if (path.includes('/quiz')) {
      pageSection = 'quiz'
      pageType = 'quiz_page_view'
      
      // Check if it's a review mode
      if (search.includes('readonly=true')) {
        pageType = 'quiz_review_view'
      }
    } else if (path.includes('/learning')) {
      pageSection = 'learning_hub'
      pageType = 'learning_page_view'
    }

    // Track the navigation event
    plausible.trackEvent('navigation', {
      props: {
        page_section: pageSection,
        page_type: pageType,
        full_path: path + search
      }
    })
  }, [location, plausible])

  const value = {
    plausible,
    trackEvent: plausible.trackEvent,
    trackPageview: plausible.trackPageview
  }

  return (
    <PlausibleContext.Provider value={value}>
      {children}
    </PlausibleContext.Provider>
  )
}