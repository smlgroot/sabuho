import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useGameStore = create(
  persist(
    (set, get) => ({
      loading: false,
      selectedQuiz: null,

      setLoading: (loading) => set({ loading }),

      setSelectedQuiz: (quiz) => set({ selectedQuiz: quiz }),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        selectedQuiz: state.selectedQuiz
      })
    }
  )
)

export default useGameStore