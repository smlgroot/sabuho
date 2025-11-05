import { Trophy, BookOpen, FileText, CheckCircle } from "lucide-react";

export default function ResultsStep({
  currentStep,
  topics,
  totalQuestionsGenerated,
  questionsCount
}) {
  return (
    <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
      currentStep === 3 ? 'border-green-500 shadow-lg' :
      'border-gray-200 opacity-50'
    }`}>
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <div className={`rounded-full p-2 flex-shrink-0 ${
            currentStep === 3 ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Trophy className={`w-5 h-5 ${currentStep === 3 ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm mb-1 ${currentStep === 3 ? 'text-gray-900' : 'text-gray-400'}`}>Step 3</h3>
            <p className={`text-xs ${currentStep === 3 ? 'text-gray-600' : 'text-gray-400'}`}>
              {currentStep === 3 ? 'Quiz generated!' : 'Result'}
            </p>
          </div>
        </div>

        {/* Result Stats */}
        {currentStep === 3 && (
          <div className="space-y-2 mb-3">
            {/* Topics Generated */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
              <div className="flex-shrink-0 text-green-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-green-700">Topics</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-green-900">{topics.length}</span>
              </div>
            </div>

            {/* Questions Generated */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
              <div className="flex-shrink-0 text-green-600">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-green-700">Questions</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-green-900">{totalQuestionsGenerated}</span>
              </div>
            </div>

            {/* Preview Available */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50">
              <div className="flex-shrink-0 text-blue-600">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-blue-700">Showing</span>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-bold text-blue-900">{questionsCount}</span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="mt-auto pt-2 border-t border-green-200 flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Complete</span>
          </div>
        )}
      </div>
    </div>
  );
}
