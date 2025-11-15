import { useState, useMemo } from 'react';
import { calculateQuestionStats } from '../utils/questionStats';

/**
 * Quiz Configuration View Component
 * Allows users to select question states (unanswered, correct, incorrect) for quiz creation
 */
const QuizConfigView = ({ questions, attempts, onStartQuiz, onBack }) => {
  const [selectedStates, setSelectedStates] = useState([]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateQuestionStats(questions, attempts);
  }, [questions, attempts]);

  // Toggle state selection
  const toggleState = (state) => {
    setSelectedStates(prev => {
      if (prev.includes(state)) {
        return prev.filter(s => s !== state);
      } else {
        return [...prev, state];
      }
    });
  };

  // Check if state is selected
  const isSelected = (state) => selectedStates.includes(state);

  // Handle start quiz
  const handleStartQuiz = () => {
    if (selectedStates.length > 0) {
      onStartQuiz(selectedStates);
    }
  };

  // Calculate total questions in selection
  const totalSelected = useMemo(() => {
    return selectedStates.reduce((total, state) => {
      return total + (stats[state] || 0);
    }, 0);
  }, [selectedStates, stats]);

  // State card configurations
  const stateCards = [
    {
      id: 'unanswered',
      title: 'Unanswered',
      count: stats.unanswered,
      icon: '📝',
      color: 'primary',
      description: 'Questions you haven\'t attempted yet',
    },
    {
      id: 'correct',
      title: 'Correct',
      count: stats.correct,
      icon: '✓',
      color: 'success',
      description: 'Questions you answered correctly',
    },
    {
      id: 'incorrect',
      title: 'Incorrect',
      count: stats.incorrect,
      icon: '✗',
      color: 'error',
      description: 'Questions you got wrong',
    },
  ];

  return (
    <div className="max-w-5xl mb-8">
      <div className="bg-base-200 border border-base-content/10 p-6">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-base-content/10">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Go back"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase tracking-wide">Configure Your Quiz</h1>
              <p className="text-xs text-base-content/60">
                Select question types to practice
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-base-100 border border-base-content/10 p-4 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-4">Question Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-3xl font-bold text-primary">
                {stats.total}
              </div>
              <div className="text-xs text-base-content/60">
                Total Questions
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent">
                {totalSelected}
              </div>
              <div className="text-xs text-base-content/60">
                Selected
              </div>
            </div>
          </div>
        </div>

        {/* State Selection Cards */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-3">
            Select Question Types
          </h2>

          {stateCards.map(card => (
            <div
              key={card.id}
              onClick={() => card.count > 0 && toggleState(card.id)}
              className={`bg-base-100 border border-base-content/10 p-4 cursor-pointer transition-all duration-200 ${
                isSelected(card.id)
                  ? `ring-2 ring-${card.color} ring-offset-2 ring-offset-base-200`
                  : 'hover:border-base-content/20'
              } ${card.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{card.icon}</div>
                  <div>
                    <h3 className="font-semibold text-sm uppercase">{card.title}</h3>
                    <p className="text-xs text-base-content/60">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`text-2xl font-bold text-${card.color}`}>
                      {card.count}
                    </div>
                    <div className="text-xs text-base-content/60">
                      questions
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected(card.id)}
                    onChange={() => {}}
                    disabled={card.count === 0}
                    className={`checkbox checkbox-${card.color}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {selectedStates.length === 0 && (
          <div className="bg-info/10 border border-info/20 p-3 mb-6">
            <p className="text-sm text-base-content/70">Select at least one question type to start your quiz</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStartQuiz}
            disabled={selectedStates.length === 0 || totalSelected === 0}
            className="btn btn-primary flex-1"
          >
            {selectedStates.length === 0
              ? 'Select Question Types'
              : `Start Quiz (${totalSelected} question${totalSelected !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizConfigView;
