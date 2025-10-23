import { Trophy, Target, Zap, Flame, Star, Crosshair, Gauge, Bolt, Undo2, Award, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

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

function TrophyUnlockModal({ trophy, isOpen, onClose }) {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Delay content animation slightly for better effect
      setTimeout(() => setShowContent(true), 100)
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  if (!trophy) {
    return null
  }

  const IconComponent = TROPHY_ICONS[trophy.icon] || Trophy

  return (
    <>
      <input
        type="checkbox"
        id="trophy-unlock-modal"
        className="modal-toggle"
        checked={isOpen}
        onChange={() => {}}
      />
      <div className="modal modal-middle">
        <div className="modal-box max-w-md relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 animate-pulse"></div>

          {/* Sparkle decorations */}
          <div className="absolute top-4 left-4 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '2s' }}>
            <Sparkles className="w-4 h-4 text-warning" />
          </div>
          <div className="absolute top-8 right-8 animate-bounce" style={{ animationDelay: '500ms', animationDuration: '2s' }}>
            <Sparkles className="w-3 h-3 text-secondary" />
          </div>
          <div className="absolute bottom-12 left-12 animate-bounce" style={{ animationDelay: '1000ms', animationDuration: '2s' }}>
            <Sparkles className="w-3 h-3 text-accent" />
          </div>
          <div className="absolute bottom-8 right-6 animate-bounce" style={{ animationDelay: '750ms', animationDuration: '2s' }}>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>

          {/* Main content */}
          <div className="relative z-10">
            {/* Trophy Icon with Animation */}
            <div className="flex justify-center mb-6 pt-4">
              <div
                className={`transform transition-all duration-500 ${
                  showContent ? 'scale-100 rotate-0' : 'scale-0 rotate-180'
                }`}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-warning to-primary flex items-center justify-center shadow-lg animate-pulse">
                  <IconComponent className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            {/* Trophy Details */}
            <div
              className={`text-center transform transition-all duration-500 delay-200 ${
                showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <h2 className="text-3xl font-bold text-primary mb-2">
                Trophy Unlocked!
              </h2>

              <div className="divider my-4"></div>

              <h3 className="text-2xl font-bold text-base-content mb-3">
                {trophy.name}
              </h3>

              <p className="text-base-content/80 text-lg mb-6">
                {trophy.description}
              </p>

              {/* Trophy Metadata */}
              {trophy.metadata?.stats && (
                <div className="flex justify-center gap-4 mb-6">
                  {trophy.metadata.stats.accuracy > 0 && (
                    <div className="badge badge-lg badge-success gap-2">
                      <Star className="w-4 h-4" />
                      {trophy.metadata.stats.accuracy}% Accuracy
                    </div>
                  )}
                  {trophy.metadata.stats.streak > 0 && (
                    <div className="badge badge-lg badge-warning gap-2">
                      <Flame className="w-4 h-4" />
                      {trophy.metadata.stats.streak} Streak
                    </div>
                  )}
                  {trophy.metadata.stats.avgResponseTime > 0 && (
                    <div className="badge badge-lg badge-info gap-2">
                      <Gauge className="w-4 h-4" />
                      {(trophy.metadata.stats.avgResponseTime / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={onClose}
                className="btn btn-primary btn-lg w-full"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* Backdrop - click to close */}
        <label
          className="modal-backdrop"
          onClick={onClose}
        >
        </label>
      </div>
    </>
  )
}

export default TrophyUnlockModal
