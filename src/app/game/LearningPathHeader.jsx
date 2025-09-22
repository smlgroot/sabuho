import { useState, useEffect } from 'react';
import useGameStore from '../../store/useGameStore';
import { 
  AlertTriangle, 
  ChevronDown,
  X,
  Calculator, 
  Globe, 
  BookOpen, 
  Palette, 
  Music, 
  Beaker, 
  Brain,
  Trophy,
  HelpCircle,
  Plus
} from 'lucide-react';

// Default icon mapping for quizzes (fallback when no specific icon is available)
const getQuizIcon = (quiz) => {
  // You can add more specific mappings based on quiz name or category
  const name = quiz.name?.toLowerCase() || '';
  
  if (name.includes('math') || name.includes('calculation')) return Calculator;
  if (name.includes('geography') || name.includes('world')) return Globe;
  if (name.includes('literature') || name.includes('book')) return BookOpen;
  if (name.includes('art') || name.includes('design')) return Palette;
  if (name.includes('music') || name.includes('sound')) return Music;
  if (name.includes('science') || name.includes('chemistry')) return Beaker;
  if (name.includes('brain') || name.includes('logic')) return Brain;
  if (name.includes('trivia') || name.includes('general')) return Trophy;
  
  // Default fallback icon
  return HelpCircle;
};

// Generate color scheme based on quiz ID
const getQuizColor = (quiz) => {
  const colors = [
    'text-blue-500 bg-blue-100',
    'text-green-500 bg-green-100',
    'text-purple-500 bg-purple-100',
    'text-pink-500 bg-pink-100',
    'text-orange-500 bg-orange-100',
    'text-red-500 bg-red-100',
    'text-indigo-500 bg-indigo-100',
    'text-yellow-500 bg-yellow-100',
    'text-teal-500 bg-teal-100',
    'text-cyan-500 bg-cyan-100'
  ];
  
  // Use quiz ID to consistently assign colors
  const colorIndex = quiz.id ? Math.abs(quiz.id) % colors.length : 0;
  return colors[colorIndex];
};

function LearningPathHeader({ availableQuizzes = [], isLoading = false, onAddMore }) {
  // Get selected quiz from store for consistency
  const { selectedQuiz, setSelectedQuiz } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz);
    setIsOpen(false);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="flex justify-center">
      {/* Clickable card */}
      <div className="relative max-w-lg w-full">
            <button
              onClick={() => setIsOpen(true)}
              className="w-full bg-primary/10 border border-primary/20 hover:border-primary hover:bg-primary/15 text-base-content rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-between cursor-pointer"
            >
              {selectedQuiz ? (
                <div className="text-left">
                  <span className="text-base font-medium text-base-content">{selectedQuiz.name}</span>
                </div>
              ) : (
                <span className="text-base font-normal text-base-content/70">Select a quiz</span>
              )}
              
              {/* Chevron at the end */}
              <ChevronDown className="w-5 h-5 text-base-content/70" />
            </button>

            {/* Quiz Selector Dropdown */}
            {isOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                
                {/* Dropdown Container - Responsive positioning */}
                <div className="fixed top-32 left-0 right-0 z-50 md:absolute md:top-full md:left-0 md:w-96 md:mt-2">
                  <div className="mx-4 md:mx-0 bg-base-100 rounded-2xl shadow-2xl border border-base-200 animate-in slide-in-from-top duration-200">
                    {/* Header with close button */}
                    <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between">
                      <h3 className="font-semibold text-base-content">Choose Quiz</h3>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="btn btn-ghost btn-sm btn-circle hover:bg-base-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Quiz Grid */}
                    <div className="p-4">
                      {isLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="loading loading-spinner loading-lg"></div>
                        </div>
                      ) : availableQuizzes.length === 0 ? (
                        <div className="text-center py-8">
                          <HelpCircle className="w-12 h-12 text-base-content/40 mx-auto mb-3" />
                          <p className="text-base-content/70 text-sm mb-4">
                            No quizzes available.<br/>
                            Add a quiz code to get started!
                          </p>
                          
                          {/* Add More Quizzes Option - Always visible */}
                          <div className="flex justify-center">
                            <button
                              onClick={() => {
                                setIsOpen(false);
                                if (onAddMore) {
                                  onAddMore();
                                }
                              }}
                              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 bg-base-200/50 hover:bg-base-200 border-2 border-dashed border-base-300 hover:border-primary"
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                                <Plus className="w-5 h-5" />
                              </div>
                              <span className="text-xs font-medium text-center text-base-content">
                                Add More
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-3">
                          {availableQuizzes.map((quiz) => {
                            const QuizIcon = getQuizIcon(quiz);
                            const quizColor = getQuizColor(quiz);
                            const isSelected = selectedQuiz?.id === quiz.id;
                            
                            return (
                              <button
                                key={quiz.id}
                                onClick={() => handleQuizSelect(quiz)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-primary/10 border border-primary' 
                                    : 'bg-base-200/50 hover:bg-base-200'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${quizColor}`}>
                                  <QuizIcon className="w-5 h-5" />
                                </div>
                                <span className={`text-xs font-medium text-center ${
                                  isSelected ? 'text-primary' : 'text-base-content'
                                }`}>
                                  {quiz.name}
                                </span>
                              </button>
                            );
                          })}
                          
                          {/* Add More Quizzes Option */}
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              if (onAddMore) {
                                onAddMore();
                              }
                            }}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 bg-base-200/50 hover:bg-base-200 border-2 border-dashed border-base-300 hover:border-primary"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                              <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-center text-base-content">
                              Add More
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
    </div>
  );
}

export default LearningPathHeader;