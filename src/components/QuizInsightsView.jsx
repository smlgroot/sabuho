import { useMemo } from 'react';
import { calculateQuestionStats, calculateAccuracy, calculateProgress } from '../utils/questionStats';
import { BarChart3, TrendingUp, Target, Clock } from 'lucide-react';

/**
 * Quiz Insights View Component
 * Displays mock statistics and insights about question attempts
 */
const QuizInsightsView = ({ questions, attempts, onBack }) => {
  // Calculate real statistics
  const stats = useMemo(() => {
    return calculateQuestionStats(questions, attempts);
  }, [questions, attempts]);

  const accuracy = useMemo(() => {
    return calculateAccuracy(attempts);
  }, [attempts]);

  const progress = useMemo(() => {
    return calculateProgress(questions, attempts);
  }, [questions, attempts]);

  // Mock data for demonstration
  const mockWeeklyProgress = [
    { day: 'Mon', answered: 5, correct: 3 },
    { day: 'Tue', answered: 8, correct: 6 },
    { day: 'Wed', answered: 12, correct: 10 },
    { day: 'Thu', answered: 15, correct: 12 },
    { day: 'Fri', answered: 10, correct: 8 },
    { day: 'Sat', answered: 6, correct: 5 },
    { day: 'Sun', answered: 4, correct: 4 },
  ];

  const mockTopicPerformance = [
    { topic: 'Cell Biology Basics', accuracy: 85, questionsAttempted: 5 },
    { topic: 'Organelles', accuracy: 72, questionsAttempted: 4 },
    { topic: 'Cell Division', accuracy: 90, questionsAttempted: 3 },
  ];

  const totalAttempted = stats.correct + stats.incorrect;
  const accuracyPercentage = totalAttempted > 0 ? Math.round((stats.correct / totalAttempted) * 100) : 0;

  return (
    <div className="max-w-5xl mb-8">
      <div className="bg-base-200 border border-base-content/10 p-6">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-base-content/10">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Go back"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Quiz Insights
              </h1>
              <p className="text-xs text-base-content/60">
                Your learning progress and statistics
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-base-100 border border-base-content/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs text-base-content/60 uppercase">Accuracy</span>
            </div>
            <div className="text-2xl font-bold text-primary">{accuracyPercentage}%</div>
            <div className="text-xs text-base-content/60">{stats.correct} of {totalAttempted} correct</div>
          </div>

          <div className="bg-base-100 border border-base-content/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-base-content/60 uppercase">Progress</span>
            </div>
            <div className="text-2xl font-bold text-success">{progress}%</div>
            <div className="text-xs text-base-content/60">{totalAttempted} of {stats.total} attempted</div>
          </div>

          <div className="bg-base-100 border border-base-content/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-base-content/60 uppercase">Correct</span>
            </div>
            <div className="text-2xl font-bold text-success">{stats.correct}</div>
            <div className="text-xs text-base-content/60">questions</div>
          </div>

          <div className="bg-base-100 border border-base-content/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-base-content/60 uppercase">Remaining</span>
            </div>
            <div className="text-2xl font-bold text-warning">{stats.unanswered}</div>
            <div className="text-xs text-base-content/60">questions</div>
          </div>
        </div>

        {/* Weekly Progress (Mock Data) */}
        <div className="bg-base-100 border border-base-content/10 p-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-4">
            Weekly Activity (Sample Data)
          </h2>
          <div className="flex items-end justify-between gap-2 h-32">
            {mockWeeklyProgress.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div
                    className="bg-success w-full transition-all"
                    style={{ height: `${(day.correct / 15) * 80}px` }}
                    title={`${day.correct} correct`}
                  />
                  <div
                    className="bg-error w-full transition-all"
                    style={{ height: `${((day.answered - day.correct) / 15) * 80}px` }}
                    title={`${day.answered - day.correct} incorrect`}
                  />
                </div>
                <div className="text-xs text-base-content/60">{day.day}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success" />
              <span className="text-base-content/60">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-error" />
              <span className="text-base-content/60">Incorrect</span>
            </div>
          </div>
        </div>

        {/* Topic Performance (Mock Data) */}
        <div className="bg-base-100 border border-base-content/10 p-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-4">
            Topic Performance (Sample Data)
          </h2>
          <div className="space-y-3">
            {mockTopicPerformance.map((topic, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <span className="text-sm font-bold text-primary">{topic.accuracy}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-base-200 h-2">
                    <div
                      className="bg-primary h-2 transition-all"
                      style={{ width: `${topic.accuracy}%` }}
                    />
                  </div>
                  <span className="text-xs text-base-content/60 min-w-[4rem] text-right">
                    {topic.questionsAttempted} questions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Status Breakdown */}
        <div className="bg-base-100 border border-base-content/10 p-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-4">
            Question Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-base-content/30" />
                <span className="text-sm">Unanswered</span>
              </div>
              <span className="text-sm font-bold">{stats.unanswered}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success" />
                <span className="text-sm">Correct</span>
              </div>
              <span className="text-sm font-bold text-success">{stats.correct}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-error" />
                <span className="text-sm">Incorrect</span>
              </div>
              <span className="text-sm font-bold text-error">{stats.incorrect}</span>
            </div>
          </div>
        </div>

        {/* Mock Achievement/Streak Section */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-1">
                Current Streak
              </h3>
              <p className="text-xs text-base-content/60">Keep it up!</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-3xl font-bold text-primary">3</span>
              <span className="text-sm text-base-content/60">days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizInsightsView;
