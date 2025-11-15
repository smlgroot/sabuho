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
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Header */}
      <div className="bg-base-100 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Go back"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">Configure Your Quiz</h1>
              <p className="text-sm text-base-content/70">
                Select question types to practice
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg">Question Summary</h2>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {stats.total}
                </div>
                <div className="text-sm text-base-content/70">
                  Total Questions
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">
                  {totalSelected}
                </div>
                <div className="text-sm text-base-content/70">
                  Selected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* State Selection Cards */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Select Question Types
          </h2>

          {stateCards.map(card => (
            <div
              key={card.id}
              onClick={() => card.count > 0 && toggleState(card.id)}
              className={`card bg-base-100 shadow-sm cursor-pointer transition-all duration-200 ${
                isSelected(card.id)
                  ? `ring-2 ring-${card.color} ring-offset-2 ring-offset-base-200`
                  : 'hover:shadow-md'
              } ${card.count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{card.icon}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{card.title}</h3>
                      <p className="text-sm text-base-content/70">
                        {card.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-3xl font-bold text-${card.color}`}>
                        {card.count}
                      </div>
                      <div className="text-xs text-base-content/70">
                        questions
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected(card.id)}
                      onChange={() => {}}
                      disabled={card.count === 0}
                      className={`checkbox checkbox-${card.color} checkbox-lg`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {selectedStates.length === 0 && (
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Select at least one question type to start your quiz</span>
          </div>
        )}
      </div>

      {/* Footer with Start Quiz Button */}
      <div className="bg-base-100 border-t border-base-300 sticky bottom-0">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={handleStartQuiz}
            disabled={selectedStates.length === 0 || totalSelected === 0}
            className="btn btn-primary btn-lg w-full"
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
