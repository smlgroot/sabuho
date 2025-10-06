'use client'

import React from 'react'
import { Plus, FolderOpen, Folder, File, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'
import { useTranslation } from 'react-i18next'

function DomainNode({ domain, level, onSelectDomain, onCreateDomain, onEditDomain, onDeleteDomain }) {
  const { t } = useTranslation()
  const { selectedDomain, toggleDomainCollapsed, isDomainCollapsed } = useStore()
  const isSelected = selectedDomain?.id === domain.id
  const hasChildren = domain.children && domain.children.length > 0
  const isCollapsed = isDomainCollapsed(domain.id)
  const indentationLeft = level * 20 // 20px per level for indentation
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false)
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 })
  const contextMenuRef = React.useRef(null)

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

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setContextMenuOpen(true)
  }

  return (
    <>
      <div className="w-full">
        <div
          className="flex items-center group relative min-w-0"
          style={{ paddingLeft: `${indentationLeft}px` }}
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
            className={`btn btn-ghost flex-1 justify-start pr-8 text-left min-w-0 ${isSelected ? 'btn-active bg-primary/10 text-primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDomain(domain);
            }}
          >
            <div className="flex items-center mr-2">
              {domain.domain_type === 'file' ? (
                // File type domains - show file icon
                level === 0 ? (
                  <File className="h-4 w-4 text-primary mr-2" />
                ) : (
                  <File className="h-3.5 w-3.5 opacity-70 mr-2" />
                )
              ) : level === 0 ? (
                // Root level folder domains - always show folder icons
                hasChildren ? (
                  <FolderOpen className="h-4 w-4 text-primary mr-2" />
                ) : (
                  <Folder className="h-4 w-4 text-primary mr-2" />
                )
              ) : (
                // Child folder domains - show smaller, muted folder icons
                hasChildren ? (
                  <FolderOpen className="h-3.5 w-3.5 opacity-70 mr-2" />
                ) : (
                  <Folder className="h-3.5 w-3.5 opacity-70 mr-2" />
                )
              )}
            </div>
            <span className={`flex-1 truncate min-w-0 ${level === 0 ? 'font-medium' : ''}`}>
              {domain.name}
            </span>
            {domain.domain_type === 'file' && (
              <div className="badge badge-neutral badge-sm ml-2">
                {domain.questions?.length || 0}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuOpen && (
        <ul
          ref={contextMenuRef}
          className="menu bg-base-100 rounded-box w-48 p-2 shadow-lg border border-base-300 fixed z-50"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          {domain.domain_type === 'folder' && (
            <>
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
              <li>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateDomain(domain.id, 'file')
                    setContextMenuOpen(false)
                  }}
                >
                  <File className="h-4 w-4 mr-2" />
                  {t("Add File")}
                </button>
              </li>
              <li><hr className="divider my-1" /></li>
            </>
          )}
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
        />
      ))}
    </>
  )
}

export function DomainTree({ domains, onSelectDomain, onCreateDomain, onEditDomain, onDeleteDomain }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      {/* Add Folder Button */}
      <button
        className="btn btn-primary w-full"
        onClick={() => onCreateDomain(null, 'folder')}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("Add Folder")}
      </button>
      
      {/* Domains List */}
      <div className="space-y-1 overflow-x-hidden">
        {domains.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p>{t("No domains yet")}</p>
              <p className="text-sm opacity-70 mt-1">{t("Click the button above to create your first domain")}</p>
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
            />
          ))
        )}
      </div>
    </div>
  )
}