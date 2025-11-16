import { useMemo } from 'react';
import { calculateQuestionStats, calculateAccuracy, calculateProgress } from '../utils/questionStats';
import { ArrowLeft, CheckCircle2, XCircle, Circle } from 'lucide-react';

/**
 * Quiz Insights View Component
 * Displays quiz statistics and performance metrics
 */
const QuizInsightsView = ({ questions, attempts, onBack }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    return calculateQuestionStats(questions, attempts);
  }, [questions, attempts]);

  const accuracy = useMemo(() => {
    return calculateAccuracy(stats);
  }, [stats]);

  const progress = useMemo(() => {
    return calculateProgress(stats);
  }, [stats]);

  const totalAttempted = stats.correct + stats.incorrect;

  return (
    <div className="max-w-5xl mb-8">
      <div className="bg-base-200 border border-base-content/10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="btn btn-ghost btn-circle btn-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Quiz Statistics</h1>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-base-content/60">Total Questions</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-primary">{totalAttempted}</div>
            <div className="text-sm text-base-content/60">Attempted</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-success">{accuracy}%</div>
            <div className="text-sm text-base-content/60">Accuracy</div>
          </div>

          <div className="bg-base-100 p-4 text-center">
            <div className="text-3xl font-bold text-info">{progress}%</div>
            <div className="text-sm text-base-content/60">Completion</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-base-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-base-content/60">{totalAttempted} / {stats.total}</span>
          </div>
          <div className="w-full bg-base-200 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-success h-full"
              style={{ width: `${(stats.correct / stats.total) * 100}%` }}
              title={`${stats.correct} correct`}
            />
            <div
              className="bg-error h-full"
              style={{ width: `${(stats.incorrect / stats.total) * 100}%` }}
              title={`${stats.incorrect} incorrect`}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-base-content/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-success rounded-sm" />
                <span>Correct ({stats.correct})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-error rounded-sm" />
                <span>Incorrect ({stats.incorrect})</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-base-300 rounded-sm" />
                <span>Unanswered ({stats.unanswered})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-base-100 p-4">
          <h2 className="text-sm font-semibold mb-4">Performance Breakdown</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm">Correct</span>
              </div>
              <span className="text-lg font-bold text-success">{stats.correct}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-error" />
                <span className="text-sm">Incorrect</span>
              </div>
              <span className="text-lg font-bold text-error">{stats.incorrect}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Circle className="w-5 h-5 text-base-content/40" />
                <span className="text-sm">Unanswered</span>
              </div>
              <span className="text-lg font-bold text-base-content/60">{stats.unanswered}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInsightsView;
