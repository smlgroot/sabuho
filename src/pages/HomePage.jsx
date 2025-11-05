import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, BarChart3, Sparkles, Upload, FileText, CheckCircle, Clock, Zap, Shield, Lock, Cog, Scan, AlertCircle, RotateCcw, DollarSign } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import { toast } from "sonner";
import {
  uploadFileToS3,
  pollResourceSessionStatus,
  fetchResourceSessionDomains,
  fetchResourceSessionQuestions
} from "@/services/resourceSessionService";
import { migrateResourceSessionToUserData } from "@/services/resourceSessionMigrationService";

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
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [totalQuestionsGenerated, setTotalQuestionsGenerated] = useState(0);
  const [s3Key, setS3Key] = useState(null);
  const [processingError, setProcessingError] = useState(null);
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

  // DEV ONLY: Test save flow directly
  const testSaveButton = async () => {
    const testS3Key = import.meta.env.VITE_TEST_PENDING_QUIZ_S3_KEY;

    if (!testS3Key) {
      toast.error('Please set VITE_TEST_PENDING_QUIZ_S3_KEY in .env file');
      return;
    }

    // Set s3Key and trigger save
    setS3Key(testS3Key);

    // Use the s3Key directly for save
    if (user) {
      toast.loading('Saving your quiz...');
      const result = await migrateResourceSessionToUserData(testS3Key, user.id);

      if (result.success) {
        toast.dismiss();
        toast.success(`Quiz saved! Created ${result.questionCount} questions in ${result.domainIds.length} topics`);
        navigate("/admin");
      } else {
        toast.dismiss();
        const errorMessage = result.error?.message || 'Unknown error';
        if (errorMessage.includes('already been saved')) {
          toast.info(errorMessage);
          setTimeout(() => navigate("/admin"), 1500);
        } else {
          toast.error(`Failed to save quiz: ${errorMessage}`);
        }
      }
    } else {
      localStorage.setItem('pendingQuizS3Key', testS3Key);
      navigate("/auth");
    }
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
    setQuizGenerated(false);
    setTopics([]);
    setQuestions([]);
    setQuestionsCount(0);
    setTotalQuestionsGenerated(0);
    setS3Key(null);
    setProcessingError(null);
    setSelectedTopicIndex(null);

    trackEvent('file_selected', { props: { fileType: file.type, fileName: file.name } });
  };

  // Separate function for polling and fetching results
  const pollAndFetchResults = async (s3Key) => {
    // Use shorter intervals in dev mode for faster testing
    const isDev = import.meta.env.DEV;
    const pollingConfig = isDev ? {
      intervalMs: 500,        // 0.5 seconds in dev (vs 2 seconds in prod)
      timeoutMs: 60000,       // 1 minute in dev (vs 5 minutes in prod)
      maxWaitForRecord: 10000 // 10 seconds in dev (vs 1 minute in prod)
    } : {
      intervalMs: 2000,
      timeoutMs: 300000,
      maxWaitForRecord: 60000
    };

    // Poll for completion using S3 key
    const completedSession = await pollResourceSessionStatus(
      { filePath: s3Key },
      {
        ...pollingConfig,
        onStatusChange: (status, sessionData) => {
          console.log('Status changed to:', status);
          setCurrentProcessingState(status);
        }
      }
    );

    console.log('Processing completed:', completedSession);

    // Fetch domains (topics) from resource_session_domains table
    const { data: domainsData, error: domainsError } = await fetchResourceSessionDomains(completedSession.id);

    if (domainsError) {
      console.error('Error fetching domains:', domainsError);
    }

    // Use domains from the table, or fallback to JSONB topics for backward compatibility
    const topicsData = domainsData && domainsData.length > 0
      ? domainsData.map(d => ({
          id: d.id,
          name: d.name,
          start: d.page_range_start,
          end: d.page_range_end
        }))
      : (completedSession.topic_page_range?.topics || []);

    setTopics(topicsData);

    // Fetch questions for this resource session
    const { data: questionsData, error: questionsError, total, sampleCount } = await fetchResourceSessionQuestions(completedSession.id);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    const questions = questionsData || [];
    console.log('=== FETCHED DATA ===');
    console.log('Domains:', domainsData);
    console.log('Topics (transformed):', topicsData);
    console.log('Questions sample:', questions[0]);
    setQuestions(questions);
    setQuestionsCount(sampleCount || questions.length);
    setTotalQuestionsGenerated(total || 0);

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

  const handleSaveQuiz = async () => {
    trackEvent('save_quiz_clicked', { props: { source: 'homepage' } });

    if (user) {
      // User is already logged in, check for s3Key in state or localStorage or env
      const keyToUse = s3Key || localStorage.getItem('pendingQuizS3Key') || import.meta.env.VITE_TEST_PENDING_QUIZ_S3_KEY;

      if (!keyToUse) {
        toast.error('No quiz data to save');
        return;
      }

      // Clear localStorage if we're using it
      if (localStorage.getItem('pendingQuizS3Key')) {
        localStorage.removeItem('pendingQuizS3Key');
      }

      toast.loading('Saving your quiz...');
      const result = await migrateResourceSessionToUserData(keyToUse, user.id);

      if (result.success) {
        toast.dismiss();
        toast.success(`Quiz saved! Created ${result.questionCount} questions in ${result.domainIds.length} topics`);
        navigate("/admin");
      } else {
        toast.dismiss();
        const errorMessage = result.error?.message || 'Unknown error';
        if (errorMessage.includes('already been saved')) {
          toast.info(errorMessage);
          // Still navigate to admin so user can see their saved quiz
          setTimeout(() => navigate("/admin"), 1500);
        } else {
          toast.error(`Failed to save quiz: ${errorMessage}`);
        }
      }
    } else {
      // User not logged in, store s3Key and redirect to auth
      if (s3Key) {
        localStorage.setItem('pendingQuizS3Key', s3Key);
      }
      navigate("/auth");
    }
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
    setUploadedFile(null);
    setIsProcessing(false);
    setProcessingStep("");
    setQuizGenerated(false);
    setCurrentStep(1);
    setCurrentProcessingState("");
    setTopics([]);
    setQuestions([]);
    setQuestionsCount(0);
    setTotalQuestionsGenerated(0);
    setS3Key(null);
    setProcessingError(null);
    setSelectedTopicIndex(null);
    setShowResetDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            {/* DEV ONLY: Test Save Button */}
            {import.meta.env.DEV && (
              <button
                onClick={testSaveButton}
                className="btn btn-sm btn-warning"
                title="Test save/signup flow with VITE_TEST_PENDING_QUIZ_S3_KEY"
              >
                Test Save
              </button>
            )}

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
                {/* Step 1: Choose a file */}
                <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
                  uploadedFile ? 'border-green-500 shadow-lg' : currentStep === 1 ? 'border-blue-500' : 'border-gray-200'
                }`}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`rounded-full p-2 flex-shrink-0 ${
                        uploadedFile ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {uploadedFile ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Upload className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm mb-1">Step 1</h3>
                        <p className="text-xs text-gray-600">
                          {uploadedFile ? 'File ready!' : 'Choose a file'}
                        </p>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload-step"
                    />

                    {/* File Details */}
                    {uploadedFile && (
                      <div className="space-y-2 mb-3">
                        {/* File Name */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
                          <div className="flex-shrink-0 text-green-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-green-700 truncate">{uploadedFile.name}</p>
                          </div>
                        </div>

                        {/* File Type */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50">
                          <div className="flex-shrink-0 text-blue-600">
                            {uploadedFile.name.toLowerCase().endsWith('.pdf') && <FileText className="w-4 h-4" />}
                            {uploadedFile.name.toLowerCase().endsWith('.docx') && <FileText className="w-4 h-4" />}
                            {(uploadedFile.name.toLowerCase().endsWith('.txt') || uploadedFile.name.toLowerCase().endsWith('.md')) && <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-blue-700">Type</span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-blue-900 uppercase">
                              {uploadedFile.name.split('.').pop()}
                            </span>
                          </div>
                        </div>

                        {/* File Size */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-50">
                          <div className="flex-shrink-0 text-purple-600">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-purple-700">Size</span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-purple-900">
                              {(uploadedFile.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!uploadedFile ? (
                      <label
                        htmlFor="file-upload-step"
                        className="btn btn-primary btn-sm cursor-pointer w-full mt-auto"
                      >
                        Select File
                      </label>
                    ) : (
                      <button
                        onClick={handleResetClick}
                        className="btn btn-ghost btn-sm w-full mt-auto"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Start Over
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 2: Process */}
                <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
                  processingError ? 'border-red-500' :
                  currentStep === 2 && !isProcessing ? 'border-blue-500 cursor-pointer hover:shadow-lg' :
                  isProcessing ? 'border-purple-500 shadow-lg' :
                  'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (currentStep === 2 && !isProcessing && !processingError) {
                    handleProcessClick();
                  }
                }}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`rounded-full p-2 flex-shrink-0 transition-all ${
                        processingError ? 'bg-red-100' :
                        isProcessing ? 'bg-purple-200' : 'bg-purple-100'
                      }`}>
                        {processingError ? (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        ) : isProcessing ? (
                          <Cog className="w-5 h-5 text-purple-600 animate-spin" />
                        ) : (
                          <Brain className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm mb-1">Step 2</h3>
                        <p className="text-xs text-gray-600">
                          {processingError ? (
                            <span className="text-red-600 font-medium">{processingError}</span>
                          ) : isProcessing ? (
                            'Processing your document...'
                          ) : (
                            currentStep >= 2 ? 'Click to process' : 'Process'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Processing Stages */}
                    {isProcessing && (
                      <div className="space-y-2 mb-3">
                        {/* Upload Stage */}
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                          currentProcessingState === "uploading" ? 'bg-purple-100 animate-pulse' :
                          ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'bg-green-50' :
                          'bg-gray-50'
                        }`}>
                          <div className={`flex-shrink-0 ${
                            currentProcessingState === "uploading" ? 'text-purple-600' :
                            ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-600' :
                            'text-gray-400'
                          }`}>
                            {currentProcessingState === "uploading" ? (
                              <Upload className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                            ) : ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${
                            currentProcessingState === "uploading" ? 'text-purple-700 font-bold' :
                            ["processing", "decoding", "ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-700' :
                            'text-gray-500'
                          }`}>
                            Uploading
                          </span>
                          {currentProcessingState === "uploading" && (
                            <div className="ml-auto">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Decoding Stage */}
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                          currentProcessingState === "decoding" ? 'bg-purple-100 animate-pulse' :
                          ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'bg-green-50' :
                          'bg-gray-50'
                        }`}>
                          <div className={`flex-shrink-0 ${
                            currentProcessingState === "decoding" ? 'text-purple-600' :
                            ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-600' :
                            'text-gray-400'
                          }`}>
                            {currentProcessingState === "decoding" ? (
                              <FileText className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                            ) : ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${
                            currentProcessingState === "decoding" ? 'text-purple-700 font-bold' :
                            ["ocr_completed", "ai_processing"].includes(currentProcessingState) ? 'text-green-700' :
                            'text-gray-500'
                          }`}>
                            Decoding Document
                          </span>
                          {currentProcessingState === "decoding" && (
                            <div className="ml-auto">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* OCR Stage */}
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                          currentProcessingState === "ocr_completed" ? 'bg-purple-100 animate-pulse' :
                          currentProcessingState === "ai_processing" ? 'bg-green-50' :
                          'bg-gray-50'
                        }`}>
                          <div className={`flex-shrink-0 ${
                            currentProcessingState === "ocr_completed" ? 'text-purple-600' :
                            currentProcessingState === "ai_processing" ? 'text-green-600' :
                            'text-gray-400'
                          }`}>
                            {currentProcessingState === "ocr_completed" ? (
                              <Scan className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                            ) : currentProcessingState === "ai_processing" ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${
                            currentProcessingState === "ocr_completed" ? 'text-purple-700 font-bold' :
                            currentProcessingState === "ai_processing" ? 'text-green-700' :
                            'text-gray-500'
                          }`}>
                            Extracting Text
                          </span>
                          {currentProcessingState === "ocr_completed" && (
                            <div className="ml-auto">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* AI Processing Stage */}
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                          currentProcessingState === "ai_processing" ? 'bg-purple-100 animate-pulse' : 'bg-gray-50'
                        }`}>
                          <div className={`flex-shrink-0 ${
                            currentProcessingState === "ai_processing" ? 'text-purple-600' : 'text-gray-400'
                          }`}>
                            {currentProcessingState === "ai_processing" ? (
                              <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '1.5s' }} />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <span className={`text-xs font-medium ${
                            currentProcessingState === "ai_processing" ? 'text-purple-700 font-bold' : 'text-gray-500'
                          }`}>
                            Generating Questions
                          </span>
                          {currentProcessingState === "ai_processing" && (
                            <div className="ml-auto">
                              <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></div>
                                <div className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {processingError ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry();
                        }}
                        className="btn btn-error btn-sm w-full mt-auto"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Retry
                      </button>
                    ) : currentStep === 2 && !isProcessing && (
                      <button className="btn btn-primary btn-sm w-full mt-auto">
                        Start Processing
                      </button>
                    )}
                  </div>
                </div>

                {/* Step 3: Result */}
                <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
                  currentStep === 3 ? 'border-green-500 shadow-lg' :
                  'border-gray-200 opacity-50'
                }`}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`rounded-full p-2 flex-shrink-0 ${
                        currentStep === 3 ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Trophy className={`w-5 h-5 ${currentStep === 3 ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm mb-1 ${currentStep === 3 ? 'text-gray-900' : 'text-gray-400'}`}>Step 3</h3>
                        <p className={`text-xs ${currentStep === 3 ? 'text-gray-600' : 'text-gray-400'}`}>
                          {currentStep === 3 ? 'Quiz generated!' : 'Result'}
                        </p>
                      </div>
                    </div>

                    {/* Result Stats */}
                    {currentStep === 3 && (
                      <div className="space-y-2 mb-3">
                        {/* Topics Generated */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
                          <div className="flex-shrink-0 text-green-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-green-700">Topics</span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-green-900">{topics.length}</span>
                          </div>
                        </div>

                        {/* Questions Generated */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-50">
                          <div className="flex-shrink-0 text-green-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-green-700">Questions</span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-green-900">{totalQuestionsGenerated}</span>
                          </div>
                        </div>

                        {/* Preview Available */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-blue-50">
                          <div className="flex-shrink-0 text-blue-600">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-blue-700">Showing</span>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-xs font-bold text-blue-900">{questionsCount}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="mt-auto pt-2 border-t border-green-200 flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-semibold">Complete</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Share/Sell/Make Money */}
                <div className={`bg-white rounded-lg shadow-md border-2 p-4 transition-all ${
                  quizGenerated ? 'border-yellow-500 shadow-lg' : 'border-gray-200 opacity-50'
                }`}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`rounded-full p-2 flex-shrink-0 ${
                        quizGenerated ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <DollarSign className={`w-5 h-5 ${quizGenerated ? 'text-yellow-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-sm mb-1 ${quizGenerated ? 'text-gray-900' : 'text-gray-400'}`}>Step 4</h3>
                        <p className={`text-xs ${quizGenerated ? 'text-gray-600' : 'text-gray-400'}`}>
                          {quizGenerated ? 'Coming Soon!' : 'Share & Earn'}
                        </p>
                      </div>
                    </div>

                    {/* Coming Soon Features */}
                    {quizGenerated && (
                      <div className="space-y-2 mb-3">
                        {/* Share Feature */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
                          <div className="flex-shrink-0 text-yellow-600">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-yellow-700">Share Your Quiz</span>
                          </div>
                          <div className="flex-shrink-0">
                            <Lock className="w-3 h-3 text-yellow-600" />
                          </div>
                        </div>

                        {/* Sell Feature */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
                          <div className="flex-shrink-0 text-yellow-600">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-yellow-700">Monetize Content</span>
                          </div>
                          <div className="flex-shrink-0">
                            <Lock className="w-3 h-3 text-yellow-600" />
                          </div>
                        </div>

                        {/* Analytics Feature */}
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-50">
                          <div className="flex-shrink-0 text-yellow-600">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-yellow-700">Track Performance</span>
                          </div>
                          <div className="flex-shrink-0">
                            <Lock className="w-3 h-3 text-yellow-600" />
                          </div>
                        </div>
                      </div>
                    )}

                    {!quizGenerated ? (
                      <div className="mt-auto">
                        <button className="btn btn-sm w-full btn-disabled" disabled>
                          <Lock className="w-4 h-4 mr-1" />
                          Locked
                        </button>
                      </div>
                    ) : (
                      <div className="mt-auto pt-2 border-t border-yellow-200 flex items-center justify-center gap-2 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold">Coming Soon</span>
                      </div>
                    )}
                  </div>
                </div>
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

                    {/* Sign Up / Save Quiz Banner */}
                    {totalQuestionsGenerated > questionsCount && (
                      <div className="mt-4 bg-amber-50 border-2 border-amber-400 rounded-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-amber-900 mb-1">
                                  Showing {questionsCount} of {totalQuestionsGenerated} questions
                                </p>
                                <p className="text-sm text-amber-800">
                                  {user ? 'Save this quiz to access all generated questions.' : 'Sign up and save this quiz to access all generated questions.'}
                                </p>
                              </div>
                            </div>
                            <button onClick={handleSaveQuiz} className="btn btn-primary btn-sm">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {user ? "Save Quiz" : "Sign Up to Save"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vertical Tab Layout - Simple Extension */}
                  <div className="flex">
                    {/* Topics Sidebar */}
                    <div className="w-64 flex-shrink-0 space-y-2 py-6">
                      {/* All Topics Tab */}
                      <div
                        onClick={() => setSelectedTopicIndex(null)}
                        className={`px-4 py-3 cursor-pointer transition-all relative rounded-l-lg border-l-2 border-t-2 border-b-2 ${
                          selectedTopicIndex === null
                            ? 'bg-blue-50 pr-6 z-10 border-blue-500'
                            : 'bg-gray-100 hover:bg-gray-200 border-gray-100'
                        }`}
                        style={ selectedTopicIndex === null ? { marginRight: '-2px' } : { marginRight: '0px' } }
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className={`w-4 h-4 flex-shrink-0 ${selectedTopicIndex === null ? 'text-blue-600' : 'text-gray-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${selectedTopicIndex === null ? 'text-blue-900' : 'text-gray-900'}`}>All Topics</p>
                            <p className="text-xs text-gray-500">{questionsCount} questions</p>
                          </div>
                        </div>
                      </div>

                      {/* Individual Topic Tabs */}
                      {topics.map((topic, index) => {
                        const topicQuestions = questions.filter(q => {
                          // Match by resource_session_domain_id (from resource_session_domains table)
                          if (q.resource_session_domain_id && topic.id) {
                            return q.resource_session_domain_id === topic.id;
                          }
                          // Fallback to page number range for legacy data
                          if (q.page_number && topic.start && topic.end) {
                            return q.page_number >= topic.start && q.page_number <= topic.end;
                          }
                          return false;
                        });

                        return (
                          <div
                            key={index}
                            onClick={() => setSelectedTopicIndex(index)}
                            className={`px-4 py-3 cursor-pointer transition-all relative rounded-l-lg border-l-2 border-t-2 border-b-2 ${
                              selectedTopicIndex === index
                                ? 'bg-blue-50 z-10 border-blue-500'
                                : 'bg-gray-100 hover:bg-gray-200 border-gray-100'
                            }`}
                            style={ selectedTopicIndex === index ? { marginRight: '-2px' } : { marginRight: '0px' } }
                          >
                            <div className="flex items-start gap-3">
                              <span className={`font-bold text-sm flex-shrink-0 ${
                                selectedTopicIndex === index ? 'text-blue-600' : 'text-gray-500'
                              }`}>{index + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-sm mb-1 line-clamp-2 ${
                                  selectedTopicIndex === index ? 'text-blue-900' : 'text-gray-900'
                                }`}>{topic.name}</p>
                                <p className="text-xs text-gray-500">
                                  Pages {topic.start}-{topic.end}
                                  {topicQuestions.length > 0 && ` • ${topicQuestions.length} questions`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Questions Content Area */}
                    <div className="flex-1 bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
                      <div className="mb-4 pb-3 border-b border-blue-400">
                        <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          {selectedTopicIndex === null
                            ? 'All Questions'
                            : `Questions for ${topics[selectedTopicIndex]?.name}`}
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {(() => {
                          let filteredQuestions = questions;
                          if (selectedTopicIndex !== null) {
                            const selectedTopic = topics[selectedTopicIndex];

                            filteredQuestions = questions.filter(q => {
                              // Match by resource_session_domain_id (from resource_session_domains table)
                              if (q.resource_session_domain_id && selectedTopic.id) {
                                return q.resource_session_domain_id === selectedTopic.id;
                              }
                              // Fallback to page number range for legacy data
                              if (q.page_number && selectedTopic.start && selectedTopic.end) {
                                return q.page_number >= selectedTopic.start && q.page_number <= selectedTopic.end;
                              }
                              return false;
                            });
                          }

                          if (filteredQuestions.length === 0) {
                            return (
                              <div className="text-center py-8">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No questions available for this topic</p>
                              </div>
                            );
                          }

                          return (
                            <>
                              {filteredQuestions.map((q, index) => (
                                <div key={q.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                  <p className="font-medium text-gray-900 mb-3">
                                    <span className="font-bold text-purple-600">{index + 1}.</span> {q.body}
                                  </p>
                                  {q.options && q.options.length > 0 && (
                                    <div className="space-y-2 pl-5">
                                      {q.options.map((option, optIdx) => {
                                        const isCorrect = option.includes('[correct]');
                                        const displayText = option.replace('[correct]', '').trim();
                                        return (
                                          <div
                                            key={optIdx}
                                            className={`text-sm py-1.5 px-2 rounded ${
                                              isCorrect ? 'font-semibold text-green-700 bg-green-50' : 'text-gray-700'
                                            }`}
                                          >
                                            {String.fromCharCode(65 + optIdx)}. {displayText}
                                            {isCorrect && ' ✓'}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>

                      {/* Action Buttons - Show when all questions are displayed */}
                      {totalQuestionsGenerated <= questionsCount && (
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                          <button onClick={handleSaveQuiz} className="btn btn-primary">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            {user ? "Save Quiz" : "Sign Up to Save"}
                          </button>
                        </div>
                      )}
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
