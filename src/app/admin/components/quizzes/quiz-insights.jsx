'use client'

import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
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

  // All domains with realistic mock performance data
  const allDomains = selected.map((id, index) => {
    // Realistic accuracy patterns: weak areas (45-65%), medium (65-78%), strong (80-92%)
    const patterns = [52, 88, 67, 48, 91, 73, 58, 85, 71, 64, 90, 55, 78, 83, 61, 75, 87, 69]
    const accuracy = patterns[index % patterns.length]

    // Questions attempted correlates loosely with accuracy (better students attempt more)
    const questionsAttempted = accuracy > 80
      ? Math.floor(20 + index * 3)
      : accuracy > 65
        ? Math.floor(12 + index * 2)
        : Math.floor(8 + index * 1.5)

    return {
      id,
      name: idToName?.get(id) || `Domain ${id}`,
      accuracy,
      questionsAttempted,
      totalQuestions: Math.floor(questionsAttempted * (100 / Math.max(accuracy, 20)))
    }
  })

  const weakDomains = allDomains.filter(d => d.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy)
  const strongDomains = allDomains.filter(d => d.accuracy >= 80).sort((a, b) => b.accuracy - a.accuracy)

  // Create complete radar shapes by using baseline values for non-matching domains
  const BASELINE = 70 // Middle ground between weak and strong
  const radarData = allDomains.map(domain => ({
    ...domain,
    focusArea: domain.accuracy < 70 ? domain.accuracy : BASELINE,
    strength: domain.accuracy >= 80 ? domain.accuracy : BASELINE
  }))

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return '#10b981' // green
    if (accuracy >= 60) return '#f59e0b' // orange
    return '#ef4444' // red
  }

  return (
    <div className="space-y-6">
      {/* Hero Progress Card */}
      <div className="hero bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl shadow-xl">
        <div className="hero-content text-center py-12">
          <div className="max-w-xl">
            {/* Circular Progress */}
            <div className="flex justify-center mb-6">
              <div className="radial-progress text-primary" style={{"--value": progressPercentage, "--size": "12rem", "--thickness": "1rem"}} role="progressbar">
                <div className="flex flex-col">
                  <span className="text-5xl font-bold">{progressPercentage}%</span>
                  <span className="text-sm text-base-content/60">{t('complete')}</span>
                </div>
              </div>
            </div>

            {/* Progress Text */}
            <h2 className="text-2xl font-bold mb-2">{t('Keep it up!')}</h2>
            <p className="text-base-content/70 mb-8">
              {answeredQuestions} {t('of')} {totalQuestions} {t('questions completed')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn btn-primary btn-lg gap-2">
                <PlayCircle className="w-5 h-5" />
                {t('Continue Practice')}
              </button>
              <button className="btn btn-outline btn-primary btn-lg gap-2">
                <Target className="w-5 h-5" />
                {t('Review Mistakes')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview Radar */}
      {allDomains.length > 0 ? (
        <div className="card bg-base-100 border border-primary/30 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('Performance Overview')}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={(value) => value.length > 25 ? value.slice(0, 25) + '...' : value}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Radar
                      name={t('Focus Areas')}
                      dataKey="focusArea"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                    <Radar
                      name={t('Strengths')}
                      dataKey="strength"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name, props) => {
                        if (!value) return null
                        return [
                          `${value}%`,
                          `${props.payload.questionsAttempted}/${props.payload.totalQuestions} questions`
                        ]
                      }}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                {weakDomains.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <h4 className="font-semibold text-sm">{t('Focus Areas')}</h4>
                    </div>
                    <div className="space-y-2">
                      {weakDomains.map((domain) => (
                        <div key={domain.id} className="flex items-center justify-between text-sm p-2 rounded bg-warning/5">
                          <span className="truncate flex-1">{domain.name}</span>
                          <span className="font-semibold ml-2 text-warning">
                            {domain.accuracy}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-warning btn-sm btn-block mt-3">
                      {t('Practice Weak Areas')}
                    </button>
                  </div>
                )}

                {strongDomains.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <h4 className="font-semibold text-sm">{t('Strengths')}</h4>
                    </div>
                    <div className="space-y-2">
                      {strongDomains.map((domain) => (
                        <div key={domain.id} className="flex items-center justify-between text-sm p-2 rounded bg-success/5">
                          <span className="truncate flex-1">{domain.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-success">
                              {domain.accuracy}%
                            </span>
                            <Award className="h-4 w-4 text-success" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
