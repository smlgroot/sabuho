'use client'

import { Plus, MoreHorizontal, FileText, Edit, Trash2 } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'

export function QuizList({ quizzes, onCreateQuiz, onEditQuiz, onDeleteQuiz }) {
  const { selectedQuiz, setSelectedQuiz, setSelectedDomain } = useStore()

  return (
    <div className="space-y-4">
      {/* Add Quiz Button */}
      <button
        className="btn btn-primary w-full"
        onClick={() => {
          setSelectedDomain(null)
          setSelectedQuiz(null)
          onCreateQuiz()
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Quiz
      </button>
      
      {/* Quizzes List */}
      <div className="space-y-1 overflow-x-hidden">
        {quizzes.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p>No quizzes yet</p>
              <p className="text-sm opacity-70 mt-1">Click the button above to create your first quiz</p>
            </div>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div key={quiz.id} className="w-full min-w-0">
              <div className="flex items-center group relative min-w-0">
                <button
                  className={`btn btn-ghost flex-1 justify-start pr-8 text-left min-w-0 ${selectedQuiz?.id === quiz.id ? 'btn-active btn-primary' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditQuiz(quiz);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="flex-1 truncate min-w-0">{quiz.name}</span>
                </button>

                <div className="dropdown dropdown-end flex-shrink-0">
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
  )
}