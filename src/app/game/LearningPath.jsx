import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LearningPathHeader from "./LearningPathHeader";
import {
  Star,
  Zap,
  Crown,
  Lock,
  CheckCircle,
  BookOpen,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { database } from "../../lib/game/database";
import useGameStore from "../../store/useGameStore";

const LearningPath = forwardRef(({ onNavigateToShop, onLevelClick }, ref) => {
  // Get selected quiz from store for persistence
  const { selectedQuiz, setSelectedQuiz } = useGameStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State for levels and available quizzes
  const [levels, setLevels] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load quizzes from local database
  const loadQuizzes = async () => {
    try {
      setIsLoading(true);
      const quizzes = await database.getQuizzes();
      setAvailableQuizzes(quizzes);
    } catch (error) {
      console.error("Error loading quizzes:", error);
      setAvailableQuizzes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Load levels when a quiz is selected
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
        type: level.type || "normal",
        completed: Boolean(level.is_completed), // Load actual completion status from database
        locked: !Boolean(level.is_unlocked), // Load actual unlock status from database
      }));

      setLevels(transformedLevels);
    } catch (error) {
      console.error("Error loading levels for quiz:", selectedQuiz.id, error);
      setLevels([]);
    }
  };

  useEffect(() => {
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
        type: level.type || "normal",
        completed: Boolean(level.is_completed),
        locked: !Boolean(level.is_unlocked),
      }));

      setLevels(transformedLevels);
    } catch (error) {
      console.error("Error reloading levels for quiz:", selectedQuiz.id, error);
    }
  };

  // Expose reloadLevels function to parent component
  useImperativeHandle(ref, () => ({
    reloadLevels,
  }));

  // Handle level click - use callback if provided, otherwise navigate
  const handleLevelClick = async (level) => {
    if (level.locked) return;

    if (onLevelClick) {
      // Use callback (modal mode)
      onLevelClick(selectedQuiz.id, level.id, level.completed);
    } else {
      // Navigate to the quiz screen with the selected quiz ID and level ID
      // If the level is completed, open in readonly mode
      const queryParams = level.completed ? "?readonly=true" : "";
      navigate(`/quiz/${selectedQuiz.id}/${level.id}${queryParams}`);
    }
  };

  const getLevelIcon = (type) => {
    switch (type) {
      case "mini-boss":
        return <Zap className="w-6 h-6" />;
      case "boss":
        return <Crown className="w-8 h-8" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  // Color palette for level icons using DaisyUI theme-aware colors
  const getLevelColor = (levelId, type) => {
    if (type === "mini-boss" || type === "boss") {
      return type; // Keep existing special level colors
    }

    // Use DaisyUI theme-aware colors that work in both light and dark themes
    const learningAppColors = [
      "bg-primary text-primary-content",
      "bg-secondary text-secondary-content",
      "bg-accent text-accent-content",
      "bg-info text-info-content",
      "bg-success text-success-content",
      "bg-warning text-warning-content",
      "bg-error text-error-content",
      "bg-neutral text-neutral-content",
      "bg-base-300 text-base-content",
      "bg-primary/80 text-primary-content",
    ];

    // Use level ID to generate consistent random color for each level
    const colorIndex =
      Math.abs(
        levelId
          .toString()
          .split("")
          .reduce((a, b) => a + b.charCodeAt(0), 0)
      ) % learningAppColors.length;
    return learningAppColors[colorIndex];
  };

  const getLevelStyles = (type, completed, locked, levelId) => {
    const baseStyles =
      "relative flex items-center justify-center rounded-full w-12 h-12";
    const interactiveStyles = "transition-all duration-300 hover:scale-105";

    if (locked) {
      return `${baseStyles} bg-base-300 text-base-content/30 cursor-not-allowed`;
    }

    if (completed) {
      return `${baseStyles} ${interactiveStyles} bg-success text-success-content`;
    }

    switch (type) {
      case "mini-boss":
        return `${baseStyles} ${interactiveStyles} bg-warning text-warning-content`;
      case "boss":
        return `${baseStyles} ${interactiveStyles} bg-error text-error-content`;
      default: {
        const levelColor = getLevelColor(levelId, type);
        return `${baseStyles} ${interactiveStyles} ${levelColor}`;
      }
    }
  };

  // Placeholder component for no quizzes available
  const NoQuizzesPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <BookOpen className="w-16 h-16 text-base-content/40 mx-auto mb-6" />
        <h3 className="text-xl font-semibold text-base-content mb-2">
          {t("No Quizzes Available")}
        </h3>
        <p className="text-base-content/70 mb-6">
          {t(
            "To start your learning journey, you need to add quizzes first..."
          )}
        </p>

        <button
          className="btn btn-primary w-full mb-6"
          onClick={() => navigate("/learning-hub/quizzes")}
        >
          <Plus className="w-4 h-4" />
          {t("Go to Quizzes")}
        </button>

        <div className="alert alert-info">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">
            {t(
              "Use a valid quiz code to unlock learning paths and challenges."
            )}
          </span>
        </div>
      </div>
    </div>
  );

  // Placeholder component for no quiz selected
  const NoQuizSelectedPlaceholder = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <Star className="w-16 h-16 text-base-content/40 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-base-content mb-2">
          {t("Select a Quiz to Begin")}
        </h3>
        <p className="text-base-content/70 mb-4">
          {t(
            "Choose a quiz from the selector above to view your learning path..."
          )}
        </p>
        <div className="alert alert-warning">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">
            {t("Your learning journey awaits! Pick a subject to get started.")}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Second Sticky Header - Quiz Selector */}
      <div className="flex-shrink-0 bg-base-100 border-b border-base-200 p-4">
        <LearningPathHeader
          availableQuizzes={availableQuizzes}
          isLoading={isLoading}
          onAddMore={onNavigateToShop}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-96">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : availableQuizzes.length === 0 ? (
          <NoQuizzesPlaceholder />
        ) : !selectedQuiz ? (
          <NoQuizSelectedPlaceholder />
        ) : (
          <div className="flex justify-center h-full">
            <div className="max-w-lg w-full px-4">
              {/* Level nodes */}
              <div className="relative space-y-1 py-4">
                {/* Vertical connecting line - aligned with center of icons */}
                <div
                  className="absolute top-4 bottom-4 w-1 bg-base-300"
                  style={{ left: "calc(1rem + 1.5rem)" }}
                ></div>
                {levels.map((level, index) => (
                  <div key={level.id} className="relative">
                    {/* Level card with icon and name */}
                    <div
                      className={`relative z-10 p-4 rounded-lg ${
                        level.locked
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer hover:bg-primary/20 transition-all duration-200"
                      }`}
                      onClick={() => handleLevelClick(level)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Level icon - Each level gets a different color based on its position */}
                        <div
                          className={`${getLevelStyles(
                            level.type,
                            level.completed,
                            level.locked,
                            level.id
                          )} flex-shrink-0`}
                        >
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
                          <h3
                            className={`text-lg font-semibold ${
                              level.locked
                                ? "text-base-content/50"
                                : "text-base-content"
                            }`}
                          >
                            {level.name}
                          </h3>
                          {level.completed && (
                            <span className="text-xs text-base-content/50">
                              {t("Click to review")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator for the connecting line - aligned with center of icons */}
                    {index < levels.length - 1 && (
                      <div
                        className={`absolute top-full w-1 h-6 z-0 ${
                          level.completed ? "bg-success" : "bg-base-300"
                        }`}
                        style={{ left: "calc(1rem + 1.5rem)" }}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LearningPath.displayName = "LearningPath";

export default LearningPath;
