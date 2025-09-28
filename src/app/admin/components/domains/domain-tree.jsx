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
        <div className="flex items-center group relative min-w-0" style={{ paddingLeft: `${indentationLeft}px` }}>
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
              {level === 0 ? (
                // Root level domains - always show folder icons
                hasChildren ? (
                  <FolderOpen className="h-4 w-4 text-primary mr-2" />
                ) : (
                  <Folder className="h-4 w-4 text-primary mr-2" />
                )
              ) : (
                // Child domains - show smaller, muted folder icons
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
            {domain.question_count && domain.question_count > 0 && (
              <div className="badge badge-neutral badge-sm ml-2">
                {domain.question_count}
              </div>
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
              <li><hr className="divider my-1" /></li>
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
    <div className="space-y-4">
      {/* Add Domain Button */}
      <button
        className="btn btn-primary w-full"
        onClick={() => onCreateDomain()}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Domain
      </button>
      
      {/* Domains List */}
      <div className="space-y-1 overflow-x-hidden">
        {domains.length === 0 ? (
          <div className="alert alert-info">
            <div className="text-center w-full">
              <p>No domains yet</p>
              <p className="text-sm opacity-70 mt-1">Click the button above to create your first domain</p>
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