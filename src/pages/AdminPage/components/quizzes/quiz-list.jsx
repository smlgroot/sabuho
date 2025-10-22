'use client'

import { Plus, FileText, Coins, Edit2, Trash2 } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { updateQuiz } from '@/lib/admin/quizzes'
import { toast } from 'sonner'

function QuizItem({ quiz, isSelected, onEditQuiz, onDeleteQuiz, onQuizUpdate }) {
  const { t } = useTranslation()
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const contextMenuRef = useRef(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renamingValue, setRenamingValue] = useState(quiz.name)
  const inputRef = useRef(null)

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenuOpen(false)
      }
    }

    if (contextMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenuOpen])

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuOpen(true)
  }

  const startRename = () => {
    setIsRenaming(true)
    setRenamingValue(quiz.name)
    setContextMenuOpen(false)
  }

  const cancelRename = () => {
    setIsRenaming(false)
    setRenamingValue(quiz.name)
  }

  const saveRename = async () => {
    if (renamingValue.trim() === '') {
      toast.error(t("Name cannot be empty"))
      return
    }

    if (renamingValue.trim() === quiz.name) {
      setIsRenaming(false)
      return
    }

    try {
      const updated = await updateQuiz(quiz.id, {
        name: renamingValue.trim()
      })
      if (onQuizUpdate) {
        onQuizUpdate(updated)
      }
      setIsRenaming(false)
      toast.success(t("Quiz renamed successfully"))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rename quiz"
      toast.error(errorMessage)
      setRenamingValue(quiz.name)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelRename()
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center group relative min-w-0">
        <button
          className={`btn btn-ghost flex-1 justify-start text-left min-w-0 ${
            isRenaming
              ? 'bg-base-200 !border-0 !outline-none'
              : isSelected
                ? 'btn-active bg-primary/10 text-primary'
                : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onEditQuiz(quiz);
          }}
          onContextMenu={handleContextMenu}
        >
          <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              style={{
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                borderWidth: '0',
                borderStyle: 'none'
              }}
              className="flex-1 min-w-0 bg-transparent px-0.5 focus:outline-none focus:ring-0 focus:border-0"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveRename}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate min-w-0">{quiz.name}</span>
          )}
        </button>
      </div>

      {/* Context Menu */}
      {contextMenuOpen && (
        <ul
          ref={contextMenuRef}
          className="menu bg-base-100 rounded-box w-48 p-2 shadow-lg fixed z-50"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          <li>
            <button
              onClick={(e) => {
                e.stopPropagation()
                startRename()
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              {t("Rename")}
            </button>
          </li>
          <li className="border-t border-base-300 my-1"></li>
          <li>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteQuiz(quiz)
                setContextMenuOpen(false)
              }}
              className="text-error hover:bg-error hover:text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("Delete")}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

export function QuizList({ quizzes, onCreateQuiz, onEditQuiz, onDeleteQuiz }) {
  const { t } = useTranslation()
  const { selectedQuiz, setSelectedQuiz, setSelectedDomain, updateQuiz: updateQuizInStore } = useStore()
  const [userCredits, setUserCredits] = useState(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(false)

  return (
    <div className="space-y-3">
      {/* Credits Header */}
      <div className="card bg-white hover:bg-primary/10 transition-colors cursor-pointer">
        <div className="card-body p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{t("Credits")}</h3>
            </div>
            <div className="text-right">
              {isLoadingCredits ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <div className="text-3xl font-bold text-primary">{userCredits}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Quizzes List */}
      <div className="space-y-1 overflow-x-hidden">
        {quizzes.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p>No quizzes yet</p>
              <p className="text-sm opacity-70 mt-1">{t("Click the button above to create your first quiz")}</p>
            </div>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <QuizItem
              key={quiz.id}
              quiz={quiz}
              isSelected={selectedQuiz?.id === quiz.id}
              onEditQuiz={onEditQuiz}
              onDeleteQuiz={onDeleteQuiz}
              onQuizUpdate={updateQuizInStore}
            />
          ))
        )}
      </div>
    </div>
  )
}