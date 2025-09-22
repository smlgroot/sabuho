import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LearningHubLayout from './LearningHubLayout';
import LearningPathHeader from './LearningPathHeader';
import { Star, Zap, Crown, Lock, CheckCircle, BookOpen, AlertTriangle, Plus } from 'lucide-react';
import { database } from '../../lib/game/database';
import useGameStore from '../../store/useGameStore';

function LearningPath() {
  // Get selected quiz from store for persistence
  const { selectedQuiz, setSelectedQuiz } = useGameStore();
  const navigate = useNavigate();
  
  // State for levels and available quizzes
  const [levels, setLevels] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load quizzes from local database
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setIsLoading(true);
        const quizzes = await database.getQuizzes();
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error('Error loading quizzes:', error);
        setAvailableQuizzes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuizzes();
  }, []);

  // Load levels when a quiz is selected
  useEffect(() => {
    const loadLevels = async () => {
      if (!selectedQuiz) {
        setLevels([]);
        return;
      }

      try {
        const quizLevels = await database.getQuizLevels(selectedQuiz.id);
        
        // Transform database levels to match the component's expected format
        const transformedLevels = quizLevels.map((level, index) => ({
          id: level.id,
          name: level.name,
          type: level.type || 'normal',
          completed: Boolean(level.is_completed), // Load actual completion status from database
          locked: !Boolean(level.is_unlocked) // Load actual unlock status from database
        }));
        
        setLevels(transformedLevels);
      } catch (error) {
        console.error('Error loading levels for quiz:', selectedQuiz.id, error);
        setLevels([]);
      }
    };

    loadLevels();
  }, [selectedQuiz]);

  // Function to reload levels (used after level completion)
  const reloadLevels = async () => {
    if (!selectedQuiz) return;

    try {
      const quizLevels = await database.getQuizLevels(selectedQuiz.id);
      
      const transformedLevels = quizLevels.map((level, index) => ({
        id: level.id,
        name: level.name,
        type: level.type || 'normal',
        completed: Boolean(level.is_completed),
        locked: !Boolean(level.is_unlocked)
      }));
      
      setLevels(transformedLevels);
    } catch (error) {
      console.error('Error reloading levels for quiz:', selectedQuiz.id, error);
    }
  };

  // Handle level click - navigate to quiz screen
  const handleLevelClick = async (level) => {
    if (level.locked) return;

    console.log(`${level.completed ? 'Reviewing' : 'Starting'} level: ${level.name}`);
    
    // Navigate to the quiz screen with the selected quiz ID and level ID
    // If the level is completed, open in readonly mode
    const queryParams = level.completed ? '?readonly=true' : '';
    navigate(`/quiz/${selectedQuiz.id}/${level.id}${queryParams}`);
  };

  const getLevelIcon = (type) => {
    switch (type) {
      case 'mini-boss':
        return <Zap className="w-6 h-6" />;
      case 'boss':
        return <Crown className="w-8 h-8" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  // Color palette for level icons with enhanced variety
  const getLevelColor = (index, type) => {
    if (type === 'mini-boss' || type === 'boss') {
      return type; // Keep existing special level colors
    }
    
    // Enhanced color rotation for standard levels
    // Using a mix of DaisyUI semantic colors and Tailwind color classes
    const colors = [
      'bg-primary text-primary-content',        // Theme primary
      'bg-secondary text-secondary-content',    // Theme secondary  
      'bg-accent text-accent-content',          // Theme accent
      'bg-info text-info-content',             // Light blue
      'bg-violet-500 text-white',              // Violet
      'bg-pink-500 text-white',                // Pink
      'bg-indigo-500 text-white',              // Indigo
      'bg-teal-500 text-white',                // Teal
      'bg-cyan-500 text-white',                // Cyan
      'bg-emerald-500 text-white',             // Emerald
      'bg-lime-500 text-white',                // Lime
      'bg-amber-500 text-white',               // Amber
      'bg-orange-500 text-white',              // Orange
      'bg-red-500 text-white',                 // Red
      'bg-rose-500 text-white',                // Rose
      'bg-fuchsia-500 text-white',             // Fuchsia
    ];
    
    return colors[index % colors.length];
  };

  const getLevelStyles = (type, completed, locked, index = 0) => {
    const baseStyles = "relative flex items-center justify-center rounded-full";
    const interactiveStyles = "transition-all duration-300 hover:scale-105";
    
    if (locked) {
      return `${baseStyles} bg-base-300 text-base-content/30 cursor-not-allowed`;
    }

    if (completed) {
      return `${baseStyles} ${interactiveStyles} bg-success text-success-content shadow-lg`;
    }

    switch (type) {
      case 'mini-boss':
        return `${baseStyles} ${interactiveStyles} bg-warning text-warning-content shadow-md w-16 h-16`;
      case 'boss':
        return `${baseStyles} ${interactiveStyles} bg-error text-error-content shadow-xl w-20 h-20`;
      default: {
        const levelColor = getLevelColor(index, type);
        return `${baseStyles} ${interactiveStyles} ${levelColor} shadow-md w-12 h-12`;
      }
    }
  };

  const getLevelSize = (type) => {
    switch (type) {
      case 'mini-boss':
        return 'w-16 h-16';
      case 'boss':
        return 'w-20 h-20';
      default:
        return 'w-12 h-12';
    }
  };

  // Placeholder component for no quizzes available
  const NoQuizzesPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <BookOpen className="w-16 h-16 text-base-content/40 mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-base-content mb-2">No Quizzes Available</h3>
        <p className="text-base-content/70 mb-6">
          To start your learning journey, you need to add quizzes first. Get started by adding a quiz code or downloading your claimed quizzes.
        </p>
        
        <button 
          className="btn btn-primary w-full mb-6"
          onClick={() => navigate('/learning-hub/quizzes')}
        >
          <Plus className="w-4 h-4" />
          Go to Quizzes
        </button>
        
        <div className="alert alert-info">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Use a valid quiz code to unlock learning paths and challenges.</span>
        </div>
      </div>
    </div>
  );

  // Placeholder component for no quiz selected
  const NoQuizSelectedPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <Star className="w-16 h-16 text-base-content/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-base-content mb-2">Select a Quiz to Begin</h3>
        <p className="text-base-content/70 mb-4">
          Choose a quiz from the selector above to view your learning path and start your adventure.
        </p>
        <div className="alert alert-warning">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">Your learning journey awaits! Pick a subject to get started.</span>
        </div>
      </div>
    </div>
  );

  return (
    <LearningHubLayout title="Learning">
      {/* Second Sticky Header - Quiz Selector */}
      <div className="sticky top-16 z-30 bg-base-100 border-b border-base-200 py-4 -mx-4 md:-mx-6 px-4 md:px-6 mb-6 -mt-4 pt-4">
        <LearningPathHeader 
          availableQuizzes={availableQuizzes}
          isLoading={isLoading}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      ) : availableQuizzes.length === 0 ? (
        <NoQuizzesPlaceholder />
      ) : !selectedQuiz ? (
        <NoQuizSelectedPlaceholder />
      ) : (
        <div className="flex justify-center">
          <div className="relative max-w-lg w-full">
          {/* Vertical connecting line - aligned with center of icons */}
          <div className="absolute top-0 bottom-0 w-1 bg-base-300" style={{ left: 'calc(1rem + 1.5rem)' }}></div>
          
          {/* Level nodes */}
          <div className="space-y-6">
            {levels.map((level, index) => (
              <div key={level.id} className="relative">
                {/* Level card with icon and name */}
                <div
                  className={`shadow-md relative z-10 ${
                    level.type === 'boss' ? 'border-2 border-error bg-error/5' : 
                    level.type === 'mini-boss' ? 'border-2 border-warning bg-warning/5' : 
                    'bg-base-100'
                  } ${level.locked ? 'opacity-60 cursor-not-allowed' : 'card cursor-pointer hover:shadow-lg transition-all duration-300'} ${level.completed ? 'hover:bg-base-200' : ''}`}
                  onClick={() => handleLevelClick(level)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center gap-4">
                      {/* Level icon - Each level gets a different color based on its position */}
                      <div className={`${getLevelStyles(level.type, level.completed, level.locked, index)} ${getLevelSize(level.type)} flex-shrink-0`}>
                        {level.locked ? (
                          <Lock className="w-5 h-5" />
                        ) : level.completed ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          getLevelIcon(level.type)
                        )}
                      </div>

                      {/* Level info */}
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${level.locked ? 'text-base-content/50' : 'text-base-content'}`}>
                          {level.name}
                        </h3>
                        <p className={`text-sm ${
                          level.type === 'boss' ? 'text-error' : 
                          level.type === 'mini-boss' ? 'text-warning' : 
                          'text-base-content/70'
                        }`}>
                          {level.type === 'mini-boss' ? 'Mini Boss Challenge' : 
                           level.type === 'boss' ? 'Final Boss Battle' : 
                           'Standard Level'}
                          {level.completed && (
                            <span className="text-xs text-base-content/50 ml-2">• Click to review</span>
                          )}
                        </p>
                      </div>

                      {/* Status indicator */}
                      {level.completed && (
                        <div className="text-success">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}
                      {level.locked && (
                        <div className="text-base-content/30">
                          <Lock className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress indicator for the connecting line - aligned with center of icons */}
                {index < levels.length - 1 && (
                  <div 
                    className={`absolute top-full w-1 h-6 z-0 ${level.completed ? 'bg-success' : 'bg-base-300'}`}
                    style={{ left: 'calc(1rem + 1.5rem)' }}
                  ></div>
                )}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </LearningHubLayout>
  );
}

export default LearningPath;