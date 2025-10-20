import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Folder, FileText, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Menu, Settings, HelpCircle, LogOut, Moon, Sun, Languages } from "lucide-react";
import { toast } from "sonner";
import { DomainTree } from "./components/domains/domain-tree";
import { QuizList } from "./components/quizzes/quiz-list";
import { QuizDetail } from "./components/quizzes/quiz-detail";
import { DomainDetail } from "./components/domains/domain-detail";
import { DomainForm } from "./components/domains/domain-form";
import { DeleteDomainDialog } from "./components/domains/delete-domain-dialog";
import { ResourceUpload } from "./components/resources/resource-upload";
import { SearchBar } from "./components/shared/search-bar";
import { ProtectedRoute } from "@/pages/AuthPage/components/protected-route";
import { useAuth } from "@/lib/admin/auth";
import { UserMenu } from "@/pages/AuthPage/components/user-menu";
import { useStore } from "@/store/useStore";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [editingDomain, setEditingDomain] = useState(null);
  const [deletingDomain, setDeletingDomain] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [parentDomainId, setParentDomainId] = useState(undefined);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [secondSidebarOpen, setSecondSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('domains'); // 'domains', 'quizzes'
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const hasLoadedData = useRef(false);

  const { user, userProfile, loadUserProfile } = useAuth();
  const { trackEvent } = usePlausible();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeView with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      // Redirect to domains by default
      navigate('/admin/domains', { replace: true });
    } else if (path.includes('/admin/domains')) {
      setActiveView('domains');
    } else if (path.includes('/admin/quizzes')) {
      setActiveView('quizzes');
    }
  }, [location.pathname, navigate]);

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
        navigate('/admin/quizzes');
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
      navigate('/admin/quizzes');
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
    <aside className="min-w-20 bg-base-200 text-base-content flex flex-col h-full border-r border-base-300">
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

        {/* Domains */}
        <button
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'domains' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            trackEvent('main_sidebar_navigation', { props: { section: 'domains', previous_view: activeView } });
            navigate('/admin/domains');
            setProfileSidebarOpen(false);
            setSelectedQuiz(null);
            setCreatingQuiz(false);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <Folder className="h-6 w-6" />
          <span className="text-xs whitespace-nowrap">{t("Domains")}</span>
        </button>

        {/* Quizzes */}
        <button
          className={`btn btn-ghost flex flex-col items-center gap-1 p-3 h-auto min-w-16 hover:bg-primary/10 hover:text-primary transition-colors ${activeView === 'quizzes' ? 'btn-active bg-primary/10 text-primary' : ''}`}
          onClick={() => {
            trackEvent('main_sidebar_navigation', { props: { section: 'quizzes', previous_view: activeView } });
            navigate('/admin/quizzes');
            setProfileSidebarOpen(false);
            setSelectedDomain(null);
            if (!secondSidebarOpen) setSecondSidebarOpen(true);
          }}
        >
          <FileText className="h-6 w-6" />
          <span className="text-xs whitespace-nowrap">{t("Quizzes")}</span>
        </button>
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
    <aside className="w-80 bg-base-100 border-r border-base-300 flex flex-col h-full">
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
              onDomainUpdate={updateDomainInStore}
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
      <div className="h-screen flex">
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
            {selectedDomain ? (
              <DomainDetail
                domain={selectedDomain}
                onUploadResource={() => setResourceUploadOpen(true)}
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

        <DeleteDomainDialog
          isOpen={deleteDomainDialogOpen}
          onClose={() => {
            setDeleteDomainDialogOpen(false);
            setDeletingDomain(null);
          }}
          domain={deletingDomain}
          onConfirm={handleConfirmDeleteDomain}
        />
      </div>
    </ProtectedRoute>
  );
}