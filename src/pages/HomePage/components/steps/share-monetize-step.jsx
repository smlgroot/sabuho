import { DollarSign, Globe, BarChart3, Lock, Clock } from "lucide-react";

export default function ShareMonetizeStep({ quizGenerated }) {
  return (
    <div className={`bg-base-100 border-2 p-4 transition-all ${
      quizGenerated ? 'border-warning' : 'border-base-300 opacity-50'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 flex-shrink-0 ${
            quizGenerated ? 'bg-warning/10' : 'bg-base-200'
          }`}>
            <DollarSign className={`w-5 h-5 ${quizGenerated ? 'text-warning' : 'text-base-content/40'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm mb-1 uppercase ${quizGenerated ? '' : 'text-base-content/40'}`}>Step 3</h3>
            <p className={`text-xs ${quizGenerated ? 'text-base-content/60' : 'text-base-content/40'}`}>
              {quizGenerated ? 'Coming Soon!' : 'Share & Earn'}
            </p>
          </div>
        </div>

        {/* Coming Soon Features */}
        {quizGenerated && (
          <div className="space-y-2 mb-3">
            {/* Share Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-warning/10">
              <div className="flex-shrink-0 text-warning">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">Share Your Quiz</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-warning" />
              </div>
            </div>

            {/* Sell Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-warning/10">
              <div className="flex-shrink-0 text-warning">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">Monetize Content</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-warning" />
              </div>
            </div>

            {/* Analytics Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-warning/10">
              <div className="flex-shrink-0 text-warning">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium">Track Performance</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-warning" />
              </div>
            </div>
          </div>
        )}

        {!quizGenerated ? (
          <div className="mt-auto">
            <button className="btn btn-sm w-full btn-disabled" disabled>
              <Lock className="w-4 h-4 mr-1" />
              Locked
            </button>
          </div>
        ) : (
          <div className="mt-auto pt-2 border-t border-warning/30 flex items-center justify-center gap-2 text-warning">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold">Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}
