import { useState, useMemo } from 'react';
import { ArrowLeft, Zap, Target, BookOpen, RotateCcw, Trophy, Focus } from 'lucide-react';
import { calculateQuestionStats } from '../utils/questionStats';

/**
 * Quiz Configuration View Component
 * Allows users to select question states (unanswered, correct, incorrect) for quiz creation
 * Includes quiz presets for quick access to common quiz types
 */
const QuizConfigView = ({ questions, attempts, onStartQuiz, onBack }) => {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateQuestionStats(questions, attempts);
  }, [questions, attempts]);

  // Quiz preset configurations
  const quizPresets = [
    {
      id: 'quick-sprint',
      name: 'Quick Sprint',
      description: '5 random questions - fast practice',
      icon: Zap,
      color: 'warning',
      states: ['unanswered', 'correct', 'incorrect'],
      maxQuestions: 5,
    },
    {
      id: 'focus-mode',
      name: 'Focus Mode',
      description: 'Unanswered questions only',
      icon: Focus,
      color: 'primary',
      states: ['unanswered'],
      maxQuestions: null,
    },
    {
      id: 'deep-dive',
      name: 'Deep Dive',
      description: 'Master your incorrect answers',
      icon: Target,
      color: 'error',
      states: ['incorrect'],
      maxQuestions: null,
    },
    {
      id: 'practice-run',
      name: 'Practice Run',
      description: '10 questions - balanced practice',
      icon: BookOpen,
      color: 'info',
      states: ['unanswered', 'correct', 'incorrect'],
      maxQuestions: 10,
    },
    {
      id: 'full-review',
      name: 'Full Review',
      description: 'All questions - comprehensive',
      icon: RotateCcw,
      color: 'accent',
      states: ['unanswered', 'correct', 'incorrect'],
      maxQuestions: null,
    },
    {
      id: 'mastery-challenge',
      name: 'Mastery Challenge',
      description: 'Unanswered + Incorrect only',
      icon: Trophy,
      color: 'success',
      states: ['unanswered', 'incorrect'],
      maxQuestions: null,
    },
  ];

  // Handle preset selection
  const selectPreset = (preset) => {
    setSelectedPreset(preset.id);
    setSelectedStates(preset.states);
  };

  // Toggle state selection
  const toggleState = (state) => {
    setSelectedPreset(null); // Clear preset when manually selecting
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
              className="btn btn-ghost btn-circle"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold uppercase tracking-wide">Configure Your Quiz</h1>
              <p className="text-xs text-base-content/60">
                Select question types to practice
              </p>
            </div>
          </div>
        </div>

        {/* Quiz Presets */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-3">
            Quick Start Presets
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quizPresets.map(preset => {
              const Icon = preset.icon;
              const questionsInPreset = preset.states.reduce((total, state) => total + (stats[state] || 0), 0);
              const availableQuestions = preset.maxQuestions ? Math.min(questionsInPreset, preset.maxQuestions) : questionsInPreset;
              const isDisabled = availableQuestions === 0;

              return (
                <button
                  key={preset.id}
                  onClick={() => !isDisabled && selectPreset(preset)}
                  disabled={isDisabled}
                  className={`bg-base-100 border border-base-content/10 p-3 text-left transition-all duration-200 ${
                    selectedPreset === preset.id
                      ? `ring-2 ring-${preset.color} ring-offset-2 ring-offset-base-200`
                      : 'hover:border-base-content/20'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Icon className={`w-4 h-4 text-${preset.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-xs uppercase truncate">{preset.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-base-content/60 mb-2 line-clamp-2">
                    {preset.description}
                  </p>
                  <div className="text-xs font-medium text-base-content/70">
                    {availableQuestions} question{availableQuestions !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
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
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-base-content/60 mb-3">
            Or Customize Question Types
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">{card.icon}</div>
                    <input
                      type="checkbox"
                      checked={isSelected(card.id)}
                      onChange={() => {}}
                      disabled={card.count === 0}
                      className={`checkbox checkbox-${card.color} checkbox-sm`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm uppercase mb-1">{card.title}</h3>
                    <p className="text-xs text-base-content/60 mb-2">
                      {card.description}
                    </p>
                    <div className={`text-xl font-bold text-${card.color}`}>
                      {card.count}
                      <span className="text-xs text-base-content/60 font-normal ml-1">
                        questions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
