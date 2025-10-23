'use client'

import { Coins } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function CreditsCounter({ credits, isLoading }) {
  const { t } = useTranslation()

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
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <div className="text-3xl font-bold text-primary">{credits || 0}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
