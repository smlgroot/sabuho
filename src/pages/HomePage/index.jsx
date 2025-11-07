import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, BarChart3, Sparkles, Zap, AlertCircle, CheckCircle, RotateCcw, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useQuizProcessing } from "@/hooks/useQuizProcessing";
import FileUploadStep from "./components/steps/file-upload-step";
import ProcessingStep from "./components/steps/processing-step";
import ResultsStep from "./components/steps/results-step";
import ShareMonetizeStep from "./components/steps/share-monetize-step";
import TopicsSidebar from "./components/results/topics-sidebar";
import QuestionsPanel from "./components/results/questions-panel";

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
    resetFile
  } = useFileUpload((file) => {
    // Callback when file is selected - reset processing state
    setCurrentStep(2);
    setQuizGenerated(false);
    setSelectedTopicIndex(null);
    resetProcessing();
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
    handleProcessClick,
    handleRetry,
    resetProcessing
  } = useQuizProcessing();

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

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

  const performReset = () => {
    resetFile();
    resetProcessing();
    setQuizGenerated(false);
    setCurrentStep(1);
    setSelectedTopicIndex(null);
    setShowResetDialog(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
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

  // Sample documents for demo
  const sampleDocuments = [
    {
      title: "Biology Notes",
      icon: "🧬",
      type: "PDF",
      description: "Cell Structure & Functions"
    },
    {
      title: "History Essay",
      icon: "📜",
      type: "DOCX",
      description: "World War II Overview"
    },
    {
      title: "Physics Guide",
      icon: "⚛️",
      type: "TXT",
      description: "Newton's Laws of Motion"
    }
  ];

  // Sample quiz questions for demo
  const sampleQuestions = [
    {
      question: "What is the main topic covered in this document?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      type: "multiple-choice"
    },
    {
      question: "Which of the following statements is correct based on the document?",
      options: ["Statement 1", "Statement 2", "Statement 3", "Statement 4"],
      type: "multiple-choice"
    },
    {
      question: "True or False: The document discusses advanced concepts.",
      options: ["True", "False"],
      type: "true-false"
    }
  ];

  const features = [
    { icon: Zap, title: "AI-Powered" },
    { icon: Brain, title: "Smart Learning" },
    { icon: Target, title: "Interactive Quizzes" },
    { icon: Trophy, title: "Achievements" }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="navbar bg-white border-b border-gray-200 px-6 sticky top-0 z-50 shadow-sm">
        <div className="flex-1">
          <a href="/" className="flex items-center gap-3 group cursor-pointer">
            <img
              src="/sabuho_logo_3.png"
              alt="Sabuho Logo"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-black tracking-tight">
              Sabuho<span className="text-primary">.</span>
            </span>
          </a>
        </div>
        <div className="flex-none">
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                <Globe className="w-5 h-5" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-white rounded-lg shadow-lg z-[1] w-40 p-2 border border-gray-100"
              >
                <li>
                  <button
                    onClick={() => changeLanguage("en")}
                    className={language === "en" ? "active" : ""}
                  >
                    🇺🇸 English
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => changeLanguage("es")}
                    className={language === "es" ? "active" : ""}
                  >
                    🇪🇸 Spanish
                  </button>
                </li>
              </ul>
            </div>

            {user && (
              <button
                onClick={() => navigate("/admin")}
                className="btn btn-ghost"
              >
                {t("Admin")}
              </button>
            )}

            <button onClick={handleHeaderButton} className="btn btn-primary">
              {user ? t("Logout") : t("Sign In")}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - AI Document to Quiz */}
      <section className="hero min-h-[85vh] bg-gradient-to-b from-blue-50 to-white">
        <div className="hero-content px-6 w-full py-16">
          <div className="max-w-5xl w-full">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-tight tracking-tight">
              <div className="flex items-center gap-6 flex-wrap">
                <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">Any Document</span>

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 animate-pulse"></div>
                  <div className="relative bg-white rounded-full p-4 shadow-2xl">
                    <Brain className="w-10 h-10 sm:w-14 sm:h-14 text-blue-600" />
                  </div>
                  <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-bounce" />
                  <Sparkles className="w-4 h-4 text-blue-400 absolute -bottom-1 -left-1 animate-ping" />
                </div>

                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Interactive Quiz</span>
              </div>
            </h1>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl">
              Upload your content and watch AI instantly create personalized, interactive quizzes tailored to what you need to learn
            </p>

            {/* 4-Step Process Section */}
            <div className="max-w-5xl mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FileUploadStep
                  uploadedFile={uploadedFile}
                  fileInputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  onReset={handleResetClick}
                />

                <ProcessingStep
                  currentStep={currentStep}
                  isProcessing={isProcessing}
                  processingError={processingError}
                  currentProcessingState={currentProcessingState}
                  onProcessClick={async () => {
                    await handleProcessClick(uploadedFile);
                    setQuizGenerated(true);
                    setCurrentStep(3);
                  }}
                  onRetry={handleRetry}
                />

                <ResultsStep
                  currentStep={currentStep}
                  topics={topics}
                  totalQuestionsGenerated={totalQuestionsGenerated}
                  questionsCount={questionsCount}
                />

                <ShareMonetizeStep quizGenerated={quizGenerated} />
              </div>

              {/* Result Section - Topics and Questions */}
              {currentStep === 3 && (
                <div className="mt-6 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  {/* Header with Stats */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        Topics & Questions
                      </h3>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-gray-600">Topics: </span>
                          <span className="font-bold text-blue-600">{topics.length}</span>
                        </div>
                        <div className="text-gray-400">•</div>
                        <div>
                          <span className="text-gray-600">Total Questions: </span>
                          <span className="font-bold text-gray-900">{totalQuestionsGenerated}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Header Tab */}
                  <div className="flex items-center gap-1">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-200 border-b-0 rounded-t-lg max-w-xs relative" style={{ marginBottom: '-8px', zIndex: 100 }}>
                      <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-blue-900 truncate">
                        {uploadedFile ? uploadedFile.name : 'Processed Document'}
                      </p>
                    </div>
                    <button
                      onClick={handleResetClick}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-primary hover:bg-primary-focus text-white transition-colors mb-2 shadow-md hover:shadow-lg"
                      title="Start new document"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Vertical Tab Layout */}
                  <div className="flex flex-col border-2 border-blue-200 rounded-lg">
                    {/* Document Header inside content */}
                    <div className="flex items-center justify-between px-6 pt-5 pb-4 bg-base-100">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <h4 className="text-lg font-bold text-gray-900">
                          {uploadedFile ? uploadedFile.name : 'Processed Document'}
                        </h4>
                        <div className="badge badge-primary badge-sm">1 doc</div>
                      </div>
                      <button
                        onClick={handleResetClick}
                        className="btn btn-sm btn-primary gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Document
                      </button>
                    </div>

                    {/* Topics and Questions Layout */}
                    <div className="flex p-4">
                    <TopicsSidebar
                      topics={topics}
                      questions={questions}
                      questionsCount={questionsCount}
                      selectedTopicIndex={selectedTopicIndex}
                      onTopicSelect={setSelectedTopicIndex}
                    />

                    <QuestionsPanel
                      topics={topics}
                      questions={questions}
                      selectedTopicIndex={selectedTopicIndex}
                      totalQuestionsGenerated={totalQuestionsGenerated}
                      questionsCount={questionsCount}
                    />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex rounded-lg bg-blue-100 p-4 mb-3">
                    <Icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{feature.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-10 text-center text-gray-900">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Upload</h3>
              <p className="text-sm text-gray-600">Add your document</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Generate</h3>
              <p className="text-sm text-gray-600">AI creates quiz</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Learn</h3>
              <p className="text-sm text-gray-600">Track progress</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-blue-600 to-blue-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold mb-8 text-white">
            Start Learning Smarter
          </h2>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn bg-white hover:bg-gray-100 text-blue-600 border-0 rounded-lg font-semibold px-8 text-base shadow-xl hover:shadow-2xl transition-all"
          >
            Try Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer footer-center bg-white border-t border-gray-200 text-gray-900 py-8 px-6">
        <aside>
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/sabuho_logo_3.png"
              alt="Sabuho Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-xl font-bold tracking-tight">
              Sabuho<span className="text-blue-600">.</span>
            </span>
          </div>
          <p className="text-gray-500 text-sm">
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
    </div>
  );
}
