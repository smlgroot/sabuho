import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Globe, Brain, Target, Trophy, BookOpen, BarChart3, Sparkles, Upload, FileText, CheckCircle, Clock, Zap, Shield, Lock } from "lucide-react";
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";

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
    trackEvent('file_uploaded', { props: { fileType: file.type, fileName: file.name } });

    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);
    setQuizGenerated(false);

    // Mock AI processing with steps
    const steps = [
      { message: "Reading document...", duration: 1000 },
      { message: "Analyzing content...", duration: 1500 },
      { message: "Generating questions...", duration: 2000 },
      { message: "Finalizing quiz...", duration: 1000 }
    ];

    for (const step of steps) {
      setProcessingStep(step.message);
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    setIsProcessing(false);
    setQuizGenerated(true);
    trackEvent('quiz_generated', { props: { fileType: file.type } });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
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

            {!quizGenerated && !isProcessing && (
              <>
                {/* Upload Section */}
                <div className="max-w-4xl mx-auto mb-8">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Left: Sample Documents */}
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-4">Try a sample:</p>
                        <div className="space-y-3">
                          {sampleDocuments.map((doc, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                const mockFile = new File([""], doc.title, { type: "application/pdf" });
                                Object.defineProperty(mockFile, 'size', { value: 50000 });
                                setUploadedFile(mockFile);
                                handleFileUpload(mockFile);
                              }}
                              className="w-full bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-500 rounded-lg p-4 transition-all text-left group flex items-center gap-3"
                            >
                              <div className="text-3xl">{doc.icon}</div>
                              <div className="flex-1">
                                <div className="font-bold text-gray-900 text-sm">{doc.title}</div>
                                <div className="text-xs text-gray-500">{doc.description}</div>
                              </div>
                              <div className="text-blue-600 group-hover:translate-x-1 transition-transform">→</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Upload Your Own */}
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-gray-700 mb-4">Or upload your own:</p>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt,.md"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />

                        <label
                          htmlFor="file-upload"
                          className="flex-1 border-2 border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 rounded-lg p-6 cursor-pointer transition-all group"
                        >
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="bg-blue-600 rounded-full p-4 mb-4 group-hover:scale-110 transition-transform">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                            <p className="font-bold text-gray-900 mb-2">Choose a file</p>
                            <p className="text-xs text-gray-600 mb-4">PDF, DOCX, TXT, MD up to 10MB</p>

                            {/* Privacy Badge */}
                            <div className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-full border border-gray-200">
                              <Shield className="w-4 h-4 text-green-600" />
                              <span>Your file stays private</span>
                            </div>
                          </div>
                        </label>

                        {/* Trust indicators */}
                        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Secure</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>No storage</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Instant processing</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="max-w-2xl mx-auto">
                <div className="card bg-white rounded-lg shadow-xl p-8 border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{uploadedFile?.name}</h3>
                      <p className="text-sm text-gray-500">
                        {(uploadedFile?.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="text-gray-700 font-medium">{processingStep}</span>
                    </div>
                    <progress className="progress progress-primary w-full h-2 bg-blue-100"></progress>
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Generated State */}
            {quizGenerated && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="font-semibold">Quiz generated successfully! {sampleQuestions.length} questions created.</span>
                </div>

                <div className="card bg-white rounded-lg shadow-xl border border-gray-100">
                  <div className="card-body p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {uploadedFile?.name} - Preview
                      </h3>
                    </div>

                    <div className="space-y-4 text-left">
                      {sampleQuestions.map((q, index) => (
                        <div key={index} className="p-5 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                          <p className="font-semibold text-gray-900 mb-4 text-base">
                            {index + 1}. {q.question}
                          </p>
                          <div className="space-y-3 ml-4">
                            {q.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  className="radio radio-sm radio-primary"
                                  disabled
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end mt-8 gap-3">
                      <button onClick={handleReset} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 border-0 rounded-lg font-semibold px-6">
                        Upload Another
                      </button>
                      <button onClick={handleSaveQuiz} className="btn bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-lg font-semibold px-6 shadow-md hover:shadow-lg transition-all">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        {user ? "Save Quiz" : "Sign Up to Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
