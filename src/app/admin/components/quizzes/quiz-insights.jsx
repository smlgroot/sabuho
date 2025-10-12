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
      <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAgMi4yMSAxLjc5IDQgNCA0czQtMS43OSA0LTQtMS43OS00LTQtNC00IDEuNzktNCA0em0wIDI0YzAgMi4yMSAxLjc5IDQgNCA0czQtMS43OSA0LTQtMS43OS00LTQtNC00IDEuNzktNCA0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>

        <div className="relative p-10">
          {/* Huge floating percentage */}
          <div className="absolute top-0 right-0 text-[12rem] font-black text-white/5 leading-none pointer-events-none select-none">
            {progressPercentage}%
          </div>

          <div className="relative z-10">
            {/* Top Section */}
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-1">
                <div className="badge badge-lg bg-white/20 backdrop-blur border-white/30 text-white gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {progressPercentage < 25 && t('Getting Started')}
                  {progressPercentage >= 25 && progressPercentage < 50 && t('Building Momentum')}
                  {progressPercentage >= 50 && progressPercentage < 75 && t('On Fire!')}
                  {progressPercentage >= 75 && t('Almost There!')}
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight">
                  {answeredQuestions}<span className="text-white/60">/{totalQuestions}</span>
                </h2>
                <p className="text-white/80 text-sm font-medium">{t('Questions Conquered')}</p>
              </div>
            </div>

            {/* Visual Question Grid - The Innovation */}
            <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              {(() => {
                // Adaptive scaling: determine how many questions each dot represents
                const maxDots = 100
                const dotsToShow = Math.min(totalQuestions, maxDots)
                const questionsPerDot = Math.ceil(totalQuestions / dotsToShow)
                const correctPerDot = correctAnswers / answeredQuestions // Ratio

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Correct')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-warning"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Wrong')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Not answered')}</span>
                        </div>
                      </div>
                      {questionsPerDot > 1 && (
                        <span className="text-xs text-white/50 font-medium">
                          {t('Each dot')} ≈ {questionsPerDot} {t('questions')}
                        </span>
                      )}
                    </div>

                    {/* Flowing Progress River */}
                    <div className="relative h-24 rounded-xl bg-white/5 overflow-hidden">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="absolute w-full h-px bg-white/30" style={{ top: `${(i + 1) * 20}%` }} />
                        ))}
                      </div>

                      {/* The flowing dots */}
                      <div className="absolute inset-0 flex items-center px-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from({ length: dotsToShow }).map((_, i) => {
                            const questionStart = i * questionsPerDot
                            const questionEnd = Math.min((i + 1) * questionsPerDot, totalQuestions)
                            const isInAnsweredRange = questionEnd <= answeredQuestions
                            const isPartiallyAnswered = questionStart < answeredQuestions && questionEnd > answeredQuestions

                            // For each dot, calculate if it represents mostly correct or wrong answers
                            let dotState = 'unanswered'
                            if (isInAnsweredRange) {
                              const avgCorrectness = Math.random() // Mock: replace with actual calculation
                              dotState = avgCorrectness > (correctPerDot - 0.2) ? 'correct' : 'wrong'
                            } else if (isPartiallyAnswered) {
                              dotState = 'partial'
                            }

                            // Determine size based on grouping
                            const dotSize = questionsPerDot === 1 ? 'w-2 h-2' : questionsPerDot < 5 ? 'w-2.5 h-2.5' : questionsPerDot < 10 ? 'w-3 h-3' : 'w-3.5 h-3.5'

                            return (
                              <div
                                key={i}
                                className={`${dotSize} rounded-full transition-all duration-500 ${
                                  dotState === 'correct'
                                    ? 'bg-success shadow-lg shadow-success/50 animate-pulse'
                                    : dotState === 'wrong'
                                    ? 'bg-warning shadow-lg shadow-warning/50'
                                    : dotState === 'partial'
                                    ? 'bg-info shadow-lg shadow-info/50'
                                    : 'bg-white/20 hover:bg-white/30'
                                }`}
                                style={{
                                  transitionDelay: `${i * 10}ms`,
                                  animationDelay: `${i * 50}ms`,
                                  animationDuration: '2s'
                                }}
                                title={`Questions ${questionStart + 1}-${questionEnd}`}
                              />
                            )
                          })}
                        </div>
                      </div>

                      {/* Progress overlay wave effect */}
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-success/20 via-success/10 to-transparent pointer-events-none transition-all duration-1000"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">{progressPercentage}%</div>
                <div className="text-sm text-white/70">{t('Complete')}</div>
              </div>
              <div className="bg-success/20 backdrop-blur-sm rounded-xl p-4 border border-success/30">
                <div className="flex items-center gap-2 text-3xl font-bold text-white mb-1">
                  <CheckCircle2 className="w-6 h-6" />
                  {accuracyRate}%
                </div>
                <div className="text-sm text-white/70">{t('Accuracy')}</div>
              </div>
            </div>

            {/* CTA */}
            <button className="btn btn-lg w-full bg-white text-purple-600 hover:bg-white/90 border-none shadow-xl hover:shadow-2xl hover:scale-105 transition-all gap-2">
              <PlayCircle className="w-6 h-6" />
              <span className="font-bold">{t('Continue Your Journey')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
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
