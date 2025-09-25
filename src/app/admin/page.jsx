import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, GraduationCap, Folder, FileText, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Menu, ShoppingBag, Star, Settings, HelpCircle, LogOut, Moon, Sun, Languages } from "lucide-react";
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
import { useNavigate } from 'react-router-dom';
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
  const hasLoadedData = useRef(false);
  
  // Quiz modal state
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizModalData, setQuizModalData] = useState({ quizId: null, levelId: null, readonly: false });
  const learningPathRef = useRef(null);

  const { user } = useAuth();


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

  const handleCreateDomain = (parentId) => {
    setParentDomainId(parentId);
    setEditingDomain(null);
    setDomainFormOpen(true);
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
    if (!confirm(t('Are you sure you want to delete this quiz?'))) return;
    try {
      await deleteQuizApi(quizId);
      deleteQuizFromStore(quizId);
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
      }
      toast.success(t('Quiz deleted successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quiz';
      setError(errorMessage);
      toast.error(errorMessage);
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

  const MainSidebar = () => (
    <aside className="w-20 bg-base-200 text-base-content flex flex-col min-h-full border-r border-base-300">
      {/* Main Navigation Menu */}
      <div className="flex-1 flex flex-col items-center py-4 gap-2">
        {/* Sidebar Toggle */}
        <button 
          className="btn btn-ghost p-3 h-auto w-16"
          onClick={() => setSecondSidebarOpen(!secondSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Learning Hub */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'learning-hub' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            setActiveView('learning-hub');
            setProfileSidebarOpen(false);
            setSelectedDomain(null);
            setSelectedQuiz(null);
            setCreatingQuiz(false);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <GraduationCap className="h-6 w-6" />
          <span className="text-xs">{t("Learning")}</span>
        </button>
        
        {/* Shop */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'shop' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            setActiveView('shop');
            setProfileSidebarOpen(false);
            setSelectedDomain(null);
            setSelectedQuiz(null);
            setCreatingQuiz(false);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <ShoppingBag className="h-6 w-6" />
          <span className="text-xs">{t("Shop")}</span>
        </button>
        
        {/* Separator */}
        <div className="divider w-12 my-2 mx-auto"></div>
        
        {/* Creator */}
        <button 
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${creatorOpen ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            setCreatorOpen(!creatorOpen);
            if (!creatorOpen) {
              setActiveView('creator');
              setProfileSidebarOpen(false);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }
          }}
        >
          <Star className="h-6 w-6" />
          <span className="text-xs">{t("Creator")}</span>
          {creatorOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        
        {/* Domains - only show when creator is open */}
        {creatorOpen && (
          <button 
            className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'domains' ? 'btn-active bg-primary/10 text-primary' : ''}`}
            onClick={() => {
              setActiveView('domains');
              setProfileSidebarOpen(false);
              setSelectedQuiz(null);
              setCreatingQuiz(false);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }}
          >
            <Folder className="h-6 w-6" />
            <span className="text-xs">{t("Domains")}</span>
          </button>
        )}
        
        {/* Quizzes - only show when creator is open */}
        {creatorOpen && (
          <button 
            className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'quizzes' ? 'btn-active bg-primary/10 text-primary' : ''}`}
            onClick={() => {
              setActiveView('quizzes');
              setProfileSidebarOpen(false);
              setSelectedDomain(null);
              if (!secondSidebarOpen) setSecondSidebarOpen(true);
            }}
          >
            <FileText className="h-6 w-6" />
            <span className="text-xs">{t("Quizzes")}</span>
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
        <Quizzes />
      )}

      {activeView === 'creator' && (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{t("Quiz Creator")}</h3>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Star className="h-16 w-16 text-accent mx-auto mb-6" />
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

      {activeView === 'domains' && (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{t("Domains")}</h3>
          </div>
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
            />
          </div>
        </div>
      )}
      
      {activeView === 'quizzes' && (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">{t("Quizzes")}</h3>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <QuizList
              quizzes={quizzes}
              onCreateQuiz={() => {
                setSelectedDomain(null);
                handleQuizCreate();
              }}
              onEditQuiz={(quiz) => {
                setCreatingQuiz(false);
                setSelectedDomain(null);
                setSelectedQuiz(quiz);
              }}
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
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold mb-2">
                  {t("Shop")}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t("Explore and purchase additional quiz content")}
                </p>
                <div className="bg-base-200 rounded-lg p-8 max-w-md mx-auto">
                  <ShoppingBag className="h-16 w-16 text-base-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    {t("Manage Domains")}
                  </p>
                </div>
              </div>
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
              />
            ) : (
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold mb-2">
                  {t("Welcome to Quiz Quest Admin")}
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