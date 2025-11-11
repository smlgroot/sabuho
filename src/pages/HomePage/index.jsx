import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, BarChart3, Sparkles, Zap, AlertCircle, CheckCircle, RotateCcw, Plus } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import { useFileUpload, DOCUMENT_STATUS } from "@/hooks/useFileUpload";
import { useQuizProcessing } from "@/hooks/useQuizProcessing";
import FileUploadStep from "./components/steps/file-upload-step";
import ProcessingStep from "./components/steps/processing-step";
import ShareMonetizeStep from "./components/steps/share-monetize-step";
import TopicsSidebar from "./components/results/topics-sidebar";
import QuestionsPanel from "./components/results/questions-panel";
import { DocumentQueue } from "@/components/DocumentQueue";
import HeroSection from "./components/hero-section";

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const { trackEvent } = usePostHog();

  // Custom hooks for file upload and quiz processing
  const {
    documentQueue,
    uploadedFile,
    fileInputRef,
    handleFileSelect,
    removeDocumentFromQueue,
    updateDocumentStatus,
    getPendingDocuments,
    getProcessingDocument,
    resetDocumentQueue,
    resetFile,
    DOCUMENT_STATUS: DOC_STATUS
  } = useFileUpload((newDocument, currentQueue) => {
    // Callback when file is selected
    // Show processing step if we have documents to process
    if (currentQueue.length > 0 || sessions.length === 0) {
      setCurrentStep(2);
      setQuizGenerated(false);
      setSelectedTopicIndex(null);
    }
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
    resourceRepositoryId,
    sessions,
    handleProcessClick,
    handleRetry,
    resetProcessing
  } = useQuizProcessing();

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [currentProcessingDocId, setCurrentProcessingDocId] = useState(null);
  const [showProcessSections, setShowProcessSections] = useState(false);

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

  const handleAddDocument = () => {
    // Trigger file input to add another document
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleResetClick = () => {
    // Only show confirmation if there's actual data to lose
    if (documentQueue.length > 0 || topics.length > 0 || questions.length > 0) {
      setShowResetDialog(true);
    } else {
      // No data to lose, reset immediately
      performReset();
    }
  };

  const handleGetStarted = () => {
    // Show the process sections only
    setShowProcessSections(true);
  };

  const performReset = () => {
    resetDocumentQueue();
    resetProcessing();
    setQuizGenerated(false);
    setCurrentStep(1);
    setSelectedTopicIndex(null);
    setShowResetDialog(false);
    setShowProcessSections(false);
  };

  const handleCancelReset = () => {
    setShowResetDialog(false);
  };

  // Process documents from the queue sequentially
  const processNextDocument = useCallback(async () => {
    const pendingDocs = getPendingDocuments();

    if (pendingDocs.length === 0 || isProcessing) {
      return;
    }

    const nextDoc = pendingDocs[0];
    setCurrentProcessingDocId(nextDoc.id);
    updateDocumentStatus(nextDoc.id, {
      status: DOC_STATUS.PROCESSING,
      progress: { stage: 'Starting...', current: 0, total: 100 }
    });

    try {
      await handleProcessClick(nextDoc.file);
      updateDocumentStatus(nextDoc.id, {
        status: DOC_STATUS.COMPLETED,
        progress: { stage: 'Complete', current: 100, total: 100 }
      });
      setQuizGenerated(true);
      setCurrentStep(3);

      // Check if there are more documents to process
      const remainingPending = getPendingDocuments();
      if (remainingPending.length > 1) { // More than the one we just processed
        // Continue processing next document
        setTimeout(() => processNextDocument(), 500);
      }
    } catch (error) {
      updateDocumentStatus(nextDoc.id, {
        status: DOC_STATUS.FAILED,
        error: error.message || 'Processing failed'
      });
    } finally {
      setCurrentProcessingDocId(null);
    }
  }, [getPendingDocuments, isProcessing, updateDocumentStatus, handleProcessClick]);

  // Watch for processing state changes to update the current document's progress
  useEffect(() => {
    if (currentProcessingDocId && currentProcessingState) {
      updateDocumentStatus(currentProcessingDocId, {
        progress: {
          stage: currentProcessingState,
          current: 50, // You could calculate this based on the state
          total: 100
        }
      });
    }
  }, [currentProcessingDocId, currentProcessingState, updateDocumentStatus]);

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
      <header className="navbar bg-base-100 border-b border-base-300 px-6 sticky top-0 z-50">
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
                className="dropdown-content menu bg-base-100 shadow-lg z-[1] w-40 p-2 border border-base-300"
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
      <section className="hero min-h-[85vh] bg-base-100">
        <div className="hero-content px-6 w-full py-16">
          <div className="max-w-5xl w-full">
            {/* Main Heading - Always Visible */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span>Transform Documents into</span>
              <br />
              <span className="text-primary">Interactive Quizzes</span>
            </h1>

            <p className="text-lg text-base-content/70 mb-12 max-w-2xl font-normal">
              Upload your content and let AI generate personalized quizzes to test your knowledge.
            </p>

            {/* Show Hero when no activity and user hasn't clicked Get Started, otherwise show process sections */}
            {!showProcessSections && documentQueue.length === 0 && sessions.length === 0 && topics.length === 0 ? (
              <HeroSection onGetStarted={handleGetStarted} />
            ) : (
              /* Unified Section - Steps + Topics & Questions */
              <div className="max-w-5xl mb-8">
                <div className="bg-base-200/50 border border-base-300 p-6">
                  {/* Steps Section - Always Fully Visible */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold uppercase tracking-wide text-base-content/60 mb-4">Process Steps</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FileUploadStep
                        uploadedFile={uploadedFile}
                        fileInputRef={fileInputRef}
                        onFileSelect={handleFileSelect}
                        onReset={handleResetClick}
                        documentQueue={documentQueue}
                      />

                      <ProcessingStep
                        currentStep={currentStep}
                        isProcessing={isProcessing}
                        processingError={processingError}
                        currentProcessingState={currentProcessingState}
                        onProcessClick={processNextDocument}
                        onRetry={handleRetry}
                      />

                      <ShareMonetizeStep quizGenerated={quizGenerated} />
                    </div>

                    {/* Document Queue Display */}
                    {documentQueue.length > 0 && (
                      <DocumentQueue
                        documentQueue={documentQueue}
                        onRemoveDocument={removeDocumentFromQueue}
                        className="mt-4"
                      />
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-base-300 my-6"></div>

                  {/* Topics & Questions Section - With State-based Opacity */}
                  <div className={`transition-opacity ${
                    (isProcessing || topics.length > 0 || sessions.length > 0)
                      ? 'opacity-100'
                      : 'opacity-50'
                  }`}>
                    {/* Header with Stats and Document Management */}
                    <div className="mb-6 pb-4 border-b border-base-300">
                      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                        <h3 className={`text-base font-semibold uppercase tracking-wide flex items-center gap-2 ${
                          (isProcessing || topics.length > 0 || sessions.length > 0)
                            ? 'text-base-content/60'
                            : 'text-base-content/30'
                        }`}>
                          <BookOpen className={`w-5 h-5 ${
                            (isProcessing || topics.length > 0 || sessions.length > 0)
                              ? 'text-primary'
                              : 'text-base-content/30'
                          }`} />
                          Topics & Questions
                        </h3>
                        <div className="flex items-center gap-4 text-sm font-mono">
                          <div>
                            <span className="text-base-content/60">Topics: </span>
                            <span className="font-bold text-primary">{topics.length}</span>
                          </div>
                          <div className="text-base-content/30">|</div>
                          <div>
                            <span className="text-base-content/60">Questions: </span>
                            <span className="font-bold">{totalQuestionsGenerated}</span>
                          </div>
                        </div>
                      </div>

                      {/* Document List - Compact View */}
                      {sessions.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {sessions.map((session, index) => (
                            <div
                              key={session.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-base-200 border border-base-300 text-sm"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">
                                {session.name}
                              </span>
                              <div className="badge badge-xs badge-success">
                                {session.status === 'completed' ? 'Done' : session.status}
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={handleAddDocument}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 btn btn-primary btn-sm"
                            title="Add another document"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Document
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Topics and Questions Layout */}
                    {(isProcessing || topics.length > 0 || sessions.length > 0) ? (
                      <div className="flex border border-base-300">
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
                    ) : (
                      <div className="flex items-center justify-center py-16 border border-dashed border-base-300">
                        <div className="text-center">
                          <BookOpen className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
                          <p className="text-base font-semibold text-base-content/40 mb-2">No Content Yet</p>
                          <p className="text-sm text-base-content/30">Upload and process a document to see topics and questions here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-base-200/30">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold mb-8 text-center uppercase tracking-wide">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center border border-base-300 bg-base-100 p-4">
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
            <div className="border border-base-300 p-6 bg-base-100">
              <div className="bg-primary text-primary-content w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                1
              </div>
              <h3 className="font-semibold mb-2 uppercase text-sm">Upload</h3>
              <p className="text-sm text-base-content/60">Add your document</p>
            </div>

            <div className="border border-base-300 p-6 bg-base-100">
              <div className="bg-primary text-primary-content w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                2
              </div>
              <h3 className="font-semibold mb-2 uppercase text-sm">Generate</h3>
              <p className="text-sm text-base-content/60">AI creates quiz</p>
            </div>

            <div className="border border-base-300 p-6 bg-base-100">
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
      <footer className="footer footer-center bg-base-100 border-t border-base-300 py-8 px-6">
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
    </div>
  );
}
