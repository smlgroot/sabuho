import React, { createContext, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import posthog from 'posthog-js'

const PostHogContext = createContext({})

export const usePostHog = () => useContext(PostHogContext)

// Initialize PostHog once outside the component
if (!posthog.__loaded) {
  posthog.init(
    import.meta.env.VITE_PUBLIC_POSTHOG_KEY || 'phc_placeholder',
    {
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      autocapture: false, // Disable autocapture to match Plausible's manual tracking
      capture_pageview: false, // We'll handle pageviews manually
      persistence: 'localStorage',
      // Enable localhost tracking if VITE_POSTHOG_TRACK_LOCALHOST is set to 'true'
      opt_out_capturing_by_default: false,
      loaded: (posthog) => {
        // Only opt out in development if not explicitly enabled for localhost
        if (import.meta.env.DEV && import.meta.env.VITE_POSTHOG_TRACK_LOCALHOST !== 'true') {
          posthog.opt_out_capturing()
        }
      }
    }
  )
}

export function PostHogProvider({ children }) {
  const location = useLocation()

  // Track navigation events based on URL patterns
  useEffect(() => {
    const path = location.pathname
    const search = location.search

    // Capture pageview
    posthog.capture('$pageview')

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
    posthog.capture('navigation', {
      page_section: pageSection,
      page_type: pageType,
      full_path: path + search
    })
  }, [location])

  const trackEvent = (eventName, options = {}) => {
    // PostHog uses a simpler API - properties are passed directly
    const properties = options.props || {}
    posthog.capture(eventName, properties)
  }

  const trackPageview = (options = {}) => {
    posthog.capture('$pageview', options)
  }

  const value = {
    posthog,
    trackEvent,
    trackPageview
  }

  return (
    <PostHogContext.Provider value={value}>
      {children}
    </PostHogContext.Provider>
  )
}
