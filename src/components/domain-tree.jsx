'use client'

import { Plus, MoreHorizontal, FolderOpen, Folder, Edit, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
// DaisyUI components used directly
import { useStore } from '@/store/useStore'

function DomainNode({ domain, level, onSelectDomain, onCreateDomain, onEditDomain, onDeleteDomain }) {
  const { selectedDomain, toggleDomainCollapsed, isDomainCollapsed } = useStore()
  const isSelected = selectedDomain?.id === domain.id
  const hasChildren = domain.children && domain.children.length > 0
  const isCollapsed = isDomainCollapsed(domain.id)
  const indentationLeft = level * 20 // 20px per level for indentation

  return (
    <>
      <div className="w-full">
        <div className="flex items-center group relative" style={{ paddingLeft: `${indentationLeft}px` }}>
          {hasChildren ? (
            <div
              onClick={(e) => {
                e.stopPropagation()
                toggleDomainCollapsed(domain.id)
              }}
              className="hover:bg-muted rounded p-0.5 mr-1 cursor-pointer flex-shrink-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4 mr-1 flex-shrink-0" />
          )}
          <button
            className={`flex-1 pr-8 text-left p-2 rounded hover:bg-muted flex items-center ${isSelected ? 'bg-blue-300 text-white font-medium' : ''}`}
            onClick={() => onSelectDomain(domain)}
          >
            <div className="flex items-center mr-2">
              {level === 0 ? (
                // Root level domains - always show folder icons
                hasChildren ? (
                  <FolderOpen className="h-4 w-4 text-blue-600 mr-2" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-600 mr-2" />
                )
              ) : (
                // Child domains - show smaller, muted folder icons
                hasChildren ? (
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                ) : (
                  <Folder className="h-3.5 w-3.5 text-muted-foreground mr-2" />
                )
              )}
            </div>
            <span className={`flex-1 truncate ${level === 0 ? 'font-medium' : ''}`}>
              {domain.name}
            </span>
            {domain.question_count && domain.question_count > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                {domain.question_count}
              </span>
            )}
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
                    onCreateDomain(domain.id)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subdomain
                </button>
              </li>
              <li><hr className="my-1" /></li>
              <li>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditDomain(domain)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Domain
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteDomain(domain)
                  }}
                  className="text-error hover:bg-error hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Domain
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
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
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Domains</h3>
        <button
          className="btn btn-ghost btn-sm h-6 w-6 p-0 opacity-70 hover:opacity-100"
          onClick={() => onCreateDomain()}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add Domain</span>
        </button>
      </div>
      <div>
        <div className="space-y-1">
          {domains.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <p>No domains yet</p>
              <button
                className="btn btn-ghost btn-sm mt-2 text-xs"
                onClick={() => onCreateDomain()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Create your first domain
              </button>
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
    </div>
  )
}