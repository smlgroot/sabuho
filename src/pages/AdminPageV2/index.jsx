import { useAuth } from "@/lib/admin/auth";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@/components/PostHogProvider";
import { useQuestionAttempts } from "@/hooks/useQuestionAttempts";
import { filterQuestionsByState } from "@/utils/questionStats";
import { supabase } from "@/lib/supabase";
import TopicsQuestionsView from "@/components/TopicsQuestionsView";
import QuizConfigView from "@/components/QuizConfigView";
import QuizAttemptView from "@/components/QuizAttemptView";
import QuizInsightsView from "@/components/QuizInsightsView";
import QuizMonetizeView from "@/components/QuizMonetizeView";

export default function AdminPageV2() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { trackEvent } = usePostHog();

  // Data state
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [resourceRepositoryId, setResourceRepositoryId] = useState(null);
  const [totalQuestionsGenerated, setTotalQuestionsGenerated] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // View stack navigation state
  const [currentView, setCurrentView] = useState('home');
  const [viewStack, setViewStack] = useState(['home']);
  const [selectedQuestionStates, setSelectedQuestionStates] = useState([]);
  const [quizCompletionStats, setQuizCompletionStats] = useState(null);

  // Question attempts tracking (localStorage-based)
  const questionAttemptsHook = useQuestionAttempts(resourceRepositoryId);

  // Fetch user's quiz data on mount
  useEffect(() => {
    if (user && !loading) {
      loadUserQuizData();
    }
  }, [user, loading]);

  const loadUserQuizData = async () => {
    setIsLoadingData(true);
    try {
      // Get user's resource repository
      const { data: repository } = await supabase
        .from('resource_repositories')
        .select('id')
        .limit(1)
        .single();

      if (!repository) {
        setIsLoadingData(false);
        return;
      }

      const repositoryId = repository.id;
      setResourceRepositoryId(repositoryId);

      // Fetch all sessions
      const { data: sessionsData } = await supabase
        .from('resource_sessions')
        .select('*')
        .eq('resource_repository_id', repositoryId)
        .order('created_at', { ascending: false });

      // Fetch all domains
      const { data: domainsData } = await supabase
        .from('resource_session_domains')
        .select('*')
        .eq('resource_repository_id', repositoryId)
        .order('page_range_start', { ascending: true });

      // Fetch all questions
      const { data: questionsData } = await supabase
        .from('resource_session_questions')
        .select('*')
        .eq('resource_repository_id', repositoryId)
        .eq('is_sample', false)
        .order('created_at', { ascending: true });

      // Get total count
      const { count } = await supabase
        .from('resource_session_questions')
        .select('*', { count: 'exact', head: true })
        .eq('resource_repository_id', repositoryId);

      setSessions(sessionsData || []);
      setTopics((domainsData || []).map(d => ({
        id: d.id,
        name: d.name,
        start: d.page_range_start,
        end: d.page_range_end,
        resource_session_domain_id: d.id
      })));
      setQuestions(questionsData || []);
      setTotalQuestionsGenerated(count || 0);
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setIsLoadingData(false);
    }
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
    trackEvent('start_learning_clicked', { props: { source: 'admin_v2' } });
    pushView('quiz-config');
  };

  // Handle quiz configuration completion
  const handleStartQuiz = (selectedStates) => {
    setSelectedQuestionStates(selectedStates);
    trackEvent('quiz_started', {
      props: {
        source: 'admin_v2',
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
        source: 'admin_v2',
        ...stats,
      },
    });
    resetToHome();
  };

  // Handle quiz exit
  const handleQuizExit = () => {
    trackEvent('quiz_exited', { props: { source: 'admin_v2' } });
    popView();
  };

  // Handle show insights
  const handleShowInsights = () => {
    trackEvent('insights_viewed', { props: { source: 'admin_v2' } });
    pushView('quiz-insights');
  };

  // Handle show monetize
  const handleShowMonetize = () => {
    trackEvent('monetize_viewed', { props: { source: 'admin_v2' } });
    pushView('quiz-monetize');
  };

  // Filter questions for quiz attempt based on selected states
  const filteredQuestionsForQuiz = useMemo(() => {
    return filterQuestionsByState(
      questions,
      questionAttemptsHook.attempts,
      selectedQuestionStates
    );
  }, [questions, questionAttemptsHook.attempts, selectedQuestionStates]);

  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/70 mt-2">{t("Loading...")}</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

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

  // Render main view
  return (
    <div className="min-h-screen bg-base-100">
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
            <button
              onClick={() => navigate("/")}
              className="btn btn-ghost btn-sm"
            >
              {t("Home")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-5xl">
          {/* Conditionally render views based on currentView */}
          {currentView === 'home' && (
            <TopicsQuestionsView
              topics={topics}
              questions={questions}
              sessions={sessions}
              isProcessing={false}
              totalQuestionsGenerated={totalQuestionsGenerated}
              onStartLearning={handleStartLearning}
              onShowInsights={handleShowInsights}
              onShowMonetize={handleShowMonetize}
              actionButtons={
                topics.length > 0 ? (
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
              showAddDocumentButton={false}
              showStartLearningButton={false}
              readOnly={false}
              isDemo={false}
            />
          )}

          {currentView === 'quiz-config' && (
            <QuizConfigView
              questions={questions}
              attempts={questionAttemptsHook.attempts}
              onStartQuiz={handleStartQuiz}
              onBack={popView}
            />
          )}

          {currentView === 'quiz-insights' && (
            <QuizInsightsView
              questions={questions}
              attempts={questionAttemptsHook.attempts}
              onBack={popView}
            />
          )}

          {currentView === 'quiz-monetize' && (
            <QuizMonetizeView
              onBack={popView}
            />
          )}
        </div>
      </section>
    </div>
  );
}
