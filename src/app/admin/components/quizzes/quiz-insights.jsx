'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts'
import {
  Target, Award, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, PlayCircle, RefreshCw, SkipForward, Eye
} from 'lucide-react'

export function QuizInsights({ quiz, selected, idToName }) {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState(new Set(['correct', 'wrong', 'unanswered']))
  const [hoveredDotType, setHoveredDotType] = useState(null)

  const toggleSelection = (type) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

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
                // ALWAYS show 100 dots - each represents 1% of the quiz
                const TOTAL_DOTS = 100
                const accuracyRate = answeredQuestions > 0 ? correctAnswers / answeredQuestions : 0

                // Calculate sections
                const correctPercentage = (correctAnswers / totalQuestions) * 100
                const wrongPercentage = ((answeredQuestions - correctAnswers) / totalQuestions) * 100

                const correctDots = Math.round(correctPercentage)
                const wrongDots = Math.round(wrongPercentage)

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Correct')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Wrong')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></div>
                          <span className="text-xs text-white/70 font-medium">{t('Not answered')}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/50 font-medium">
                        {t('Click dots to toggle selection')}
                      </span>
                    </div>

                    {/* Flowing Progress River - 100 dots always */}
                    <div className="relative h-24 rounded-xl bg-white/5 overflow-hidden group">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="absolute w-full h-px bg-white/30" style={{ top: `${(i + 1) * 20}%` }} />
                        ))}
                      </div>

                      {/* The flowing dots - always 100 */}
                      <div className="absolute inset-0 flex items-center px-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
                            const dotPercentage = i + 1 // 1-100%

                            // Determine dot state based on order: correct -> wrong -> unanswered
                            let dotState = 'unanswered'

                            if (i < correctDots) {
                              dotState = 'correct'
                            } else if (i < correctDots + wrongDots) {
                              dotState = 'wrong'
                            } else {
                              dotState = 'unanswered'
                            }

                            const isHovered = hoveredDotType === dotState
                            const isSelected = selectedTypes.has(dotState)

                            // Vivid colors for normal state, hover overrides selected
                            let dotColor = ''
                            let borderStyle = ''

                            if (dotState === 'correct') {
                              dotColor = 'bg-[#10b981]'
                              if (isHovered) {
                                borderStyle = 'ring-2 ring-white/70'
                              } else if (isSelected) {
                                borderStyle = 'ring-2 ring-[#34d399]'
                              }
                            } else if (dotState === 'wrong') {
                              dotColor = 'bg-[#f59e0b]'
                              if (isHovered) {
                                borderStyle = 'ring-2 ring-white/70'
                              } else if (isSelected) {
                                borderStyle = 'ring-2 ring-[#fbbf24]'
                              }
                            } else {
                              dotColor = 'bg-[#8b5cf6]'
                              if (isHovered) {
                                borderStyle = 'ring-2 ring-white/70'
                              } else if (isSelected) {
                                borderStyle = 'ring-2 ring-[#a78bfa]'
                              }
                            }

                            return (
                              <button
                                key={i}
                                onMouseEnter={() => setHoveredDotType(dotState)}
                                onMouseLeave={() => setHoveredDotType(null)}
                                onClick={() => toggleSelection(dotState)}
                                className={`w-2 h-2 rounded-full transition-all duration-200 cursor-pointer ${dotColor} ${borderStyle} ${
                                  dotState === 'correct'
                                    ? 'shadow-lg shadow-success/50 scale-110'
                                    : dotState === 'wrong'
                                    ? 'shadow-md shadow-warning/50'
                                    : 'shadow-md shadow-violet-500/50'
                                }`}
                                style={{
                                  transitionDelay: isHovered ? '0ms' : `${i * 5}ms`,
                                }}
                                title={`${dotPercentage}% - ${dotState}`}
                                aria-label={`${dotPercentage}% - ${dotState}`}
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

            {/* Dynamic Stats Based on Selection */}
            {(() => {
              // Always show all types, with 0 for unselected
              const allData = [
                {
                  type: 'correct',
                  count: selectedTypes.has('correct') ? correctAnswers : 0,
                  label: t('Correct'),
                  icon: CheckCircle2,
                  color: '#10b981',
                  isSelected: selectedTypes.has('correct')
                },
                {
                  type: 'wrong',
                  count: selectedTypes.has('wrong') ? (answeredQuestions - correctAnswers) : 0,
                  label: t('Wrong'),
                  icon: RefreshCw,
                  color: '#f59e0b',
                  isSelected: selectedTypes.has('wrong')
                },
                {
                  type: 'unanswered',
                  count: selectedTypes.has('unanswered') ? (totalQuestions - answeredQuestions) : 0,
                  label: t('Not Answered'),
                  icon: SkipForward,
                  color: '#8b5cf6',
                  isSelected: selectedTypes.has('unanswered')
                }
              ]

              // Determine color theme based on selection
              let bgColor = 'bg-white/10'
              let borderColor = 'border-white/20'

              if (selectedTypes.size === 1) {
                if (selectedTypes.has('correct')) {
                  bgColor = 'bg-success/20'
                  borderColor = 'border-success/30'
                } else if (selectedTypes.has('wrong')) {
                  bgColor = 'bg-warning/20'
                  borderColor = 'border-warning/30'
                } else if (selectedTypes.has('unanswered')) {
                  bgColor = 'bg-violet-500/20'
                  borderColor = 'border-violet-500/30'
                }
              }

              return (
                <div className={`mb-6 ${bgColor} backdrop-blur-sm rounded-xl p-4 border ${borderColor}`}>
                  <div className="flex flex-wrap gap-2">
                    {allData.map(item => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.type}
                          className={`flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5 ${!item.isSelected ? 'opacity-50' : ''}`}
                        >
                          <Icon className="w-4 h-4" style={{ color: item.color }} />
                          <span className="text-sm font-bold text-white">{item.count}</span>
                          <span className="text-xs text-white/50">{item.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* CTA */}
            {(() => {
              let selectedCount = 0
              if (selectedTypes.has('correct')) selectedCount += correctAnswers
              if (selectedTypes.has('wrong')) selectedCount += (answeredQuestions - correctAnswers)
              if (selectedTypes.has('unanswered')) selectedCount += (totalQuestions - answeredQuestions)

              const hasSelection = selectedCount > 0

              return (
                <button
                  className={`btn btn-lg w-full border-none shadow-xl transition-all gap-2 ${
                    hasSelection
                      ? 'bg-white text-purple-600 hover:bg-white/90 hover:shadow-2xl hover:scale-105'
                      : 'bg-white/20 text-white/40 cursor-not-allowed'
                  }`}
                  disabled={!hasSelection}
                >
                  <PlayCircle className="w-6 h-6" />
                  <span className="font-bold">
                    {hasSelection
                      ? `${t('Continue')} (${selectedCount} ${t('questions')})`
                      : t('Select questions to continue')
                    }
                  </span>
                  {hasSelection && <ArrowRight className="w-5 h-5" />}
                </button>
              )
            })()}
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
