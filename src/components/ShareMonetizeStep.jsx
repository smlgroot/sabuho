import { DollarSign, Globe, BarChart3, Lock, Clock } from "lucide-react";

export default function ShareMonetizeStep({ quizGenerated }) {
  return (
    <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
      quizGenerated ? 'border-yellow-500 shadow-lg' : 'border-gray-200 opacity-50'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className={`rounded-full p-2 flex-shrink-0 ${
            quizGenerated ? 'bg-yellow-100' : 'bg-gray-100'
          }`}>
            <DollarSign className={`w-5 h-5 ${quizGenerated ? 'text-yellow-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm mb-1 ${quizGenerated ? 'text-gray-900' : 'text-gray-400'}`}>Step 4</h3>
            <p className={`text-xs ${quizGenerated ? 'text-gray-600' : 'text-gray-400'}`}>
              {quizGenerated ? 'Coming Soon!' : 'Share & Earn'}
            </p>
          </div>
        </div>

        {/* Coming Soon Features */}
        {quizGenerated && (
          <div className="space-y-2 mb-3">
            {/* Share Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
              <div className="flex-shrink-0 text-yellow-600">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-yellow-700">Share Your Quiz</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-yellow-600" />
              </div>
            </div>

            {/* Sell Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
              <div className="flex-shrink-0 text-yellow-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-yellow-700">Monetize Content</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-yellow-600" />
              </div>
            </div>

            {/* Analytics Feature */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
              <div className="flex-shrink-0 text-yellow-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-yellow-700">Track Performance</span>
              </div>
              <div className="flex-shrink-0">
                <Lock className="w-3 h-3 text-yellow-600" />
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
          <div className="mt-auto pt-2 border-t border-yellow-200 flex items-center justify-center gap-2 text-yellow-600">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold">Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}
