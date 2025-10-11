'use client'

import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Target, Award, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, PlayCircle
} from 'lucide-react'

export function QuizInsights({ quiz, selected, idToName }) {
  const { t } = useTranslation()

  // Mock data - replace with real data from your backend
  const totalQuestions = 412
  const answeredQuestions = 289
  const correctAnswers = 237
  const accuracyRate = Math.round((correctAnswers / answeredQuestions) * 100)
  const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100)

  // Domains that need attention (weak areas)
  const weakDomains = selected.slice(0, 5).map((id, index) => ({
    id,
    name: idToName?.get(id) || `Domain ${id}`,
    accuracy: [45, 62, 58, 71, 68][index], // Mock data
    questionsAttempted: [12, 8, 15, 20, 10][index],
    totalQuestions: [50, 40, 45, 60, 35][index]
  })).sort((a, b) => a.accuracy - b.accuracy)

  // Strong domains (for positive reinforcement)
  const strongDomains = selected.slice(0, 3).map((id, index) => ({
    id,
    name: idToName?.get(id) || `Domain ${id}`,
    accuracy: [92, 88, 85][index],
    questionsAttempted: [25, 30, 22][index]
  }))

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#10b981' // green
    if (accuracy >= 60) return '#f59e0b' // orange
    return '#ef4444' // red
  }

  return (
    <div className="space-y-6">
      {/* Hero Progress Card */}
      <div className="card bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold text-base-content mb-2">
                {answeredQuestions}/{totalQuestions}
              </h2>
              <p className="text-base-content/70">{t('Questions Completed')}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-success">{accuracyRate}%</div>
              <p className="text-base-content/70 text-sm">{t('Accuracy')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-base-content/70">{t('Overall Progress')}</span>
              <span className="font-semibold">{progressPercentage}%</span>
            </div>
            <progress
              className="progress progress-primary w-full h-3"
              value={progressPercentage}
              max="100"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn btn-primary flex-1">
              <PlayCircle className="h-5 w-5" />
              {t('Continue Practice')}
            </button>
            <button className="btn btn-outline flex-1">
              <Target className="h-5 w-5" />
              {t('Review Mistakes')}
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Areas Needing Attention */}
        <div className="card bg-base-100 border border-warning/30 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold">{t('Focus Areas')}</h3>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              {t('These domains need more practice')}
            </p>

            {weakDomains.length > 0 ? (
              <div className="space-y-3">
                {weakDomains.map((domain, index) => (
                  <div key={domain.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-base-content/50 w-5">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {domain.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: getAccuracyColor(domain.accuracy) }}>
                          {domain.accuracy}%
                        </span>
                        <button className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-7">
                      <progress
                        className="progress w-full h-2"
                        value={domain.accuracy}
                        max="100"
                        style={{ '--progress-color': getAccuracyColor(domain.accuracy) }}
                      />
                      <span className="text-xs text-base-content/50 whitespace-nowrap">
                        {domain.questionsAttempted}/{domain.totalQuestions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <p className="text-sm">{t('Select domains to see focus areas')}</p>
              </div>
            )}

            {weakDomains.length > 0 && (
              <button className="btn btn-warning btn-block mt-4">
                {t('Practice Weak Areas')}
              </button>
            )}
          </div>
        </div>

        {/* Strong Performance */}
        <div className="card bg-base-100 border border-success/30 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="text-lg font-semibold">{t('Strengths')}</h3>
            </div>
            <p className="text-sm text-base-content/70 mb-4">
              {t("You're doing great in these areas!")}
            </p>

            {strongDomains.length > 0 ? (
              <div className="space-y-4">
                {strongDomains.map((domain, index) => (
                  <div key={domain.id} className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-success">
                        {domain.accuracy}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{domain.name}</p>
                      <p className="text-xs text-base-content/50">
                        {domain.questionsAttempted} {t('questions completed')}
                      </p>
                    </div>
                    <Award className="h-5 w-5 text-success flex-shrink-0" />
                  </div>
                ))}

                <div className="alert alert-success mt-4">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm">
                    {t('Keep it up! Consider moving to harder topics.')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                <p className="text-sm">{t('Complete more questions to see your strengths')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Domain Performance Chart */}
      {selected.length > 0 && (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('Performance Overview')}
              </h3>
              <div className="text-sm text-base-content/60">
                {t('Accuracy by domain')}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(250, weakDomains.length * 50)}>
              <BarChart
                data={weakDomains}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => [`${value}%`, 'Accuracy']}
                />
                <Bar
                  dataKey="accuracy"
                  radius={[0, 4, 4, 0]}
                  onClick={(data) => console.log('Navigate to domain:', data.id)}
                  cursor="pointer"
                >
                  {weakDomains.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getAccuracyColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-base-content/70">{t('Good')} (&gt;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-base-content/70">{t('Fair')} (60-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-error" />
                <span className="text-base-content/70">{t('Needs Work')} (&lt;60%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4 text-center">
            <div className="text-3xl font-bold text-primary">{totalQuestions - answeredQuestions}</div>
            <p className="text-xs text-base-content/60 mt-1">{t('Questions Left')}</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4 text-center">
            <div className="text-3xl font-bold text-success">{correctAnswers}</div>
            <p className="text-xs text-base-content/60 mt-1">{t('Correct Answers')}</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4 text-center">
            <div className="text-3xl font-bold text-error">{answeredQuestions - correctAnswers}</div>
            <p className="text-xs text-base-content/60 mt-1">{t('Incorrect')}</p>
          </div>
        </div>
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4 text-center">
            <div className="text-3xl font-bold text-secondary">{selected.length}</div>
            <p className="text-xs text-base-content/60 mt-1">{t('Active Domains')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
