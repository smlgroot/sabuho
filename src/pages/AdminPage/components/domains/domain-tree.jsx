'use client'

import React from 'react'
import { Plus, FolderOpen, Folder, Trash2, ChevronRight, ChevronDown, Play, GraduationCap, Edit2 } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'
import { useTranslation } from 'react-i18next'
import { updateDomain } from '@/lib/admin/domains'
import { toast } from 'sonner'

function DomainNode({ domain, level, onSelectDomain, onCreateDomain, onEditDomain, onDeleteDomain, onMoveDomain, allDomains, selectedDomains, toggleDomainSelection, showCheckboxes, onDomainUpdate }) {
  const { t } = useTranslation()
  const { selectedDomain, toggleDomainCollapsed, isDomainCollapsed } = useStore()
  const isSelected = selectedDomain?.id === domain.id
  const hasChildren = domain.children && domain.children.length > 0
  const isCollapsed = isDomainCollapsed(domain.id)
  const indentationLeft = level * 8 // 8px per level for indentation
  const isChecked = selectedDomains.has(domain.id)
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false)
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 })
  const contextMenuRef = React.useRef(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isDropTarget, setIsDropTarget] = React.useState(false)
  const nodeRef = React.useRef(null)
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [renamingValue, setRenamingValue] = React.useState(domain.name)
  const inputRef = React.useRef(null)

  // Close context menu when clicking outside
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    setRenamingValue(domain.name)
    setContextMenuOpen(false)
  }

  const cancelRename = () => {
    setIsRenaming(false)
    setRenamingValue(domain.name)
  }

  const saveRename = async () => {
    if (renamingValue.trim() === '') {
      toast.error(t("Name cannot be empty"))
      return
    }

    if (renamingValue.trim() === domain.name) {
      setIsRenaming(false)
      return
    }

    try {
      const updated = await updateDomain(domain.id, { name: renamingValue.trim() })
      if (onDomainUpdate) {
        onDomainUpdate(updated)
      }
      setIsRenaming(false)
      toast.success(t("Domain renamed successfully"))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rename domain"
      toast.error(errorMessage)
      setRenamingValue(domain.name)
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

  // Helper to find a domain in the tree by ID
  const findDomainById = (domains, id) => {
    for (const d of domains) {
      if (d.id === id) return d
      if (d.children) {
        const found = findDomainById(d.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Check if targetId is a descendant of parentDomain
  const isDescendantOf = (parentDomain, targetId) => {
    if (!parentDomain || !parentDomain.children) return false
    for (const child of parentDomain.children) {
      if (child.id === targetId) return true
      if (isDescendantOf(child, targetId)) return true
    }
    return false
  }

  const handleDragStart = (e) => {
    // Prevent dragging by text selection
    if (e.target.tagName === 'BUTTON' && !e.target.hasAttribute('draggable')) {
      return
    }

    e.stopPropagation()
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: domain.id,
      name: domain.name,
      parent_id: domain.parent_id
    }))

    // Create a fully opaque drag image
    const dragImage = document.createElement('div')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-9999px'
    dragImage.style.left = '-9999px'
    dragImage.style.padding = '0.75rem 1rem'
    dragImage.style.backgroundColor = '#ffffff'
    dragImage.style.border = '2px solid'
    dragImage.style.borderColor = 'var(--fallback-p,oklch(var(--p)/1))'
    dragImage.style.borderRadius = '0.5rem'
    dragImage.style.boxShadow = '0 10px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)'
    dragImage.style.fontSize = '14px'
    dragImage.style.fontWeight = '500'
    dragImage.style.color = '#000000'
    dragImage.style.whiteSpace = 'nowrap'
    dragImage.style.zIndex = '9999'
    dragImage.innerHTML = domain.name

    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragEnd = (e) => {
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsDropTarget(true)
  }

  const handleDragLeave = (e) => {
    // Only clear drop target if actually leaving this element
    if (nodeRef.current && !nodeRef.current.contains(e.relatedTarget)) {
      setIsDropTarget(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropTarget(false)

    try {
      const draggedData = JSON.parse(e.dataTransfer.getData('application/json'))

      // Prevent dropping onto itself
      if (draggedData.id === domain.id) return

      // Check if already in this folder
      if (draggedData.parent_id === domain.id) return

      // Find the dragged domain in the tree
      const draggedDomain = findDomainById(allDomains, draggedData.id)
      if (!draggedDomain) {
        console.error('Dragged domain not found in tree')
        return
      }

      // Prevent dropping a folder into its own descendants
      if (isDescendantOf(draggedDomain, domain.id)) return

      // Call the move handler
      onMoveDomain(draggedData.id, domain.id)
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }

  return (
    <>
      <div className="w-full">
        <div
          className={`flex items-center group relative min-w-0 transition-all cursor-move select-none ${
            isDragging ? 'scale-105 shadow-lg ring-2 ring-primary bg-base-200 rounded-lg' : ''
          } ${
            isDropTarget ? 'bg-primary/20 rounded-lg' : ''
          }`}
        >
            {showCheckboxes && (
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm mr-2 flex-shrink-0"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation()
                  toggleDomainSelection(domain.id)
                }}
              />
            )}
          <div
            ref={nodeRef}
            className="flex items-center flex-1 min-w-0"
            style={{ paddingLeft: `${indentationLeft}px` }}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleDomainCollapsed(domain.id)
                }}
                className="btn btn-ghost btn-xs p-0.5 mr-1 flex-shrink-0"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4 mr-1 flex-shrink-0" />
            )}
            <button
              className={`btn btn-ghost flex-1 justify-start pr-8 text-left min-w-0 ${
                isRenaming
                  ? 'bg-base-200 !border-0 !outline-none'
                  : isSelected
                    ? 'btn-active bg-primary/10 text-primary'
                    : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDomain(domain);
              }}
            >
              <div className="flex items-center mr-2">
                {level === 0 ? (
                  // Root level folder - show larger folder icon
                  hasChildren ? (
                    <FolderOpen className="h-4 w-4 text-primary mr-2" />
                  ) : (
                    <Folder className="h-4 w-4 text-primary mr-2" />
                  )
                ) : (
                  // Child folder - show smaller, muted folder icon
                  hasChildren ? (
                    <FolderOpen className="h-3.5 w-3.5 opacity-70 mr-2" />
                  ) : (
                    <Folder className="h-3.5 w-3.5 opacity-70 mr-2" />
                  )
                )}
              </div>
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
                  className={`flex-1 min-w-0 bg-transparent px-0.5 focus:outline-none focus:ring-0 focus:border-0 ${level === 0 ? 'font-medium' : ''}`}
                  value={renamingValue}
                  onChange={(e) => setRenamingValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={saveRename}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`flex-1 truncate min-w-0 ${level === 0 ? 'font-medium' : ''}`}>
                  {domain.name}
                </span>
              )}
              {domain.questions && domain.questions.length > 0 && (
                <div className="badge badge-neutral badge-sm ml-2">
                  {domain.questions.length}
                </div>
              )}
            </button>
          </div>
        </div>
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
                onCreateDomain(domain.id, 'folder')
                setContextMenuOpen(false)
              }}
            >
              <Folder className="h-4 w-4 mr-2" />
              {t("Add Sub Folder")}
            </button>
          </li>
          <li className="border-t border-base-300 my-1"></li>
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
                onDeleteDomain(domain)
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
      {!isCollapsed && domain.children?.map((child) => (
        <DomainNode
          key={child.id}
          domain={child}
          level={level + 1}
          onSelectDomain={onSelectDomain}
          onCreateDomain={onCreateDomain}
          onEditDomain={onEditDomain}
          onDeleteDomain={onDeleteDomain}
          onMoveDomain={onMoveDomain}
          allDomains={allDomains}
          selectedDomains={selectedDomains}
          toggleDomainSelection={toggleDomainSelection}
          showCheckboxes={showCheckboxes}
          onDomainUpdate={onDomainUpdate}
        />
      ))}
    </>
  )
}

export function DomainTree({ domains, onSelectDomain, onCreateDomain, onEditDomain, onDeleteDomain, onMoveDomain, onCreateQuiz, onDomainUpdate }) {
  const { t } = useTranslation()
  const dropZoneRef = React.useRef(null)
  const [selectedDomains, setSelectedDomains] = React.useState(new Set())
  const [isLearnMode, setIsLearnMode] = React.useState(false)

  // Helper to find a domain in the tree by ID
  const findDomainById = (domainList, id) => {
    for (const d of domainList) {
      if (d.id === id) return d
      if (d.children) {
        const found = findDomainById(d.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Toggle domain selection
  const toggleDomainSelection = (domainId) => {
    setSelectedDomains(prev => {
      const newSet = new Set(prev)
      if (newSet.has(domainId)) {
        newSet.delete(domainId)
      } else {
        newSet.add(domainId)
      }
      return newSet
    })
  }

  // Count questions from selected domains
  const countQuestionsFromDomain = (domain) => {
    let count = 0
    // Count questions directly in this domain
    count += domain.questions?.length || 0
    // Count questions in child domains
    if (domain.children) {
      for (const child of domain.children) {
        count += countQuestionsFromDomain(child)
      }
    }
    return count
  }

  const totalQuestions = React.useMemo(() => {
    let total = 0
    for (const domainId of selectedDomains) {
      const domain = findDomainById(domains, domainId)
      if (domain) {
        total += countQuestionsFromDomain(domain)
      }
    }
    return total
  }, [selectedDomains, domains])

  // Handle drop at root level (moving to root)
  const handleDragOver = (e) => {
    // Only accept drops within the drop zone element
    if (!dropZoneRef.current) return

    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragLeave = (e) => {
    // No visual feedback needed
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const draggedData = JSON.parse(e.dataTransfer.getData('application/json'))

      // Check if domain exists in tree
      const draggedDomain = findDomainById(domains, draggedData.id)
      if (!draggedDomain) {
        console.error('Dragged domain not found in tree')
        return
      }

      // Check if already at root
      if (draggedData.parent_id === null) return

      // Move to root (null parent)
      onMoveDomain(draggedData.id, null)
    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header with Learn/Start Buttons */}
      {domains.length > 0 && (
        <div
          className={`card bg-white transition-colors ${!isLearnMode ? 'hover:bg-success/10 cursor-pointer' : 'bg-success/10'}`}
          onClick={!isLearnMode ? () => setIsLearnMode(true) : undefined}
        >
          <div className="card-body p-3">
            {!isLearnMode ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-semibold">{t("Learn")}</h3>
                </div>
                <Play className="h-5 w-5 text-success" />
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  className="btn"
                  onClick={() => {
                    setIsLearnMode(false)
                    setSelectedDomains(new Set())
                  }}
                >
                  {t("Cancel")}
                </button>
                <button
                  className="btn btn-success flex-1"
                  disabled={totalQuestions === 0}
                  onClick={() => {
                    // Create quiz with selected domains
                    if (onCreateQuiz && selectedDomains.size > 0) {
                      onCreateQuiz(Array.from(selectedDomains))
                      // Reset selection after creating quiz
                      setIsLearnMode(false)
                      setSelectedDomains(new Set())
                    }
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t("Start")} ({totalQuestions})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Domains List - Drop zone for moving to root */}
      <div
        ref={dropZoneRef}
        className="space-y-1 overflow-x-hidden min-h-[100px]"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {domains.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p className="mb-4">{t("No domains yet")}</p>
              <button
                className="btn btn-primary"
                onClick={() => onCreateDomain(null, 'folder')}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("Add Folder")}
              </button>
            </div>
          </div>
        ) : (
          domains.map((domain) => (
            <DomainNode
              key={domain.id}
              domain={domain}
              level={0}
              onSelectDomain={onSelectDomain}
              onCreateDomain={onCreateDomain}
              onEditDomain={onEditDomain}
              onDeleteDomain={onDeleteDomain}
              onMoveDomain={onMoveDomain}
              allDomains={domains}
              selectedDomains={selectedDomains}
              toggleDomainSelection={toggleDomainSelection}
              showCheckboxes={isLearnMode}
              onDomainUpdate={onDomainUpdate}
            />
          ))
        )}
      </div>
    </div>
  )
}