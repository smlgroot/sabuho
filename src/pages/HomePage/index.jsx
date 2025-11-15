import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, Zap, AlertCircle, RotateCcw, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useQuizProcessing } from "@/hooks/useQuizProcessing";
import { useQuestionAttempts } from "@/hooks/useQuestionAttempts";
import { filterQuestionsByState } from "@/utils/questionStats";
import TopicsQuestionsView from "@/components/TopicsQuestionsView";
import QuizConfigView from "@/components/QuizConfigView";
import QuizAttemptView from "@/components/QuizAttemptView";
import QuizInsightsView from "@/components/QuizInsightsView";
import HeroSection from "./components/hero-section";
import ProcessStepsModal from "./components/process-steps-modal";

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const { trackEvent } = usePostHog();

  // Custom hooks for file upload and quiz processing
  const {
    uploadedFile,
    fileInputRef,
    handleFileSelect,
    resetFile,
    validationError,
    clearValidationError
  } = useFileUpload(() => {
    // Callback when file is selected
    setCurrentStep(2);
    setQuizGenerated(false);
  });

  const {
    isProcessing,
    currentProcessingState,
    topics,
    questions,
    questionsCount,
    totalQuestionsGenerated,
    s3Key,
    processingError,
    retryError,
    resourceRepositoryId,
    sessions,
    handleProcessClick,
    handleRetry,
    resetProcessing,
    clearRetryError
  } = useQuizProcessing();

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showProcessStepsModal, setShowProcessStepsModal] = useState(false);

  // View stack navigation state
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'quiz-config' | 'quiz-attempt' | 'quiz-insights'
  const [viewStack, setViewStack] = useState(['home']);
  const [selectedQuestionStates, setSelectedQuestionStates] = useState([]);
  const [quizCompletionStats, setQuizCompletionStats] = useState(null);

  // Question attempts tracking (localStorage-based)
  const questionAttemptsHook = useQuestionAttempts(resourceRepositoryId);

  const handleMainButton = () => {
    if (user) {
      trackEvent('admin_access_clicked', { props: { source: 'homepage' } });
      navigate("/admin");
    } else {
      trackEvent('login_clicked', { props: { source: 'homepage' } });
      navigate("/auth");
    }
  };

  const handleHeaderButton = async () => {
    if (user) {
      trackEvent('logout_clicked', { props: { source: 'homepage' } });
      try {
        const { error } = await signOut();
        if (error) {
          // Error handled silently
        }
        navigate("/");
      } catch (err) {
        navigate("/");
      }
    } else {
      trackEvent('signin_clicked', { props: { source: 'homepage_header' } });
      navigate("/auth");
    }
  };

  const changeLanguage = (lng) => {
    trackEvent('language_changed', { props: { language: lng, source: 'homepage' } });
    setLanguage(lng);
  };

  const handleResetClick = () => {
    // Only show confirmation if there's actual data to lose
    if (uploadedFile || topics.length > 0 || questions.length > 0) {
      setShowResetDialog(true);
    } else {
      // No data to lose, reset immediately
      performReset();
    }
  };

  const handleGetStarted = () => {
    // Open the process steps modal for file upload
    setShowProcessStepsModal(true);
  };

  // Reset just the file without closing modal (used by modal's reset button)
  const handleModalFileReset = () => {
    resetFile();
    resetProcessing();
    setCurrentStep(1);
    setQuizGenerated(false);
  };

  const performReset = () => {
    resetFile();
    resetProcessing();
    setQuizGenerated(false);
    setCurrentStep(1);
    setShowResetDialog(false);
    setShowProcessStepsModal(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  const handleProcess = async () => {
    if (!uploadedFile) return;

    try {
      await handleProcessClick(uploadedFile);
      setQuizGenerated(true);
      setCurrentStep(3);
    } catch (error) {
      // Error handling is done in useQuizProcessing hook
    }
  };

  const handleRetryWrapper = async () => {
    // If s3Key exists, retry from where it left off (just poll for results)
    // If no s3Key, it means upload failed - so re-upload and process from scratch
    try {
      if (s3Key) {
        await handleRetry();
        // Update state after successful retry
        setQuizGenerated(true);
        setCurrentStep(3);
      } else {
        await handleProcess();
      }
    } catch (error) {
      // Error handling is done in useQuizProcessing hook
    }
  };

  // Close modal after successful completion - keep data visible
  const handleDoneAndClose = () => {
    setShowProcessStepsModal(false);
    setCurrentStep(1);
    setQuizGenerated(false);
    resetFile();
    // Don't reset processing - keep topics and questions visible
  };

  // Close modal and reset only current upload attempt (keep existing processed data)
  const handleCancelAndClose = () => {
    setShowProcessStepsModal(false);
    setCurrentStep(1);
    setQuizGenerated(false);
    resetFile();
    // Don't reset processing - preserve existing topics and questions from previous uploads
  };

  // View stack navigation functions
  const pushView = (view) => {
    setViewStack(prev => [...prev, view]);
    setCurrentView(view);
  };

  const popView = () => {
    setViewStack(prev => {
      if (prev.length <= 1) return prev;
      const newStack = prev.slice(0, -1);
      setCurrentView(newStack[newStack.length - 1]);
      return newStack;
    });
  };

  const resetToHome = () => {
    setViewStack(['home']);
    setCurrentView('home');
    setSelectedQuestionStates([]);
    setQuizCompletionStats(null);
  };

  // Handle start learning button click
  const handleStartLearning = () => {
    trackEvent('start_learning_clicked', { props: { source: 'homepage' } });
    pushView('quiz-config');
  };

  // Handle quiz configuration completion
  const handleStartQuiz = (selectedStates) => {
    setSelectedQuestionStates(selectedStates);
    trackEvent('quiz_started', {
      props: {
        source: 'homepage',
        selectedStates: selectedStates.join(','),
      },
    });
    pushView('quiz-attempt');
  };

  // Handle quiz completion
  const handleQuizComplete = (stats) => {
    setQuizCompletionStats(stats);
    trackEvent('quiz_completed', {
      props: {
        source: 'homepage',
        ...stats,
      },
    });
    // Show completion modal or navigate back
    resetToHome();
  };

  // Handle quiz exit
  const handleQuizExit = () => {
    trackEvent('quiz_exited', { props: { source: 'homepage' } });
    popView();
  };

  // Handle show insights
  const handleShowInsights = () => {
    trackEvent('insights_viewed', { props: { source: 'homepage' } });
    pushView('quiz-insights');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/70 mt-2">{t("Loading...")}</p>
        </div>
      </div>
    );
  }

  // Mock data for demonstrating Topics & Questions feature
  const mockTopics = [
    {
      id: "topic-1",
      name: "Cell Biology Basics",
      description: "Understanding the fundamental structure and functions of cells",
      questionsCount: 5,
      color: "primary"
    },
    {
      id: "topic-2",
      name: "Organelles and Their Functions",
      description: "Exploring the various organelles within cells and their roles",
      questionsCount: 4,
      color: "secondary"
    },
    {
      id: "topic-3",
      name: "Cell Division",
      description: "Understanding mitosis and meiosis processes",
      questionsCount: 3,
      color: "accent"
    }
  ];

  const mockQuestions = [
    {
      id: "q1",
      resource_session_domain_id: "topic-1",
      body: "What is the primary function of the cell membrane?",
      options: [
        "To control what enters and exits the cell [correct]",
        "To produce energy",
        "To store genetic information",
        "To synthesize proteins"
      ],
      type: "multiple-choice",
      difficulty: "easy"
    },
    {
      id: "q2",
      resource_session_domain_id: "topic-1",
      body: "Which component is found in plant cells but not in animal cells?",
      options: [
        "Mitochondria",
        "Cell wall [correct]",
        "Nucleus",
        "Ribosomes"
      ],
      type: "multiple-choice",
      difficulty: "medium"
    },
    {
      id: "q3",
      resource_session_domain_id: "topic-1",
      body: "The nucleus contains the cell's genetic material.",
      options: ["True [correct]", "False"],
      type: "true-false",
      difficulty: "easy"
    },
    {
      id: "q4",
      resource_session_domain_id: "topic-1",
      body: "What is the jelly-like substance that fills the cell?",
      options: [
        "Cytoplasm [correct]",
        "Chloroplast",
        "Vacuole",
        "Endoplasmic reticulum"
      ],
      type: "multiple-choice",
      difficulty: "easy"
    },
    {
      id: "q5",
      resource_session_domain_id: "topic-1",
      body: "Which structure is responsible for protein synthesis?",
      options: [
        "Golgi apparatus",
        "Ribosomes [correct]",
        "Lysosomes",
        "Peroxisomes"
      ],
      type: "multiple-choice",
      difficulty: "medium"
    },
    {
      id: "q6",
      resource_session_domain_id: "topic-2",
      body: "What is the powerhouse of the cell?",
      options: [
        "Nucleus",
        "Mitochondria [correct]",
        "Chloroplast",
        "Ribosome"
      ],
      type: "multiple-choice",
      difficulty: "easy"
    },
    {
      id: "q7",
      resource_session_domain_id: "topic-2",
      body: "The Golgi apparatus packages and distributes proteins.",
      options: ["True [correct]", "False"],
      type: "true-false",
      difficulty: "medium"
    },
    {
      id: "q8",
      resource_session_domain_id: "topic-2",
      body: "Which organelle is responsible for photosynthesis in plant cells?",
      options: [
        "Mitochondria",
        "Nucleus",
        "Chloroplast [correct]",
        "Vacuole"
      ],
      type: "multiple-choice",
      difficulty: "medium"
    },
    {
      id: "q9",
      resource_session_domain_id: "topic-2",
      body: "Lysosomes contain digestive enzymes that break down waste materials.",
      options: ["True [correct]", "False"],
      type: "true-false",
      difficulty: "medium"
    },
    {
      id: "q10",
      resource_session_domain_id: "topic-3",
      body: "How many daughter cells are produced during mitosis?",
      options: ["1", "2 [correct]", "4", "8"],
      type: "multiple-choice",
      difficulty: "medium"
    },
    {
      id: "q11",
      resource_session_domain_id: "topic-3",
      body: "Meiosis produces genetically identical cells.",
      options: ["True", "False [correct]"],
      type: "true-false",
      difficulty: "medium"
    },
    {
      id: "q12",
      resource_session_domain_id: "topic-3",
      body: "Which type of cell division produces gametes (sex cells)?",
      options: [
        "Mitosis",
        "Meiosis [correct]",
        "Binary fission",
        "Budding"
      ],
      type: "multiple-choice",
      difficulty: "hard"
    }
  ];

  const mockSessions = [
    {
      id: "session-demo",
      name: "Cell Biology Study Guide.pdf",
      status: "completed",
      created_at: new Date().toISOString()
    }
  ];

  // Determine if we should show demo data or user data
  const hasUserData = sessions.length > 0 || topics.length > 0;
  const displayTopics = hasUserData ? topics : mockTopics;
  const displayQuestions = hasUserData ? questions : mockQuestions;
  const displaySessions = hasUserData ? sessions : mockSessions;
  const isReadOnlyMode = !hasUserData;

  // Filter questions for quiz attempt based on selected states
  const filteredQuestionsForQuiz = useMemo(() => {
    return filterQuestionsByState(
      displayQuestions,
      questionAttemptsHook.attempts,
      selectedQuestionStates
    );
  }, [displayQuestions, questionAttemptsHook.attempts, selectedQuestionStates]);

  const features = [
    { icon: Zap, title: "AI-Powered" },
    { icon: Brain, title: "Smart Learning" },
    { icon: Target, title: "Interactive Quizzes" },
    { icon: Trophy, title: "Achievements" }
  ];

  // Render quiz attempt view (full screen)
  if (currentView === 'quiz-attempt') {
    return (
      <QuizAttemptView
        questions={filteredQuestionsForQuiz}
        selectedStates={selectedQuestionStates}
        recordAttempt={questionAttemptsHook.recordAttempt}
        getAttempt={questionAttemptsHook.getAttempt}
        onComplete={handleQuizComplete}
        onExit={handleQuizExit}
      />
    );
  }

  // Render home view (default)
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="navbar bg-base-100 border-b border-base-content/10 px-6 sticky top-0 z-50">
        <div className="flex-1">
          <a href="/" className="flex items-center gap-2 group cursor-pointer">
            <img
              src="/sabuho_logo_3.png"
              alt="Sabuho Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-xl font-semibold tracking-tight uppercase">
              Sabuho
            </span>
          </a>
        </div>
        <div className="flex-none">
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                <Globe className="w-4 h-4" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-100 shadow-lg z-[1] w-40 p-2 border border-base-content/10"
              >
                <li>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={language === "en" ? "active" : ""}
                  >
                    English
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => changeLanguage("es")}
                    className={language === "es" ? "active" : ""}
                  >
                    Spanish
                  </button>
                </li>
              </ul>
            </div>

            {user && (
              <button
                onClick={() => navigate("/admin")}
                className="btn btn-ghost btn-sm"
              >
                {t("Admin")}
              </button>
            )}

            <button onClick={handleHeaderButton} className="btn btn-primary btn-sm">
              {user ? t("Logout") : t("Sign In")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - AI Document to Quiz */}
      <section className="hero bg-base-100">
        <div className="hero-content px-6 w-full py-16">
          <div className="max-w-5xl w-full">
            {/* Main Heading - Always Visible */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-6 leading-tight">
                <span>Transform Documents into</span>
                <br />
                <span className="text-primary">Interactive Quizzes</span>
              </h1>

              <p className="text-base text-base-content/70 max-w-3xl mx-auto font-normal">
                Upload your content and let AI generate personalized quizzes to test your knowledge.
              </p>
            </div>

            {/* Conditionally render views based on currentView */}
            {currentView === 'home' && (
              <TopicsQuestionsView
                topics={displayTopics}
                questions={displayQuestions}
                sessions={displaySessions}
                isProcessing={isProcessing}
                totalQuestionsGenerated={hasUserData ? totalQuestionsGenerated : mockQuestions.length}
                onAddDocument={() => setShowProcessStepsModal(true)}
                onStartLearning={handleStartLearning}
                onShowInsights={handleShowInsights}
                actionButtons={
                  displayTopics.length > 0 ? (
                    <button
                      onClick={handleStartLearning}
                      className="btn btn-accent gap-2 shadow-lg"
                    >
                      <Trophy className="w-5 h-5" />
                      Start Learning
                    </button>
                  ) : null
                }
                showDocumentInfo={true}
                showAddDocumentButton={true}
                showStartLearningButton={false}
                readOnly={isReadOnlyMode}
                isDemo={isReadOnlyMode}
              />
            )}

            {currentView === 'quiz-config' && (
              <QuizConfigView
                questions={displayQuestions}
                attempts={questionAttemptsHook.attempts}
                onStartQuiz={handleStartQuiz}
                onBack={popView}
              />
            )}

            {currentView === 'quiz-insights' && (
              <QuizInsightsView
                questions={displayQuestions}
                attempts={questionAttemptsHook.attempts}
                onBack={popView}
              />
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 bg-base-200/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold mb-8 text-center uppercase tracking-wide">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center border border-base-content/10 bg-base-100 p-4">
                  <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <h3 className="text-xs font-semibold uppercase">{feature.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-6 bg-base-100">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-10 text-center uppercase tracking-wide">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-base-content/10 p-6 bg-base-100">
              <div className="bg-primary text-primary-content w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                1
              </div>
              <h3 className="font-semibold mb-2 uppercase text-sm">Upload</h3>
              <p className="text-sm text-base-content/60">Add your document</p>
            </div>

            <div className="border border-base-content/10 p-6 bg-base-100">
              <div className="bg-primary text-primary-content w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                2
              </div>
              <h3 className="font-semibold mb-2 uppercase text-sm">Generate</h3>
              <p className="text-sm text-base-content/60">AI creates quiz</p>
            </div>

            <div className="border border-base-content/10 p-6 bg-base-100">
              <div className="bg-primary text-primary-content w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                3
              </div>
              <h3 className="font-semibold mb-2 uppercase text-sm">Learn</h3>
              <p className="text-sm text-base-content/60">Track progress</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-8 text-primary-content uppercase tracking-wide">
            Start Learning Smarter
          </h2>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn btn-lg bg-base-100 hover:bg-base-200 text-base-content border-0 font-semibold px-8"
          >
            Try Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-center bg-base-100 border-t border-base-content/10 py-8 px-6">
        <aside>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/sabuho_logo_3.png"
              alt="Sabuho Logo"
              className="h-6 w-auto object-contain"
            />
            <span className="text-lg font-semibold tracking-tight uppercase">
              Sabuho
            </span>
          </div>
          <p className="text-base-content/60 text-xs">
            © {new Date().getFullYear()} Sabuho
          </p>
        </aside>
      </footer>

      {/* Reset Confirmation Dialog */}
      <dialog className={`modal ${showResetDialog ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-warning" />
            Start Over?
          </h3>
          <p className="py-4">
            Are you sure you want to start over? All your current progress, including generated questions and topics, will be lost.
          </p>
          <div className="modal-action">
            <button onClick={handleCancelReset} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={performReset} className="btn btn-error">
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={handleCancelReset}>
          <button>close</button>
        </form>
      </dialog>

      {/* Process Steps Modal */}
      <ProcessStepsModal
        isOpen={showProcessStepsModal}
        onDone={handleDoneAndClose}
        onCancel={handleCancelAndClose}
        uploadedFile={uploadedFile}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onReset={handleModalFileReset}
        currentStep={currentStep}
        isProcessing={isProcessing}
        processingError={processingError}
        retryError={retryError}
        validationError={validationError}
        currentProcessingState={currentProcessingState}
        onProcessClick={handleProcess}
        onRetry={handleRetryWrapper}
        onClearValidationError={clearValidationError}
        onClearRetryError={clearRetryError}
        quizGenerated={quizGenerated}
      />
    </div>
  );
}
