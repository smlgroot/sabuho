import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, GraduationCap, Folder, FileText, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Menu, ShoppingBag, DollarSign, Settings, HelpCircle, LogOut, Moon, Sun, Languages } from "lucide-react";
import { toast } from "sonner";
import { DomainTree } from "./components/domains/domain-tree";
import { QuizList } from "./components/quizzes/quiz-list";
import { QuizDetail } from "./components/quizzes/quiz-detail";
import { DomainDetail } from "./components/domains/domain-detail";
import { DomainForm } from "./components/domains/domain-form";
import { DeleteDomainDialog } from "./components/domains/delete-domain-dialog";
import { ResourceUpload } from "./components/resources/resource-upload";
import { QuestionForm } from "./components/questions/question-form";
import { SearchBar } from "./components/shared/search-bar";
import { ProtectedRoute } from "../auth/components/protected-route";
import { useAuth } from "@/lib/admin/auth";
import { UserMenu } from "../auth/components/user-menu";
import { useStore } from "@/store/useStore";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { CreatorOnboarding } from "./components/CreatorOnboarding";
import { useNavigate } from 'react-router-dom';
import { usePlausible } from "@/components/PlausibleProvider";
import {
  fetchDomains,
  createDomain,
  updateDomain,
  deleteDomain,
} from "@/lib/admin/domains";
import { uploadResource } from "@/lib/admin/resources";
import { createQuestion } from "@/lib/admin/questions";
import { fetchQuizzes, createQuiz as createQuizApi, updateQuiz as updateQuizApi, deleteQuiz as deleteQuizApi } from "@/lib/admin/quizzes";
import LearningPath from '../game/LearningPath';
import Quizzes from '../game/Quizzes';
import QuizScreen from '../game/QuizScreen';
import UserQuizDetail from '../game/QuizDetail';

export default function AdminPage() {
  const {
    domains,
    selectedDomain,
    quizzes,
    selectedQuiz,
    loading,
    error,
    setDomains,
    setSelectedDomain,
    setQuizzes,
    setSelectedQuiz,
    setLoading,
    setError,
    addDomain,
    updateDomain: updateDomainInStore,
    deleteDomain: deleteDomainFromStore,
    addResource,
    addQuestion,
    addQuiz,
    updateQuiz: updateQuizInStore,
    deleteQuiz: deleteQuizFromStore,
  } = useStore();

  const [domainFormOpen, setDomainFormOpen] = useState(false);
  const [deleteDomainDialogOpen, setDeleteDomainDialogOpen] = useState(false);
  const [resourceUploadOpen, setResourceUploadOpen] = useState(false);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [deletingDomain, setDeletingDomain] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [parentDomainId, setParentDomainId] = useState(undefined);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [secondSidebarOpen, setSecondSidebarOpen] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [activeView, setActiveView] = useState('learning-hub'); // 'learning-hub', 'domains', 'quizzes', 'shop'
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    displayName: '',
    bio: '',
    interests: [],
    goal: ''
  });
  const hasLoadedData = useRef(false);
  
  // Quiz modal state
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizModalData, setQuizModalData] = useState({ quizId: null, levelId: null, readonly: false });
  const learningPathRef = useRef(null);
  
  // User quiz detail state
  const [selectedUserQuiz, setSelectedUserQuiz] = useState(null);

  const { user, userProfile, loadUserProfile } = useAuth();
  const { trackEvent } = usePlausible();


  const loadDomains = useCallback(async () => {
    try {
      setLoading(true);
      const domainsData = await fetchDomains();
      setDomains(domainsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load domains";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setDomains, setLoading, setError]);

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const quizzesData = await fetchQuizzes();
      setQuizzes(quizzesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load quizzes";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [setQuizzes, setLoading, setError]);

  // Load domains only after the user is authenticated and only once per user
  useEffect(() => {
    if (user && !hasLoadedData.current) {
      hasLoadedData.current = true;
      loadDomains();
      loadQuizzes();
    } else if (!user) {
      // Reset when user logs out
      hasLoadedData.current = false;
    }
  }, [user?.id, loadDomains, loadQuizzes]);

  const handleCreateDomain = async (parentId, type = 'folder') => {
    try {
      const domainData = {
        name: type === 'folder' ? 'New Folder' : 'New File',
        description: null,
        parent_id: parentId || null,
        domain_type: type
      };

      const created = await createDomain(domainData);
      addDomain(created);
      setSelectedDomain(created);

      toast.success(t(type === 'folder' ? "Folder created successfully" : "File created successfully"));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create domain";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleEditDomain = (domain) => {
    setEditingDomain(domain);
    setParentDomainId(domain.parent_id || undefined);
    setDomainFormOpen(true);
  };

  const handleDeleteDomain = (domain) => {
    setDeletingDomain(domain);
    setDeleteDomainDialogOpen(true);
  };

  const handleConfirmDeleteDomain = async (domain) => {
    try {
      await deleteDomain(domain.id);
      deleteDomainFromStore(domain.id);
      if (selectedDomain?.id === domain.id) {
        setSelectedDomain(null);
      }
      toast.success(t("Domain deleted successfully"));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete domain";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw to let the dialog handle loading state
    }
  };

  const handleMoveDomain = async (domainId, newParentId) => {
    try {
      const updated = await updateDomain(domainId, { parent_id: newParentId });
      updateDomainInStore(updated);
      // Reload domains to rebuild the tree structure
      await loadDomains();
      toast.success(t("Domain moved successfully"));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to move domain";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDomainSubmit = async (domainData) => {
    try {
      if (editingDomain) {
        const updated = await updateDomain(editingDomain.id, domainData);
        updateDomainInStore(updated);
      } else {
        const created = await createDomain(domainData);
        addDomain(created);
      }
      setDomainFormOpen(false);
      setEditingDomain(null);
      toast.success(editingDomain ? t("Domain updated successfully") : t("Domain created successfully"));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save domain";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleResourceUpload = async (
    file,
    name,
    description
  ) => {
    if (!selectedDomain) throw new Error(t("No domain selected"));

    try {
      const resource = await uploadResource(
        file,
        selectedDomain.id,
        name,
        description
      );
      addResource(resource);
      setResourceUploadOpen(false);
      toast.success(t("Resource uploaded successfully"));
      return resource.id; // Return the resource ID
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload resource";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleQuestionSubmit = async (questionData) => {
    try {
      const question = await createQuestion(questionData);
      addQuestion(question);
      setQuestionFormOpen(false);
      setEditingQuestion(null);
      toast.success(t("Question created successfully"));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create question";
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionFormOpen(true);
  };

  const handleDeleteQuestion = async (question) => {
    if (confirm(t("Are you sure you want to delete this question?"))) {
      try {
        // TODO: Implement deleteQuestion in lib/questions.ts
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete question";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    }
  };

  // Quizzes handlers
  const handleQuizCreate = async () => {
    try {
      setCreatingQuiz(true);
      const created = await createQuizApi({
        name: 'New Quiz',
        description: null,
        domains: [], // empty domains as requested
      });
      addQuiz(created);
      setCreatingQuiz(false);
      setSelectedQuiz(created);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quiz';
      setError(errorMessage);
      toast.error(errorMessage);
      setCreatingQuiz(false);
    }
  };

  const handleQuizCreateFromDomains = async (domainIds) => {
    try {
      setCreatingQuiz(true);

      // Check if quiz with same domains already exists
      const existingQuiz = quizzes.find(quiz => {
        const quizDomainIds = quiz.domains?.map(d => d.id) || [];
        if (quizDomainIds.length !== domainIds.length) return false;
        const sortedQuizDomains = [...quizDomainIds].sort();
        const sortedSelectedDomains = [...domainIds].sort();
        return sortedQuizDomains.every((id, index) => id === sortedSelectedDomains[index]);
      });

      if (existingQuiz) {
        // Navigate to existing quiz
        setCreatingQuiz(false);
        setSelectedQuiz(existingQuiz);
        setActiveView('quizzes');
        toast.info(t('Opening existing quiz'));
        return;
      }

      // Find first root parent domain name
      const findDomainById = (domainList, id) => {
        for (const d of domainList) {
          if (d.id === id) return d;
          if (d.children) {
            const found = findDomainById(d.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const findRootParent = (domainId) => {
        const domain = findDomainById(domains, domainId);
        if (!domain) return null;

        // If domain has no parent, it's a root
        if (!domain.parent_id) return domain;

        // Find the root parent
        let current = domain;
        while (current.parent_id) {
          current = findDomainById(domains, current.parent_id);
          if (!current) break;
        }
        return current;
      };

      const firstRootParent = findRootParent(domainIds[0]);
      const quizName = firstRootParent?.name || 'New Quiz';

      // Create new quiz
      const created = await createQuizApi({
        name: quizName,
        description: null,
        domains: domainIds,
      });
      addQuiz(created);
      setCreatingQuiz(false);
      setSelectedQuiz(created);
      setActiveView('quizzes');
      toast.success(t('Quiz created successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quiz';
      setError(errorMessage);
      toast.error(errorMessage);
      setCreatingQuiz(false);
    }
  };

  const handleQuizSave = async (payload) => {
    if (!selectedQuiz) return;
    try {
      const updated = await updateQuizApi(selectedQuiz.id, {
        name: payload.name,
        description: payload.description ?? null,
        domains: payload.domainIds,
      });
      updateQuizInStore(updated);
      setSelectedQuiz(updated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save quiz';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    console.log('Admin handleDeleteQuiz called with:', quizId)
    try {
      console.log('Calling deleteQuizApi...')
      await deleteQuizApi(quizId);
      console.log('deleteQuizApi completed, updating store...')
      deleteQuizFromStore(quizId);
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
      }
      toast.success(t('Quiz deleted successfully'));
      console.log('Quiz deletion completed successfully')
    } catch (err) {
      console.error('Delete quiz error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quiz';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleQuizUpdate = async () => {
    if (!selectedQuiz?.id) return;
    try {
      // Reload quiz data from API to get updated published_at
      const quizzesData = await fetchQuizzes();
      const updatedQuiz = quizzesData.find(q => q.id === selectedQuiz.id);
      if (updatedQuiz) {
        updateQuizInStore(updatedQuiz);
        setSelectedQuiz(updatedQuiz);
      }
    } catch (err) {
      console.error('Failed to refresh quiz data:', err);
    }
  };

  const handleEditQuiz = async (quiz) => {
    setCreatingQuiz(false);
    setSelectedDomain(null);
    try {
      // Reload quiz data from API to get latest published_at
      const quizzesData = await fetchQuizzes();
      const freshQuiz = quizzesData.find(q => q.id === quiz.id);
      if (freshQuiz) {
        updateQuizInStore(freshQuiz);
        setSelectedQuiz(freshQuiz);
      } else {
        // Fallback to the quiz from the list if not found
        setSelectedQuiz(quiz);
      }
    } catch (err) {
      console.error('Failed to reload quiz data:', err);
      // Fallback to the quiz from the list if reload fails
      setSelectedQuiz(quiz);
    }
  };

  // Handle level click from learning path
  const handleLevelClick = (quizId, levelId, isCompleted) => {
    setQuizModalData({
      quizId,
      levelId,
      readonly: isCompleted
    });
    setQuizModalOpen(true);
  };

  // Handle quiz modal close
  const handleQuizModalClose = () => {
    setQuizModalOpen(false);
    // Reload levels to show updated unlock status if not in readonly mode
    if (!quizModalData.readonly && learningPathRef.current) {
      learningPathRef.current.reloadLevels();
    }
    // Reset quiz modal data after a brief delay to allow for animations
    setTimeout(() => {
      setQuizModalData({ quizId: null, levelId: null, readonly: false });
    }, 300);
  };

  // Handle user quiz selection (from shop/store)
  const handleUserQuizSelect = (quiz) => {
    setSelectedUserQuiz(quiz);
  };

  // Handle back from user quiz detail
  const handleUserQuizBack = () => {
    setSelectedUserQuiz(null);
  };


  const getBreadcrumbPath = (domainId) => {
    const path = [];

    const findPath = (
      domains,
      targetId
    ) => {
      for (const d of domains) {
        path.push(d);
        if (d.id === targetId) {
          return true;
        }
        if (d.children && findPath(d.children, targetId)) {
          return true;
        }
        path.pop();
      }
      return false;
    };

    findPath(domains, domainId);
    return path;
  };

  const handleOnboardingComplete = async () => {
    // Force refresh user profile to get updated creator status
    if (user) {
      await loadUserProfile(user.id);
    }
    setActiveView('creator');
    setCreatorOpen(true);
    setOnboardingStep(0);
  };

  const handleOnboardingCancel = () => {
    setActiveView('learning-hub');
    setOnboardingStep(0);
  };

  const MainSidebar = () => (
    <aside className="min-w-20 bg-base-200 text-base-content flex flex-col min-h-full border-r border-base-300">
      {/* App Logo */}
      <div className="p-4 border-b border-base-300">
        <img 
          src="/sabuho_logo_3.png" 
          alt="Sabuho" 
          className="w-12 h-12 mx-auto object-contain"
        />
      </div>
      
      {/* Main Navigation Menu */}
      <div className="flex-1 flex flex-col items-center py-4 gap-2">
        {/* Sidebar Toggle */}
        <button
          className="btn btn-ghost p-3 h-auto min-w-16"
          onClick={() => {
            trackEvent('sidebar_toggle_clicked', { props: { action: secondSidebarOpen ? 'close' : 'open' } });
            setSecondSidebarOpen(!secondSidebarOpen);
          }}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Learning Hub */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'learning-hub' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            trackEvent('main_sidebar_navigation', { props: { section: 'learning-hub', previous_view: activeView } });
            setActiveView('learning-hub');
            setProfileSidebarOpen(false);
            setSelectedDomain(null);
            setSelectedQuiz(null);
            setSelectedUserQuiz(null);
            setCreatingQuiz(false);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <GraduationCap className="h-6 w-6" />
          <span className="text-xs whitespace-nowrap">{t("Learning")}</span>
        </button>
        
        {/* Shop */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'shop' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            trackEvent('main_sidebar_navigation', { props: { section: 'shop', previous_view: activeView } });
            setActiveView('shop');
            setProfileSidebarOpen(false);
            setSelectedDomain(null);
            setSelectedQuiz(null);
            setSelectedUserQuiz(null);
            setCreatingQuiz(false);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="text-xs whitespace-nowrap">{t("Store")}</span>
        </button>
        
        {/* Separator */}
        <div className="divider w-12 my-2 mx-auto"></div>
        
        {/* Creator */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${creatorOpen ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            const isCreatorEnabled = userProfile?.terms_accepted && userProfile?.is_creator_enabled;
            if (isCreatorEnabled) {
              // Creator is enabled - normal toggle behavior
              trackEvent('main_sidebar_navigation', { props: { section: 'creator', action: creatorOpen ? 'collapse' : 'expand', previous_view: activeView } });
              setCreatorOpen(!creatorOpen);
              if (!creatorOpen) {
                setActiveView('creator');
                setProfileSidebarOpen(false);
                setSelectedUserQuiz(null);
                if (!secondSidebarOpen) setSecondSidebarOpen(true);
              }
            } else {
              // Creator not enabled - show onboarding
              trackEvent('creator_onboarding_started', { props: { source: 'main_sidebar' } });
              setActiveView('creator-onboarding');
              setOnboardingStep(0);
              setProfileSidebarOpen(false);
              setSelectedUserQuiz(null);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }
          }}
        >
          <DollarSign className="h-6 w-6" />
          <span className="text-xs whitespace-nowrap">{t("Creator")}</span>
          {(() => {
            const isCreatorEnabled = userProfile?.terms_accepted && userProfile?.is_creator_enabled;
            return isCreatorEnabled && creatorOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : isCreatorEnabled && !creatorOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : null;
          })()}
        </button>
        
        {/* Domains - only show when creator is enabled and open */}
        {(userProfile?.terms_accepted && userProfile?.is_creator_enabled) && creatorOpen && (
          <button 
            className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'domains' ? 'btn-active bg-primary/10 text-primary' : ''}`}
            onClick={() => {
              trackEvent('main_sidebar_navigation', { props: { section: 'domains', previous_view: activeView } });
              setActiveView('domains');
              setProfileSidebarOpen(false);
              setSelectedQuiz(null);
              setSelectedUserQuiz(null);
              setCreatingQuiz(false);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }}
          >
            <Folder className="h-6 w-6" />
            <span className="text-xs whitespace-nowrap">{t("Domains")}</span>
          </button>
        )}
        
        {/* Quizzes - only show when creator is enabled and open */}
        {(userProfile?.terms_accepted && userProfile?.is_creator_enabled) && creatorOpen && (
          <button 
            className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'quizzes' ? 'btn-active bg-primary/10 text-primary' : ''}`}
            onClick={() => {
              trackEvent('main_sidebar_navigation', { props: { section: 'quizzes', previous_view: activeView } });
              setActiveView('quizzes');
              setProfileSidebarOpen(false);
              setSelectedDomain(null);
              setSelectedUserQuiz(null);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs whitespace-nowrap">{t("Quizzes")}</span>
          </button>
        )}
      </div>
      
      {/* User Menu at bottom */}
      <div className="p-2">
        <UserMenu 
          onProfileClick={() => setProfileSidebarOpen(!profileSidebarOpen)}
          profileSidebarOpen={profileSidebarOpen}
        />
      </div>
    </aside>
  );

  const { t, i18n } = useTranslation();

  const SecondSidebar = () => (

    <aside className="w-80 bg-base-100 border-r border-base-300 flex flex-col h-screen">
      {activeView === 'learning-hub' && (
        <LearningPath 
          ref={learningPathRef}
          onNavigateToShop={() => setActiveView('shop')} 
          onLevelClick={handleLevelClick}
        />
      )}
      
      {activeView === 'shop' && (
        <Quizzes onQuizSelect={handleUserQuizSelect} selectedQuiz={selectedUserQuiz} />
      )}

      {activeView === 'creator' && (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{t("Quiz Creator")}</h3>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <DollarSign className="h-16 w-16 text-accent mx-auto mb-6" />
              <h4 className="text-xl font-semibold mb-4">{t("Welcome to Quiz Creator")}</h4>
              <p className="text-base-content/70 mb-6 leading-relaxed">
                {t("Create engaging quizzes with our intuitive builder. Add questions, set difficulty levels, and track student progress - all from one powerful interface.")}
              </p>
              <div className="bg-base-200 rounded-lg p-4">
                <p className="text-sm text-base-content/60">
                  💡 {t("Get started by creating your first domain, then add quizzes and questions to build comprehensive learning experiences.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'creator-onboarding' && (
        <CreatorOnboarding
          onComplete={handleOnboardingComplete}
          onCancel={handleOnboardingCancel}
        />
      )}

      {activeView === 'domains' && (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-4 overflow-y-auto">
            <DomainTree
              domains={domains}
              onSelectDomain={(domain) => {
                setSelectedQuiz(null);
                setCreatingQuiz(false);
                setSelectedDomain(domain);
              }}
              onCreateDomain={handleCreateDomain}
              onEditDomain={handleEditDomain}
              onDeleteDomain={handleDeleteDomain}
              onMoveDomain={handleMoveDomain}
              onCreateQuiz={handleQuizCreateFromDomains}
            />
          </div>
        </div>
      )}
      
      {activeView === 'quizzes' && (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-4 overflow-y-auto">
            <QuizList
              quizzes={quizzes}
              onCreateQuiz={() => {
                setSelectedDomain(null);
                handleQuizCreate();
              }}
              onEditQuiz={handleEditQuiz}
              onDeleteQuiz={(quiz) => handleDeleteQuiz(quiz.id)}
            />
          </div>
        </div>
      )}
    </aside>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t("Loading domains...")}</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex">
        {/* Main Sidebar */}
        {sidebarOpen && <MainSidebar />}
        
        {/* Second Sidebar */}
        {secondSidebarOpen && !profileSidebarOpen && <SecondSidebar />}
        
        {/* Profile Sidebar */}
        {profileSidebarOpen && <ProfileSidebar onClose={() => setProfileSidebarOpen(false)} />}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeView === 'learning-hub' && !selectedDomain && !selectedQuiz && !creatingQuiz ? (
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold mb-2">
                  {t("Learning Hub")}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t("Access your personalized learning dashboard")}
                </p>
                <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                  <p className="text-sm text-gray-600">
                    {t("Organize your quiz topics and subjects")}
                  </p>
                </div>
              </div>
            ) : activeView === 'shop' ? (
              selectedUserQuiz ? (
                <UserQuizDetail 
                  quiz={selectedUserQuiz}
                  onBack={handleUserQuizBack}
                />
              ) : (
                <div className="text-center py-20">
                  <h2 className="text-xl font-semibold mb-2">
                    {t("Store")}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t("Explore and purchase additional quiz content")}
                  </p>
                  <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                    <ShoppingBag className="h-16 w-16 text-base-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">
                      {t("Select a quiz from the sidebar to view details and start learning")}
                    </p>
                  </div>
                </div>
              )
            ) : selectedDomain ? (
              <DomainDetail
                domain={selectedDomain}
                onUploadResource={() => setResourceUploadOpen(true)}
                onCreateQuestion={() => setQuestionFormOpen(true)}
                onDomainUpdate={(updatedDomain) => {
                  updateDomainInStore(updatedDomain);
                }}
              />
            ) : creatingQuiz ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p>{t("Creating quiz...")}</p>
                </div>
              </div>
            ) : selectedQuiz ? (
              <QuizDetail
                quiz={selectedQuiz}
                domains={domains}
                onSave={handleQuizSave}
                onQuizUpdate={handleQuizUpdate}
                onDelete={handleDeleteQuiz}
              />
            ) : (
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold mb-2">
                  {t("Welcome to Sabuho")}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t("Build custom quizzes and manage content")}
                </p>
                <button className="btn btn-primary" onClick={() => handleCreateDomain()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("Get Started")}
                </button>
                <div className="inline-block ml-3">
                  <button className="btn btn-outline" onClick={() => { setSelectedDomain(null); handleQuizCreate(); }} disabled={creatingQuiz}>
                    <Plus className="h-4 w-4 mr-2" />
                    {creatingQuiz ? t('Creating...') : t('Open Quiz Creator')}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Dialogs */}
        <DomainForm
          isOpen={domainFormOpen}
          onClose={() => setDomainFormOpen(false)}
          domain={editingDomain}
          parentId={parentDomainId}
          onSubmit={handleDomainSubmit}
        />

        <ResourceUpload
          isOpen={resourceUploadOpen}
          onClose={() => setResourceUploadOpen(false)}
          domainId={selectedDomain?.id || ""}
          onUpload={handleResourceUpload}
        />

        <QuestionForm
          isOpen={questionFormOpen}
          onClose={() => setQuestionFormOpen(false)}
          domainId={selectedDomain?.id || ""}
          resources={selectedDomain?.resources || []}
          question={editingQuestion}
          onSubmit={handleQuestionSubmit}
        />

        <DeleteDomainDialog
          isOpen={deleteDomainDialogOpen}
          onClose={() => {
            setDeleteDomainDialogOpen(false);
            setDeletingDomain(null);
          }}
          domain={deletingDomain}
          onConfirm={handleConfirmDeleteDomain}
        />

        {/* Quiz Modal */}
        {quizModalOpen && quizModalData.quizId && quizModalData.levelId && (
          <QuizScreen
            quizId={quizModalData.quizId}
            levelId={quizModalData.levelId}
            readonly={quizModalData.readonly}
            onClose={handleQuizModalClose}
            isModal={true}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}