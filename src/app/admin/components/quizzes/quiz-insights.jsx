'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts'
import {
  Target, Award, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, PlayCircle, RefreshCw, SkipForward, Eye, MousePointerClick
} from 'lucide-react'
import * as supabaseService from '@/services/supabaseService'

export function QuizInsights({ quiz, selected, idToName }) {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState(new Set([]))
  const [hoveredDotType, setHoveredDotType] = useState(null)
  const [insightsData, setInsightsData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  // Fetch quiz insights data
  useEffect(() => {
    async function loadInsightsData() {
      if (!quiz?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabaseService.fetchQuizInsightsData(quiz.id, selected)

        if (error) {
          console.error('Failed to fetch quiz insights:', error)
          setInsightsData(null)
        } else {
          setInsightsData(data)
        }
      } catch (error) {
        console.error('Failed to fetch quiz insights:', error)
        setInsightsData(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadInsightsData()
  }, [quiz?.id, selected])

  // Calculate statistics from real data
  const { totalQuestions, answeredQuestions, correctAnswers, accuracyRate, progressPercentage } = useMemo(() => {
    if (!insightsData) {
      return {
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        accuracyRate: 0,
        progressPercentage: 0
      }
    }

    const attemptQuestions = insightsData.attemptQuestions || []
    const total = insightsData.totalAvailableQuestions || 0
    const answered = attemptQuestions.filter(q => q.is_attempted).length
    const correct = attemptQuestions.filter(q => q.is_correct).length
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
    const progress = total > 0 ? Math.round((answered / total) * 100) : 0

    return {
      totalQuestions: total,
      answeredQuestions: answered,
      correctAnswers: correct,
      accuracyRate: accuracy,
      progressPercentage: progress
    }
  }, [insightsData])

  // Calculate domain-level performance from real data
  const allDomains = useMemo(() => {
    if (!insightsData || !insightsData.attemptQuestions || insightsData.attemptQuestions.length === 0) {
      return []
    }

    // Group questions by domain
    const domainStats = {}

    insightsData.attemptQuestions.forEach(aq => {
      const domainId = aq.questions?.domain_id
      if (!domainId) return

      if (!domainStats[domainId]) {
        domainStats[domainId] = {
          total: 0,
          attempted: 0,
          correct: 0
        }
      }

      domainStats[domainId].total += 1
      if (aq.is_attempted) {
        domainStats[domainId].attempted += 1
        if (aq.is_correct) {
          domainStats[domainId].correct += 1
        }
      }
    })

    // Convert to array and calculate accuracy for selected domains
    return selected.map(id => {
      const stats = domainStats[id] || { total: 0, attempted: 0, correct: 0 }
      const accuracy = stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0

      return {
        id,
        name: idToName?.get(id) || `Domain ${id}`,
        accuracy,
        questionsAttempted: stats.attempted,
        totalQuestions: stats.total
      }
    }).filter(d => d.totalQuestions > 0) // Only show domains with questions
  }, [insightsData, selected, idToName])

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">{t('Loading insights...')}</span>
        </div>
      </div>
    )
  }

  // Empty state - no questions available in selected domains
  if (totalQuestions === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Target className="w-12 h-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">{t('No questions in selected domains')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('Add questions to the selected domains to see quiz insights')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Progress Card */}
      <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
        <div className="relative p-10">
          <div className="relative z-10">
            {/* Card Title */}
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">{t('Quiz Composer')}</h2>
            </div>

            {/* Top Section */}
            <div className="flex items-start justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">
                  {answeredQuestions}<span className="text-gray-500">/{totalQuestions}</span>
                </h3>
                <p className="text-gray-700 text-sm font-medium">{t('Questions Conquered')}</p>
              </div>
            </div>

            {/* Visual Question Grid - The Innovation */}
            <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-md p-6 border border-purple-200">
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
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <MousePointerClick className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-900 font-semibold">
                        {t('Click to select question types')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-6 gap-4">
                      <button
                        onClick={() => toggleSelection('correct')}
                        className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all border-2 cursor-pointer ${
                          selectedTypes.has('correct')
                            ? 'bg-[#10b981] border-[#10b981] scale-105 text-white'
                            : 'bg-white border-gray-200 hover:border-[#10b981] hover:bg-green-50 text-gray-900'
                        }`}
                      >
                        <span className="text-xs font-medium">{t('Correct')}</span>
                        <span className="text-2xl font-bold">
                          {correctAnswers}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleSelection('wrong')}
                        className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all border-2 cursor-pointer ${
                          selectedTypes.has('wrong')
                            ? 'bg-[#f59e0b] border-[#f59e0b] scale-105 text-white'
                            : 'bg-white border-gray-200 hover:border-[#f59e0b] hover:bg-orange-50 text-gray-900'
                        }`}
                      >
                        <span className="text-xs font-medium">{t('Wrong')}</span>
                        <span className="text-2xl font-bold">
                          {answeredQuestions - correctAnswers}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleSelection('unanswered')}
                        className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 rounded-md transition-all border-2 cursor-pointer ${
                          selectedTypes.has('unanswered')
                            ? 'bg-[#8b5cf6] border-[#8b5cf6] scale-105 text-white'
                            : 'bg-white border-gray-200 hover:border-[#8b5cf6] hover:bg-purple-50 text-gray-900'
                        }`}
                      >
                        <span className="text-xs font-medium">{t('Not answered')}</span>
                        <span className="text-2xl font-bold">
                          {totalQuestions - answeredQuestions}
                        </span>
                      </button>
                    </div>

                    {/* Flowing Progress River - 100 dots always */}
                    <div className="relative h-24 rounded-md bg-gray-50 overflow-hidden group border border-gray-200">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="absolute w-full h-px bg-gray-300" style={{ top: `${(i + 1) * 20}%` }} />
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
                              // Normal + Hover = show ring (preview selected)
                              // Selected + Hover = no ring (preview deselected)
                              if (isSelected && !isHovered) {
                                borderStyle = 'ring-2 ring-[#34d399]'
                              } else if (!isSelected && isHovered) {
                                borderStyle = 'ring-2 ring-[#34d399]'
                              }
                            } else if (dotState === 'wrong') {
                              dotColor = 'bg-[#f59e0b]'
                              if (isSelected && !isHovered) {
                                borderStyle = 'ring-2 ring-[#fbbf24]'
                              } else if (!isSelected && isHovered) {
                                borderStyle = 'ring-2 ring-[#fbbf24]'
                              }
                            } else {
                              dotColor = 'bg-[#8b5cf6]'
                              if (isSelected && !isHovered) {
                                borderStyle = 'ring-2 ring-[#a78bfa]'
                              } else if (!isSelected && isHovered) {
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
                                    ? 'scale-110'
                                    : ''
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

                    </div>

                  </>
                )
              })()}
            </div>

            {/* CTA */}
            {(() => {
              let selectedCount = 0
              if (selectedTypes.has('correct')) selectedCount += correctAnswers
              if (selectedTypes.has('wrong')) selectedCount += (answeredQuestions - correctAnswers)
              if (selectedTypes.has('unanswered')) selectedCount += (totalQuestions - answeredQuestions)

              const hasSelection = selectedCount > 0

              return (
                <div className="space-y-2">
                  {!hasSelection && (
                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 border border-purple-300 rounded-md">
                      <AlertCircle className="w-4 h-4 text-purple-700" />
                      <span className="text-xs text-purple-700 font-medium">
                        {t('Select question types above to start')}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-4 py-3 rounded-md transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                        hasSelection
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50'
                      }`}
                      title={!hasSelection ? t('Select question types above to start') : ''}
                    >
                      <Target className="w-4 h-4" />
                      <span>
                        {t('Challenge')} ({selectedCount})
                      </span>
                    </button>
                    <button
                      className={`flex-1 px-4 py-3 rounded-md transition-all flex items-center justify-center gap-2 font-semibold text-sm ${
                        hasSelection
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
                      }`}
                      title={!hasSelection ? t('Select question types above to start') : ''}
                    >
                      <Eye className="w-4 h-4" />
                      <span>
                        {t('Review')} ({selectedCount})
                      </span>
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Performance Overview Radar */}
      {allDomains.length > 0 ? (
        <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200">
          <div className="relative p-10">
            <div className="relative z-10">
              {/* Card Title */}
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">{t('Focus & Strengths')}</h2>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mb-8">
                <button
                  className="flex-1 px-4 py-3 rounded-md transition-all flex items-center justify-center gap-2 font-semibold text-sm bg-orange-600 text-white hover:bg-orange-700"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{t('Practice Weak Areas')}</span>
                </button>
                <button
                  className="flex-1 px-4 py-3 rounded-md transition-all flex items-center justify-center gap-2 font-semibold text-sm bg-green-600 text-white hover:bg-green-700"
                >
                  <Award className="w-4 h-4" />
                  <span>{t('Review Strengths')}</span>
                </button>
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

                <div className="space-y-4 bg-white/80 backdrop-blur-sm rounded-md p-6 border border-purple-200">
                  {weakDomains.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold text-sm text-gray-900">{t('Focus Areas')}</h4>
                      </div>
                      <div className="space-y-2">
                        {weakDomains.map((domain) => (
                          <div key={domain.id} className="flex items-center justify-between text-sm p-2 rounded bg-orange-50">
                            <span className="truncate flex-1 text-gray-900">{domain.name}</span>
                            <span className="font-semibold ml-2 text-orange-600">
                              {domain.accuracy}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {strongDomains.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold text-sm text-gray-900">{t('Strengths')}</h4>
                      </div>
                      <div className="space-y-2">
                        {strongDomains.map((domain) => (
                          <div key={domain.id} className="flex items-center justify-between text-sm p-2 rounded bg-green-50">
                            <span className="truncate flex-1 text-gray-900">{domain.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-green-600">
                                {domain.accuracy}%
                              </span>
                              <Award className="h-4 w-4 text-green-600" />
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
        </div>
      ) : null}
    </div>
  )
}
