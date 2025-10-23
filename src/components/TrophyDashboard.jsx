import { useState } from 'react'
import { Trophy, Target, Zap, Flame, Star, Crosshair, Gauge, Bolt, Undo2, Award, X } from 'lucide-react'
import { TROPHY_TYPES } from '@/services/trophyService'

// Icon mapping for trophy types
const TROPHY_ICONS = {
  'target': Target,
  'zap': Zap,
  'flame': Flame,
  'trophy': Trophy,
  'star': Star,
  'crosshair': Crosshair,
  'gauge': Gauge,
  'bolt': Bolt,
  'undo-2': Undo2,
  'award': Award
}

// Color mapping for trophy types
const TROPHY_COLORS = {
  'FIRST_BLOOD': { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30' },
  'HAT_TRICK': { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500/30' },
  'HOT_STREAK': { bg: 'bg-orange-500/20', text: 'text-orange-500', border: 'border-orange-500/30' },
  'UNSTOPPABLE': { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500/30' },
  'SHARP_SHOOTER': { bg: 'bg-cyan-500/20', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  'PERFECTIONIST': { bg: 'bg-yellow-500/20', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  'SPEED_DEMON': { bg: 'bg-green-500/20', text: 'text-green-500', border: 'border-green-500/30' },
  'LIGHTNING_FAST': { bg: 'bg-pink-500/20', text: 'text-pink-500', border: 'border-pink-500/30' },
  'COMEBACK_KING': { bg: 'bg-indigo-500/20', text: 'text-indigo-500', border: 'border-indigo-500/30' },
  'HALF_WAY_HERO': { bg: 'bg-teal-500/20', text: 'text-teal-500', border: 'border-teal-500/30' }
}

function TrophyDashboard({ stats, unlockedTrophies, nextTrophyProgress }) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [selectedTrophy, setSelectedTrophy] = useState(null)

  // Calculate progress for each trophy
  const getTrophyProgress = (trophyType) => {
    const trophy = TROPHY_TYPES[trophyType]
    if (!trophy) return { progress: 0, label: '', isUnlocked: false, canBeAchieved: true }

    const isUnlocked = unlockedTrophies.includes(trophy.type)

    if (isUnlocked) {
      return { progress: 100, label: 'Unlocked!', isUnlocked: true, canBeAchieved: true }
    }

    // Calculate progress based on trophy type
    let progress = 0
    let label = ''
    let canBeAchieved = true

    switch (trophy.type) {
      case 'FIRST_BLOOD':
        progress = stats.correctCount >= 1 ? 100 : (stats.totalAnswered > 0 ? 50 : 0)
        label = stats.correctCount >= 1 ? 'Complete' : 'Answer first correctly'
        // Mark as not achievable if complete (will be filtered out)
        if (progress === 100) canBeAchieved = false
        break

      case 'HAT_TRICK':
        progress = Math.min((stats.currentStreak / 3) * 100, 100)
        label = `${stats.currentStreak}/3 streak`
        if (progress === 100) canBeAchieved = false
        break

      case 'HOT_STREAK':
        progress = Math.min((stats.currentStreak / 5) * 100, 100)
        label = `${stats.currentStreak}/5 streak`
        if (progress === 100) canBeAchieved = false
        break

      case 'UNSTOPPABLE':
        progress = Math.min((stats.currentStreak / 10) * 100, 100)
        label = `${stats.currentStreak}/10 streak`
        if (progress === 100) canBeAchieved = false
        break

      case 'SHARP_SHOOTER':
        if (stats.totalAnswered >= 5) {
          progress = stats.accuracyPercentage >= 90 ? 100 : (stats.accuracyPercentage / 90) * 100
          label = `${stats.accuracyPercentage}%`
          if (progress === 100) canBeAchieved = false
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `${stats.totalAnswered}/5 questions`
        }
        break

      case 'PERFECTIONIST':
        if (stats.isQuizComplete) {
          progress = stats.accuracyPercentage
          label = `${stats.accuracyPercentage}%`
          canBeAchieved = stats.accuracyPercentage === 100
          if (progress === 100) canBeAchieved = false
        } else {
          const completionProgress = (stats.totalAnswered / stats.totalQuestions) * 100
          const accuracyWeight = stats.accuracyPercentage
          progress = (completionProgress * 0.5) + (accuracyWeight * 0.5)
          label = `${stats.totalAnswered}/${stats.totalQuestions}`
          // Trophy is still achievable until quiz is complete (user can still get 100%)
          canBeAchieved = stats.accuracyPercentage === 100 || !stats.isQuizComplete
        }
        break

      case 'SPEED_DEMON':
        if (stats.totalAnswered >= 5 && stats.averageResponseTime > 0) {
          const speedProgress = Math.max(0, Math.min(100, ((3000 - stats.averageResponseTime) / 3000) * 100))
          progress = speedProgress
          label = `${(stats.averageResponseTime / 1000).toFixed(1)}s`
          if (progress === 100) canBeAchieved = false
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `${stats.totalAnswered}/5`
        }
        break

      case 'LIGHTNING_FAST':
        if (stats.totalAnswered >= 5 && stats.averageResponseTime > 0) {
          const speedProgress = Math.max(0, Math.min(100, ((1500 - stats.averageResponseTime) / 1500) * 100))
          progress = speedProgress
          label = `${(stats.averageResponseTime / 1000).toFixed(1)}s`
          if (progress === 100) canBeAchieved = false
        } else {
          progress = (stats.totalAnswered / 5) * 50
          label = `${stats.totalAnswered}/5`
        }
        break

      case 'COMEBACK_KING':
        progress = stats.hadComeback && stats.currentStreak >= 3 ? 100 : 0
        label = stats.hadComeback ? `${stats.currentStreak} streak` : 'Need comeback'
        // Only mark as complete if we've actually achieved it
        if (progress === 100) canBeAchieved = false
        // This trophy is always achievable until completed (user can still make a comeback)
        break

      case 'HALF_WAY_HERO':
        const halfWay = Math.floor(stats.totalQuestions / 2)
        if (stats.totalAnswered === halfWay) {
          progress = Math.min((stats.accuracyPercentage / 80) * 100, 100)
          label = `${stats.accuracyPercentage}% at halfway`
          canBeAchieved = stats.accuracyPercentage >= 80
          if (progress === 100 && canBeAchieved) canBeAchieved = false
        } else if (stats.totalAnswered < halfWay) {
          progress = (stats.totalAnswered / halfWay) * 50
          label = `${stats.totalAnswered}/${halfWay}`
        } else {
          progress = 0
          label = 'Missed'
          canBeAchieved = false
        }
        break

      default:
        break
    }

    return {
      progress: Math.round(progress),
      label,
      isUnlocked: false,
      canBeAchieved
    }
  }

  // Get uncompleted trophies
  const getUncompletedTrophies = () => {
    const allTrophies = Object.values(TROPHY_TYPES)
      .filter(trophy => !unlockedTrophies.includes(trophy.type))
      .map(trophy => {
        const { label, canBeAchieved, progress } = getTrophyProgress(trophy.type)
        return {
          ...trophy,
          label,
          canBeAchieved,
          progress
        }
      })

    return allTrophies.filter(trophy => trophy.canBeAchieved)
  }

  // Get completed trophies
  const getCompletedTrophies = () => {
    return Object.values(TROPHY_TYPES)
      .filter(trophy => unlockedTrophies.includes(trophy.type))
      .map(trophy => ({
        ...trophy,
        label: 'Unlocked!'
      }))
  }

  const uncompletedTrophies = getUncompletedTrophies()
  const completedTrophies = getCompletedTrophies()

  return (
    <>
      <div className="bg-base-200/30 rounded-lg p-3 mb-4">
        {/* Header with Tab Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(false)}
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                !showCompleted
                  ? 'text-base-content'
                  : 'text-base-content/50 hover:text-base-content/70'
              }`}
            >
              Active
              <span className={`badge badge-xs ${
                uncompletedTrophies.length > 0 ? 'badge-primary' : 'badge-ghost'
              }`}>
                {uncompletedTrophies.length}
              </span>
            </button>
            <span className="text-base-content/30">|</span>
            <button
              onClick={() => setShowCompleted(true)}
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                showCompleted
                  ? 'text-base-content'
                  : 'text-base-content/50 hover:text-base-content/70'
              }`}
            >
              Completed
              <span className={`badge badge-xs ${
                completedTrophies.length > 0 ? 'badge-success' : 'badge-ghost'
              }`}>
                {completedTrophies.length}
              </span>
            </button>
          </div>
        </div>

        {/* Trophy Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {!showCompleted ? (
            // Uncompleted Trophies
            uncompletedTrophies.length > 0 ? (
              uncompletedTrophies.map((trophy) => {
                const IconComponent = TROPHY_ICONS[trophy.icon] || Trophy
                const colors = TROPHY_COLORS[trophy.type] || { bg: 'bg-base-300/50', text: 'text-base-content/60', border: 'border-base-300' }

                return (
                  <button
                    key={trophy.type}
                    onClick={() => setSelectedTrophy(trophy)}
                    className="flex flex-col items-center min-w-[80px] flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {/* Trophy Icon */}
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center mb-1`}>
                      <IconComponent className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    {/* Trophy Name */}
                    <h4 className={`text-xs font-medium text-center mb-1 line-clamp-1 max-w-[80px] ${colors.text}`}>
                      {trophy.name}
                    </h4>

                    {/* Label */}
                    <p className="text-[10px] text-center text-base-content/60 line-clamp-1 max-w-[80px]">
                      {trophy.label}
                    </p>
                  </button>
                )
              })
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-xs text-base-content/60">All challenges completed!</p>
              </div>
            )
          ) : (
            // Completed Trophies
            completedTrophies.length > 0 ? (
              completedTrophies.map((trophy) => {
                const IconComponent = TROPHY_ICONS[trophy.icon] || Trophy
                const colors = TROPHY_COLORS[trophy.type] || { bg: 'bg-success/20', text: 'text-success', border: 'border-success/30' }

                return (
                  <button
                    key={trophy.type}
                    onClick={() => setSelectedTrophy(trophy)}
                    className="flex flex-col items-center min-w-[80px] flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    {/* Trophy Icon */}
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center mb-1`}>
                      <IconComponent className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    {/* Trophy Name */}
                    <h4 className={`text-xs font-medium text-center mb-1 line-clamp-1 max-w-[80px] ${colors.text}`}>
                      {trophy.name}
                    </h4>

                    {/* Unlocked Label */}
                    <p className="text-[10px] text-center text-base-content/60 line-clamp-1 max-w-[80px]">
                      Unlocked
                    </p>
                  </button>
                )
              })
            ) : (
              <div className="w-full text-center py-2">
                <p className="text-xs text-base-content/60">No completed challenges yet</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Trophy Detail Modal */}
      {selectedTrophy && (
        <>
          <input
            type="checkbox"
            id="trophy-detail-modal"
            className="modal-toggle"
            checked={!!selectedTrophy}
            onChange={() => setSelectedTrophy(null)}
          />
          <div className="modal modal-bottom sm:modal-middle">
            <div className="modal-box">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {/* Trophy Icon */}
                  {(() => {
                    const IconComponent = TROPHY_ICONS[selectedTrophy.icon] || Trophy
                    const colors = TROPHY_COLORS[selectedTrophy.type] || { bg: 'bg-base-300/50', text: 'text-base-content/60' }
                    return (
                      <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center`}>
                        <IconComponent className={`w-8 h-8 ${colors.text}`} />
                      </div>
                    )
                  })()}
                  <div>
                    <h3 className="text-lg font-medium text-base-content">{selectedTrophy.name}</h3>
                    <p className="text-sm text-base-content/70">{selectedTrophy.description}</p>
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => setSelectedTrophy(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Trophy Details */}
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg">
                  <span className="text-sm font-medium text-base-content/70">Status</span>
                  <span className={`badge ${
                    unlockedTrophies.includes(selectedTrophy.type)
                      ? 'badge-success'
                      : 'badge-ghost'
                  }`}>
                    {unlockedTrophies.includes(selectedTrophy.type) ? 'Unlocked' : 'Locked'}
                  </span>
                </div>

                {/* Progress (if not unlocked) */}
                {!unlockedTrophies.includes(selectedTrophy.type) && (() => {
                  const { progress, label } = getTrophyProgress(selectedTrophy.type)
                  return (
                    <div className="p-3 bg-base-200/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-base-content/70">Progress</span>
                        <span className="text-sm font-bold text-primary">{progress}%</span>
                      </div>
                      <progress
                        className="progress progress-primary w-full"
                        value={progress}
                        max="100"
                      ></progress>
                      <p className="text-xs text-base-content/60">{label}</p>
                    </div>
                  )
                })()}

                {/* Requirements */}
                <div className="p-3 bg-base-200/50 rounded-lg">
                  <h4 className="text-sm font-medium text-base-content/70 mb-2">Requirements</h4>
                  <p className="text-sm text-base-content">{selectedTrophy.description}</p>
                </div>
              </div>

              <div className="modal-action">
                <button
                  className="btn btn-primary"
                  onClick={() => setSelectedTrophy(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <label
              className="modal-backdrop"
              onClick={() => setSelectedTrophy(null)}
            >
            </label>
          </div>
        </>
      )}
    </>
  )
}

export default TrophyDashboard
