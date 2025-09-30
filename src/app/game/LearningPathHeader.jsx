import { useTranslation } from 'react-i18next';
import useGameStore from '../../store/useGameStore';
import {
  Calculator,
  Globe,
  BookOpen,
  Palette,
  Music,
  Beaker,
  Brain,
  Trophy,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Default icon mapping for quizzes
const getQuizIcon = (quiz) => {
  const name = quiz.name?.toLowerCase() || '';

  if (name.includes('math') || name.includes('calculation')) return Calculator;
  if (name.includes('geography') || name.includes('world')) return Globe;
  if (name.includes('literature') || name.includes('book')) return BookOpen;
  if (name.includes('art') || name.includes('design')) return Palette;
  if (name.includes('music') || name.includes('sound')) return Music;
  if (name.includes('science') || name.includes('chemistry')) return Beaker;
  if (name.includes('brain') || name.includes('logic')) return Brain;
  if (name.includes('trivia') || name.includes('general')) return Trophy;

  return HelpCircle;
};

// Generate color scheme based on quiz ID
const getQuizColor = (quiz) => {
  const colors = [
    'text-primary bg-primary/10',
    'text-secondary bg-secondary/10',
    'text-accent bg-accent/10',
    'text-info bg-info/10',
    'text-success bg-success/10',
    'text-warning bg-warning/10',
    'text-error bg-error/10',
    'text-neutral bg-neutral/10',
    'text-base-content bg-base-300',
    'text-primary bg-primary/20'
  ];

  const colorIndex = quiz.id ? Math.abs(quiz.id) % colors.length : 0;
  return colors[colorIndex];
};

function LearningPathHeader({ onToggleQuizList, isQuizListOpen }) {
  const { selectedQuiz } = useGameStore();
  const { t } = useTranslation();

  const QuizIcon = selectedQuiz ? getQuizIcon(selectedQuiz) : HelpCircle;
  const quizColor = selectedQuiz ? getQuizColor(selectedQuiz) : 'text-base-content bg-base-300';

  return (
    <div className="flex justify-center">
      <div className="max-w-lg w-full">
        <button
          onClick={onToggleQuizList}
          className="w-full bg-primary/10 border border-primary/20 hover:border-primary hover:bg-primary/15 text-base-content rounded-lg px-4 py-3 transition-all duration-200 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${quizColor}`}>
              <QuizIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-base font-medium text-base-content">
                {selectedQuiz ? selectedQuiz.name : t("Select a quiz")}
              </span>
            </div>
          </div>

          {/* Chevron at the end - toggles based on quiz list state */}
          {isQuizListOpen ? (
            <ChevronUp className="w-5 h-5 text-base-content/70" />
          ) : (
            <ChevronDown className="w-5 h-5 text-base-content/70" />
          )}
        </button>
      </div>
    </div>
  );
}

export default LearningPathHeader;