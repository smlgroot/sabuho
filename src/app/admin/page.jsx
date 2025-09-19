"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DomainTree } from "@/components/domain-tree";
import { QuizList } from "@/components/quiz-list";
import { QuizDetail } from "@/components/quiz-detail";
import { DomainDetail } from "@/components/domain-detail";
import { DomainForm } from "@/components/domain-form";
import { DeleteDomainDialog } from "@/components/delete-domain-dialog";
import { ResourceUpload } from "@/components/resource-upload";
import { QuestionForm } from "@/components/question-form";
import { SearchBar } from "@/components/search-bar";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/lib/auth";
import { UserMenu } from "@/components/auth/user-menu";
import { useStore } from "@/store/useStore";
import {
  fetchDomains,
  createDomain,
  updateDomain,
  deleteDomain,
} from "@/lib/domains";
import { uploadResource } from "@/lib/resources";
import { createQuestion } from "@/lib/questions";
import { fetchQuizzes, createQuiz as createQuizApi, updateQuiz as updateQuizApi, deleteQuiz as deleteQuizApi } from "@/lib/quizzes";

export default function HomePage() {
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
  const hasLoadedData = useRef(false);

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
      toast.success("Domain deleted successfully");
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
      toast.success(editingDomain ? "Domain updated successfully" : "Domain created successfully");
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
    if (!selectedDomain) throw new Error("No domain selected");

    try {
      const resource = await uploadResource(
        file,
        selectedDomain.id,
        name,
        description
      );
      addResource(resource);
      setResourceUploadOpen(false);
      toast.success("Resource uploaded successfully");
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
      toast.success("Question created successfully");
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
    if (confirm("Are you sure you want to delete this question?")) {
      try {
        // TODO: Implement deleteQuestion in lib/questions.ts
        console.log("Delete question:", question.id);
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
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await deleteQuizApi(quizId);
      deleteQuizFromStore(quizId);
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
      }
      toast.success('Quiz deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quiz';
      setError(errorMessage);
      toast.error(errorMessage);
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

  const AppSidebar = () => (
    <div className="drawer-side">
      <label htmlFor="drawer-toggle" className="drawer-overlay"></label>
      <aside className="min-h-full w-80 bg-base-200 text-base-content">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Quiz Quest Admin</h2>
        </div>
        <div className="flex-1 px-4">
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
        <div className="p-4">
          <UserMenu />
        </div>
      </aside>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading domains...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="drawer">
        <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* Header */}
          <header className="border-b p-4 bg-base-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost drawer-button">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  </svg>
                </label>
                {selectedDomain ? (
                  <div className="breadcrumbs text-sm">
                    <ul>
                      {getBreadcrumbPath(selectedDomain.id).map((item, index, array) => (
                        <li key={item.id}>
                          <span className={index === array.length - 1 ? "font-semibold" : ""}>
                            {item.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : selectedQuiz ? (
                  <h1 className="text-2xl font-bold">{selectedQuiz.name}</h1>
                ) : creatingQuiz ? (
                  <h1 className="text-2xl font-bold">New Quiz</h1>
                ) : (
                  <h1 className="text-2xl font-bold">Quiz Quest Admin</h1>
                )}
              </div>

              <div></div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {selectedDomain ? (
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
                  <p>Creating quiz...</p>
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
                  Welcome to Quiz Quest Admin
                </h2>
                <p className="text-muted-foreground mb-6">
                  Select a domain or quiz from the sidebar, or create a new one to get started.
                </p>
                <button className="btn btn-primary" onClick={() => handleCreateDomain()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create a New Domain
                </button>
                <div className="inline-block ml-3">
                  <button className="btn btn-outline" onClick={() => { setSelectedDomain(null); handleQuizCreate(); }} disabled={creatingQuiz}>
                    <Plus className="h-4 w-4 mr-2" />
                    {creatingQuiz ? 'Creating...' : 'Create a New Quiz'}
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

        <AppSidebar />
      </div>
    </ProtectedRoute>
  );
}