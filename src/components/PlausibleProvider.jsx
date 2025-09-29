import React, { createContext, useContext, useEffect } from 'react'
import Plausible from 'plausible-tracker'

const PlausibleContext = createContext({})

export const usePlausible = () => useContext(PlausibleContext)

export function PlausibleProvider({ children }) {
  const plausible = Plausible({
    domain: window.location.hostname,
    trackLocalhost: false,
    apiHost: 'https://plausible.io'
  })

  useEffect(() => {
    plausible.enableAutoPageviews()
  }, [plausible])

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