import { create } from 'zustand'

export const useStore = create((set, get) => ({
  domains: [],
  selectedDomain: null,
  quizzes: [],
  selectedQuiz: null,
  loading: false,
  error: null,
  searchQuery: '',
  collapsedDomains: new Set(),
  
  setDomains: (domains) => set({ domains }),
  setSelectedDomain: (domain) => set({ selectedDomain: domain }),
  setQuizzes: (quizzes) => set({ quizzes }),
  setSelectedQuiz: (quiz) => set({ selectedQuiz: quiz }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleDomainCollapsed: (domainId) => {
    const { collapsedDomains } = get()
    const newCollapsedDomains = new Set(collapsedDomains)
    if (newCollapsedDomains.has(domainId)) {
      newCollapsedDomains.delete(domainId)
    } else {
      newCollapsedDomains.add(domainId)
    }
    set({ collapsedDomains: newCollapsedDomains })
  },
  
  isDomainCollapsed: (domainId) => {
    const { collapsedDomains } = get()
    return collapsedDomains.has(domainId)
  },
  
  addDomain: (domain) => {
    const { domains } = get()
    const newDomain = { ...domain, children: [], resources: [], questions: [] }
    
    if (domain.parent_id) {
      const addToParent = (items) => {
        return items.map(item => {
          if (item.id === domain.parent_id) {
            return { ...item, children: [...(item.children || []), newDomain] }
          }
          if (item.children) {
            return { ...item, children: addToParent(item.children) }
          }
          return item
        })
      }
      set({ domains: addToParent(domains) })
    } else {
      set({ domains: [...domains, newDomain] })
    }
  },
  
  updateDomain: (domain) => {
    const { domains, selectedDomain } = get()
    let updatedSelectedDomain = selectedDomain
    
    const updateInTree = (items) => {
      return items.map(item => {
        if (item.id === domain.id) {
          const updatedDomain = { ...item, ...domain }
          // Track if we need to update selectedDomain
          if (selectedDomain?.id === domain.id) {
            updatedSelectedDomain = updatedDomain
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: updateInTree(item.children) }
        }
        return item
      })
    }
    
    const updatedDomains = updateInTree(domains)
    set({ 
      domains: updatedDomains, 
      selectedDomain: updatedSelectedDomain 
    })
  },
  
  deleteDomain: (domainId) => {
    const { domains } = get()
    const removeFromTree = (items) => {
      return items.filter(item => item.id !== domainId).map(item => ({
        ...item,
        children: item.children ? removeFromTree(item.children) : []
      }))
    }
    set({ domains: removeFromTree(domains) })
  },
  
  addResource: (resource) => {
    const { domains, selectedDomain } = get()
    const updateDomainWithResource = (items) => {
      return items.map(item => {
        if (item.id === resource.domain_id) {
          const updatedDomain = { ...item, resources: [...(item.resources || []), resource] }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: updateDomainWithResource(item.children) }
        }
        return item
      })
    }
    set({ domains: updateDomainWithResource(domains) })
  },
  
  updateResource: (resource) => {
    const { domains, selectedDomain } = get()
    const updateInTree = (items) => {
      return items.map(item => {
        if (item.resources) {
          const updatedResources = item.resources.map(r => r.id === resource.id ? resource : r)
          const updatedDomain = { ...item, resources: updatedResources }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: updateInTree(item.children) }
        }
        return item
      })
    }
    set({ domains: updateInTree(domains) })
  },
  
  deleteResource: (resourceId) => {
    const { domains, selectedDomain } = get()
    const removeFromTree = (items) => {
      return items.map(item => {
        if (item.resources) {
          const updatedResources = item.resources.filter(r => r.id !== resourceId)
          const updatedDomain = { ...item, resources: updatedResources }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: removeFromTree(item.children) }
        }
        return item
      })
    }
    set({ domains: removeFromTree(domains) })
  },
  
  addQuestion: (question) => {
    const { domains, selectedDomain } = get()
    const updateDomainWithQuestion = (items) => {
      return items.map(item => {
        if (item.id === question.domain_id) {
          const updatedDomain = { ...item, questions: [...(item.questions || []), question] }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: updateDomainWithQuestion(item.children) }
        }
        return item
      })
    }
    set({ domains: updateDomainWithQuestion(domains) })
  },
  
  updateQuestion: (question) => {
    const { domains, selectedDomain } = get()
    const updateInTree = (items) => {
      return items.map(item => {
        if (item.questions) {
          const updatedQuestions = item.questions.map(q => q.id === question.id ? question : q)
          const updatedDomain = { ...item, questions: updatedQuestions }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: updateInTree(item.children) }
        }
        return item
      })
    }
    set({ domains: updateInTree(domains) })
  },
  
  deleteQuestion: (questionId) => {
    const { domains, selectedDomain } = get()
    const removeFromTree = (items) => {
      return items.map(item => {
        if (item.questions) {
          const updatedQuestions = item.questions.filter(q => q.id !== questionId)
          const updatedDomain = { ...item, questions: updatedQuestions }
          if (selectedDomain?.id === item.id) {
            set({ selectedDomain: updatedDomain })
          }
          return updatedDomain
        }
        if (item.children) {
          return { ...item, children: removeFromTree(item.children) }
        }
        return item
      })
    }
    set({ domains: removeFromTree(domains) })
  },

  // Quizzes
  addQuiz: (quiz) => {
    const { quizzes } = get()
    set({ quizzes: [...quizzes, quiz] })
  },
  updateQuiz: (quiz) => {
    const { quizzes, selectedQuiz } = get()
    const updated = quizzes.map(q => q.id === quiz.id ? quiz : q)
    set({ quizzes: updated, selectedQuiz: selectedQuiz?.id === quiz.id ? quiz : selectedQuiz })
  },
  deleteQuiz: (quizId) => {
    const { quizzes, selectedQuiz } = get()
    set({ quizzes: quizzes.filter(q => q.id !== quizId), selectedQuiz: selectedQuiz?.id === quizId ? null : selectedQuiz })
  },
}))