'use client'

import { Plus, MoreHorizontal, FileText, Edit, Trash2 } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'

export function QuizList({ quizzes, onCreateQuiz, onEditQuiz, onDeleteQuiz }) {
  const { selectedQuiz, setSelectedQuiz, setSelectedDomain } = useStore()

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Quizzes</h3>
        <button
          className="btn btn-ghost btn-sm h-6 w-6 p-0 opacity-70 hover:opacity-100"
          onClick={() => {
            setSelectedDomain(null)
            setSelectedQuiz(null)
            onCreateQuiz()
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add Quiz</span>
        </button>
      </div>
      <div>
        <div className="space-y-1">
          {quizzes.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <p>No quizzes yet</p>
              <button
                className="btn btn-ghost btn-sm mt-2 text-xs"
                onClick={() => onCreateQuiz()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create your first quiz
              </button>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} className="w-full">
                <div className="flex items-center group relative">
                  <button
                    className={`flex-1 pr-8 text-left p-2 rounded hover:bg-muted flex items-center ${selectedQuiz?.id === quiz.id ? 'bg-blue-300 text-white font-medium' : ''}`}
                    onClick={() => {
                      setSelectedDomain(null)
                      setSelectedQuiz(quiz)
                    }}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="flex-1 truncate">{quiz.name}</span>
                  </button>

                  <div className="dropdown dropdown-end">
                    <button
                      tabIndex={0}
                      className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </button>
                    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow">
                      <li>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditQuiz(quiz)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Quiz
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteQuiz(quiz)
                          }}
                          className="text-error hover:bg-error hover:text-white"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Quiz
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}