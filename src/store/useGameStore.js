import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  loading: false,
  selectedQuiz: null,

  setLoading: (loading) => set({ loading }),

  setSelectedQuiz: (quiz) => set({ selectedQuiz: quiz }),
}))

export default useGameStore