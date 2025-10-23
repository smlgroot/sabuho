import { Trophy, Target, Zap, Flame, Star, Crosshair, Gauge, Bolt, Undo2, Award } from 'lucide-react'

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

function TrophyProgressBar({ nextTrophyProgress, trophyCount }) {
  if (!nextTrophyProgress) {
    return null
  }

  const { trophy, progress, label } = nextTrophyProgress
  const IconComponent = TROPHY_ICONS[trophy.icon] || Trophy

  return (
    <div className="bg-base-200/50 border border-base-300 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <IconComponent className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-base-content">{trophy.name}</h3>
            <p className="text-xs text-base-content/70">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trophyCount > 0 && (
            <div className="badge badge-success gap-1">
              <Trophy className="w-3 h-3" />
              {trophyCount}
            </div>
          )}
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
      </div>

      <div className="w-full">
        <progress
          className="progress progress-primary w-full h-2"
          value={progress}
          max="100"
        ></progress>
      </div>
    </div>
  )
}

export default TrophyProgressBar
