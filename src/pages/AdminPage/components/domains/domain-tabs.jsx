'use client'

import { HelpCircle, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DomainTabs({ activeTab, onTabChange, questionsCount, resourcesCount }) {
  const { t } = useTranslation()
  return (
    <div className="tabs tabs-box mb-6">
      <button
        className={`tab ${activeTab === 'questions' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('questions')}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        {t('Questions')}
        {questionsCount > 0 && (
          <span className="badge badge-secondary ml-2 text-xs px-2">
            {questionsCount}
          </span>
        )}
      </button>
      <button
        className={`tab ${activeTab === 'resources' ? 'tab-active' : ''}`}
        onClick={() => onTabChange('resources')}
      >
        <FileText className="h-4 w-4 mr-2" />
        {t('Resources')}
        {resourcesCount > 0 && (
          <span className="badge badge-secondary ml-2 text-xs px-2">
            {resourcesCount}
          </span>
        )}
      </button>
    </div>
  )
}