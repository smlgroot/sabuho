import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, BarChart3, Sparkles, Upload, FileText, CheckCircle, Clock, Zap, Shield, Lock, Cog, Scan, AlertCircle, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import {
  uploadFileToS3,
  pollResourceSessionStatus,
  fetchResourceSessionDomains,
  fetchResourceSessionQuestions
} from "@/services/resourceSessionService";

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const { trackEvent } = usePostHog();

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [quizGenerated, setQuizGenerated] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // 3-step process state
  const [currentStep, setCurrentStep] = useState(1);
  const [currentProcessingState, setCurrentProcessingState] = useState("");
  const [resultExpanded, setResultExpanded] = useState(false);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [s3Key, setS3Key] = useState(null);
  const [processingError, setProcessingError] = useState(null);

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
          console.error("Logout error:", error);
        }
        navigate("/");
      } catch (err) {
        console.error("Logout exception:", err);
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

  // File upload handlers
  const validateFile = (file) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      return { valid: false, error: 'Please upload a PDF, DOCX, TXT, or MD file.' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB.' };
    }

    return { valid: true };
  };

  const handleFileUpload = async (file) => {
    // This function is no longer used since we moved to explicit process button
    // Keeping it for compatibility but it just does validation now
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    setUploadedFile(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Reset all state when changing file
    setUploadedFile(file);
    setCurrentStep(2);
    setIsProcessing(false);
    setCurrentProcessingState("");
    setResultExpanded(false);
    setQuizGenerated(false);
    setTopics([]);
    setQuestions([]);
    setQuestionsCount(0);
    setS3Key(null);
    setProcessingError(null);

    trackEvent('file_selected', { props: { fileType: file.type, fileName: file.name } });
  };

  // Separate function for polling and fetching results
  const pollAndFetchResults = async (s3Key) => {
    // Poll for completion using S3 key
    const completedSession = await pollResourceSessionStatus(
      { filePath: s3Key },
      {
        intervalMs: 2000,
        timeoutMs: 300000, // 5 minutes
        maxWaitForRecord: 60000, // 1 minute to wait for backend to create record
        onStatusChange: (status, sessionData) => {
          console.log('Status changed to:', status);
          setCurrentProcessingState(status);
        }
      }
    );

    console.log('Processing completed:', completedSession);

    // Extract results
    const topicsData = completedSession.topic_page_range?.topics || [];
    setTopics(topicsData);

    // Fetch questions for this resource session
    const { data: questionsData, error: questionsError } = await fetchResourceSessionQuestions(completedSession.id);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    const questions = questionsData || [];
    setQuestions(questions);
    setQuestionsCount(questions.length);

    setIsProcessing(false);
    setCurrentProcessingState("");
    setQuizGenerated(true);
    setCurrentStep(3);
    trackEvent('quiz_generated', {
      props: {
        fileType: uploadedFile.type,
        topicsCount: topicsData.length,
        questionsCount: questions.length,
        sessionId: completedSession.id
      }
    });
  };

  const handleProcessClick = async () => {
    if (!uploadedFile || currentStep < 2) return;

    setIsProcessing(true);
    setQuizGenerated(false);
    setProcessingError(null);
    setCurrentProcessingState("uploading");

    try {
      trackEvent('processing_started', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name
        }
      });

      // Upload file to S3 using presigned URL
      // S3 key is unique per upload (includes UUID)
      const { key, jobId, error: uploadError } = await uploadFileToS3(uploadedFile);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded to S3:', { key, jobId });
      setS3Key(key);

      trackEvent('file_uploaded', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name,
          s3Key: key,
          jobId: jobId
        }
      });

      // S3 upload triggers event -> SQS -> ECS backend processing
      // Backend will create resource_session record automatically
      // We poll by S3 key (which is unique per upload)
      console.log('Polling for processing completion by S3 key:', key);

      await pollAndFetchResults(key);

    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(error.message);
      setIsProcessing(false);
      setCurrentProcessingState("");
    }
  };

  const handleRetry = async () => {
    if (!s3Key) {
      alert('No file to retry. Please upload a file first.');
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setCurrentProcessingState("processing");

    try {
      trackEvent('processing_retried', {
        props: {
          s3Key: s3Key
        }
      });

      await pollAndFetchResults(s3Key);

    } catch (error) {
      console.error('Retry error:', error);
      setProcessingError(error.message);
      setIsProcessing(false);
      setCurrentProcessingState("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change event for consistency
      const fakeEvent = {
        target: {
          files: [file]
        }
      };
      await handleFileSelect(fakeEvent);
    }
  };

  const handleSaveQuiz = () => {
    trackEvent('save_quiz_clicked', { props: { source: 'homepage' } });
    if (user) {
      navigate("/admin");
    } else {
      navigate("/auth");
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setIsProcessing(false);
    setProcessingStep("");
    setQuizGenerated(false);
    setCurrentStep(1);
    setCurrentProcessingState("");
    setResultExpanded(false);
    setTopics([]);
    setQuestions([]);
    setQuestionsCount(0);
    setS3Key(null);
    setProcessingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        <div className="hero-content text-center px-6 w-full py-16">
          <div className="max-w-5xl w-full">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 text-gray-900 leading-tight tracking-tight">
              <div className="flex items-center justify-center gap-6 flex-wrap">
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

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Upload your content and watch AI instantly create personalized, interactive quizzes tailored to what you need to learn
            </p>

            {/* 3-Step Process Section */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1: Choose a file */}
                <div className={`bg-white rounded-lg shadow-lg border-2 p-8 transition-all ${
                  currentStep === 1 ? 'border-blue-500' : 'border-gray-200'
                }`}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className={`rounded-full p-4 mb-4 ${
                      uploadedFile ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {uploadedFile ? (
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      ) : (
                        <Upload className="w-12 h-12 text-blue-600" />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Step 1</h3>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      {uploadedFile ? 'File selected' : 'Choose a file'}
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload-step"
                    />

                    {!uploadedFile ? (
                      <label
                        htmlFor="file-upload-step"
                        className="btn btn-primary btn-sm cursor-pointer"
                      >
                        Select File
                      </label>
                    ) : (
                      <div className="text-center">
                        <p className="text-xs text-gray-700 font-medium mb-2">{uploadedFile.name}</p>
                        <label
                          htmlFor="file-upload-step"
                          className="btn btn-ghost btn-xs cursor-pointer"
                        >
                          Change
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Process */}
                <div className={`bg-white rounded-lg shadow-lg border-2 p-8 transition-all duration-300 ${
                  processingError ? 'border-red-500' :
                  currentStep === 2 && !isProcessing ? 'border-blue-500 cursor-pointer hover:shadow-xl hover:scale-105' :
                  isProcessing ? 'border-blue-500 animate-pulse' :
                  'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (currentStep === 2 && !isProcessing && !processingError) {
                    handleProcessClick();
                  }
                }}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className={`rounded-full p-4 mb-4 transition-all duration-500 ${
                      processingError ? 'bg-red-100' :
                      isProcessing ? 'bg-purple-200 scale-110' : 'bg-purple-100'
                    }`}>
                      {processingError ? (
                        <AlertCircle className="w-12 h-12 text-red-600" />
                      ) : isProcessing ? (
                        <>
                          {currentProcessingState === "uploading" && (
                            <Upload className="w-12 h-12 text-purple-600 animate-bounce" />
                          )}
                          {currentProcessingState === "processing" && (
                            <Cog className="w-12 h-12 text-purple-600 animate-spin" />
                          )}
                          {currentProcessingState === "decoding" && (
                            <FileText className="w-12 h-12 text-purple-600 animate-spin" style={{ animationDuration: '2s' }} />
                          )}
                          {currentProcessingState === "ocr_completed" && (
                            <Scan className="w-12 h-12 text-purple-600 animate-pulse" />
                          )}
                          {currentProcessingState === "ai_processing" && (
                            <Sparkles className="w-12 h-12 text-purple-600 animate-pulse" />
                          )}
                        </>
                      ) : (
                        <Brain className={`w-12 h-12 text-purple-600 transition-transform duration-300 ${
                          currentStep === 2 ? 'hover:scale-125' : ''
                        }`} />
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Step 2</h3>
                    <p className={`text-sm mb-4 text-center transition-all duration-300 ${
                      processingError ? 'text-red-600 font-medium' :
                      isProcessing ? 'font-semibold text-purple-700 animate-pulse text-gray-600' : 'text-gray-600'
                    }`}>
                      {processingError ? (
                        <span className="text-xs">{processingError}</span>
                      ) : isProcessing ? (
                        <>
                          {currentProcessingState === "uploading" && "Uploading..."}
                          {currentProcessingState === "processing" && "Processing..."}
                          {currentProcessingState === "decoding" && "Decoding..."}
                          {currentProcessingState === "ocr_completed" && "OCR Completed..."}
                          {currentProcessingState === "ai_processing" && "AI Processing..."}
                        </>
                      ) : (
                        currentStep >= 2 ? 'Click to process' : 'Process'
                      )}
                    </p>
                    {processingError ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry();
                        }}
                        className="btn btn-error btn-sm hover:scale-110 transition-transform"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Retry
                      </button>
                    ) : currentStep === 2 && !isProcessing && (
                      <button className="btn btn-primary btn-sm hover:scale-110 transition-transform">
                        Start
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Result */}
                <div className={`bg-white rounded-lg shadow-lg border-2 p-8 transition-all ${
                  currentStep === 3 ? 'border-blue-500 cursor-pointer hover:shadow-xl' :
                  'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (currentStep === 3) {
                    setResultExpanded(!resultExpanded);
                  }
                }}>
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-green-100 rounded-full p-4 mb-4">
                      <Trophy className="w-12 h-12 text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 text-lg">Step 3</h3>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      {currentStep === 3 ? (
                        <>
                          {questionsCount} questions<br />
                          {topics.length} topics
                        </>
                      ) : (
                        'Result'
                      )}
                    </p>
                    {currentStep === 3 && (
                      <button className="btn btn-primary btn-sm">
                        {resultExpanded ? 'Hide' : 'View'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Result Section */}
              {resultExpanded && currentStep === 3 && (
                <div className="mt-6 bg-white rounded-lg shadow-lg border border-gray-200 p-8 animate-fadeIn">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Topics */}
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Topics Discovered
                      </h4>
                      <div className="space-y-2">
                        {topics.map((topic, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-sm text-gray-900 font-medium">{topic.name}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                (Pages {topic.start}-{topic.end})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Questions Preview */}
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Questions Generated
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {questions.length > 0 ? (
                          questions.slice(0, 5).map((q, index) => (
                            <div key={q.id} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                              <p className="text-sm font-semibold text-gray-900 mb-2">
                                {index + 1}. {q.body}
                              </p>
                              {q.options && q.options.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {q.options.map((option, optIdx) => {
                                    const isCorrect = option.includes('[correct]');
                                    const displayText = option.replace('[correct]', '').trim();
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`text-xs pl-4 py-1 rounded ${
                                          isCorrect
                                            ? 'font-bold text-green-700 bg-green-50 border-l-2 border-green-500'
                                            : 'text-gray-600'
                                        }`}
                                      >
                                        • {displayText}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            No questions generated yet
                          </div>
                        )}
                        {questions.length > 5 && (
                          <p className="text-xs text-gray-500 italic text-center">
                            Showing 5 of {questions.length} questions
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end mt-6 gap-3">
                    <button onClick={handleReset} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 border-0 rounded-lg font-semibold px-6">
                      Start Over
                    </button>
                    <button onClick={handleSaveQuiz} className="btn bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg font-semibold px-6 shadow-md hover:shadow-lg transition-all">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      {user ? "Save Quiz" : "Sign Up to Save"}
                    </button>
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
    </div>
  );
}
