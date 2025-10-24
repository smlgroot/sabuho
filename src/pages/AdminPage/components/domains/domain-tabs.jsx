'use client'

import { HelpCircle, FileText, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function DomainTabs({ activeTab, onTabChange, questionsCount, resourcesCount, codesCount }) {
  const { t } = useTranslation()
  return (
    <div className="mx-6 mb-0 bg-[#f6f8fc]"
    style={{ borderBottom: '1px solid oklch(80% 0.05 277.023)' }}
    >
      <div className="flex gap-0">
        <button
          className={`
            flex items-center gap-2 px-6 py-3 font-medium transition-colors
            -mb-[2px] mr-2 rounded-t-md cursor-pointer
            ${activeTab === 'questions'
              ? 'text-primary border-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          style={{ fontSize: '12.25px' }}
          onClick={() => onTabChange('questions')}
        >
          <HelpCircle className="h-4 w-4" />
          <span>{t('Questions')}</span>
          {questionsCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-base-200 text-base-content">
              {questionsCount}
            </span>
          )}
        </button>
        <button
          className={`
            flex items-center gap-2 px-6 py-3 font-medium transition-colors
            -mb-[2px] mr-2 rounded-t-md cursor-pointer
            ${activeTab === 'resources'
              ? 'text-primary border-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          style={{ fontSize: '12.25px' }}
          onClick={() => onTabChange('resources')}
        >
          <FileText className="h-4 w-4" />
          <span>{t('Resources')}</span>
          {resourcesCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-base-200 text-base-content">
              {resourcesCount}
            </span>
          )}
        </button>
        <button
          className={`
            flex items-center gap-2 px-6 py-3 font-medium transition-colors
            -mb-[2px] rounded-t-md cursor-pointer
            ${activeTab === 'codes'
              ? 'text-primary border-primary bg-primary/10'
              : 'text-base-content border-transparent hover:bg-primary/10 hover:text-primary'
            }
          `}
          style={{ fontSize: '12.25px' }}
          onClick={() => onTabChange('codes')}
        >
          <Ticket className="h-4 w-4" />
          <span>{t('Codes')}</span>
          {codesCount > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-base-200 text-base-content">
              {codesCount}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}