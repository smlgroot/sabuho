'use client'

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as supabaseService from '@/services/supabaseService'

export const CreditsCounter = forwardRef(({ onCreditsUpdate }, ref) => {
  const { t } = useTranslation()
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)

  const loadUserCredits = async () => {
    setIsLoadingCredits(true)
    try {
      const { user } = await supabaseService.getCurrentUser()
      const { data: credits, error } = await supabaseService.getUserCredits(user.id)
      if (error) throw error
      const creditsValue = credits?.credits || 0
      setUserCredits(creditsValue)
      if (onCreditsUpdate) {
        onCreditsUpdate(creditsValue)
      }
    } catch (error) {
      console.error('Failed to load user credits:', error)
      setUserCredits(0)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  useEffect(() => {
    loadUserCredits()
  }, [])

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refresh: loadUserCredits
  }))

  return (
    <div className="card bg-white hover:bg-primary/10 transition-colors cursor-pointer">
      <div className="card-body p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">{t("Credits")}</h3>
          </div>
          <div className="text-right">
            {isLoadingCredits ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <div className="text-3xl font-bold text-primary">{userCredits}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
