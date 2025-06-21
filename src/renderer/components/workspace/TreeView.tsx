/**
 * TreeView Component - Hierarchical Task Display
 * 
 * Epic 2 Story 4.1: Tree Structure Display and Navigation
 * Implements Epic → Story → Task → Subtask hierarchy visualization
 */

import React, { useCallback, useMemo, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { ContextMenu, useContextMenu, type ContextMenuItem } from '@/renderer/components/common/ContextMenu'
import { TaskCreateForm } from './TaskCreateForm'
import type { 
  HierarchyItem, 
  TaskTreeNode, 
  TaskTreeState, 
  TaskStatus,
  TaskPriority,
  TaskType,
  CreateEpicInput,
  CreateStoryInput,
  CreateTaskInput,
  CreateSubtaskInput
} from '@/shared/types/tasks'

// =============================================================================
// Tree View Props
// =============================================================================

export interface TreeViewProps {
  readonly items: HierarchyItem[]
  readonly projectId: string
  readonly onItemSelect?: (item: HierarchyItem) => void
  readonly onItemUpdate?: (item: HierarchyItem) => void
  readonly onCreateItem?: (data: CreateEpicInput | CreateStoryInput | CreateTaskInput | CreateSubtaskInput) => void
  readonly className?: string
}

// =============================================================================
// Tree View Component
// =============================================================================

export const TreeView: React.FC<TreeViewProps> = ({
  items,
  projectId,
  onItemSelect,
  onItemUpdate,
  onCreateItem,
  className
}) => {
  const [treeState, setTreeState] = useState<TaskTreeState>({
    expandedNodes: new Set<string>(),
    selectedNode: null,
    filter: {
      showCompleted: true
    }
  })

  // Task creation modal state
  const [createModalState, setCreateModalState] = useState<{
    isOpen: boolean
    taskType: TaskType
    parentId?: string
  }>({
    isOpen: false,
    taskType: 'epic'
  })

  // Context menu state
  const contextMenu = useContextMenu()

  // Convert flat items to tree structure
  const treeNodes = useMemo(() => 
    buildTreeNodes(items), [items]
  )

  // Handle node expansion/collapse
  const handleToggleExpanded = useCallback((nodeId: string) => {
    setTreeState(prev => {
      const newExpanded = new Set(prev.expandedNodes)
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId)
      } else {
        newExpanded.add(nodeId)
      }
      return {
        ...prev,
        expandedNodes: newExpanded
      }
    })
  }, [])

  // Handle node selection
  const handleSelectNode = useCallback((item: HierarchyItem) => {
    setTreeState(prev => ({
      ...prev,
      selectedNode: item.id
    }))
    onItemSelect?.(item)
  }, [onItemSelect])

  // Handle context menu for creating child items
  const handleContextMenu = useCallback((event: React.MouseEvent, item?: HierarchyItem) => {
    const menuItems: ContextMenuItem[] = []

    if (item) {
      // Context menu for existing items
      const childTypes = getValidChildTypes(item.type)
      
      if (childTypes.length > 0) {
        childTypes.forEach(childType => {
          const config = getTaskTypeConfig(childType)
          menuItems.push({
            id: `create-${childType}`,
            label: `Add ${config.label}`,
            icon: config.icon,
            onClick: () => {
              setCreateModalState({
                isOpen: true,
                taskType: childType,
                parentId: item.id
              })
            }
          })
        })
      }

      if (menuItems.length > 0) {
        menuItems.push({ id: 'separator', separator: true })
      }

      menuItems.push(
        {
          id: 'edit',
          label: 'Edit',
          icon: '✏️',
          onClick: () => {
            console.log('Edit item:', item)
          }
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: '🗑️',
          danger: true,
          onClick: () => {
            console.log('Delete item:', item)
          }
        }
      )
    } else {
      // Context menu for empty space (create Epic)
      menuItems.push({
        id: 'create-epic',
        label: 'Create Epic',
        icon: '🏆',
        onClick: () => {
          setCreateModalState({
            isOpen: true,
            taskType: 'epic'
          })
        }
      })
    }

    if (menuItems.length > 0) {
      contextMenu.openContextMenu(event)
    }
  }, [contextMenu])

  // Handle task creation
  const handleCreateTask = useCallback((data: CreateEpicInput | CreateStoryInput | CreateTaskInput | CreateSubtaskInput) => {
    onCreateItem?.(data)
    setCreateModalState({ isOpen: false, taskType: 'epic' })
  }, [onCreateItem])

  // Handle closing create modal
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalState({ isOpen: false, taskType: 'epic' })
  }, [])

  return (
    <div className={cn('tree-view', 'p-4', className)}>
      <div className="tree-header mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Project Structure</h2>
            <p className="text-sm text-gray-600">Epic → Story → Task hierarchy</p>
          </div>
          <button
            onClick={() => setCreateModalState({ isOpen: true, taskType: 'epic' })}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create Epic
          </button>
        </div>
      </div>

      <div 
        className="tree-content"
        onContextMenu={(e) => handleContextMenu(e)}
      >
        {treeNodes.map(node => (
          <TreeNodeRenderer
            key={node.item.id}
            node={node}
            treeState={treeState}
            onToggleExpanded={handleToggleExpanded}
            onSelect={handleSelectNode}
            onUpdate={onItemUpdate}
            onContextMenu={handleContextMenu}
          />
        ))}
        
        {treeNodes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm mb-4">No epics yet. Create your first epic to get started.</p>
            <button
              onClick={() => setCreateModalState({ isOpen: true, taskType: 'epic' })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Epic
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        items={[]} // Items will be set dynamically in handleContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={contextMenu.closeContextMenu}
      />

      {/* Task Creation Modal */}
      <TaskCreateForm
        isOpen={createModalState.isOpen}
        onClose={handleCloseCreateModal}
        taskType={createModalState.taskType}
        parentId={createModalState.parentId}
        projectId={projectId}
        onSubmit={handleCreateTask}
      />
    </div>
  )
}

// =============================================================================
// Tree Node Renderer Component
// =============================================================================

interface TreeNodeRendererProps {
  readonly node: TaskTreeNode
  readonly treeState: TaskTreeState
  readonly onToggleExpanded: (nodeId: string) => void
  readonly onSelect: (item: HierarchyItem) => void
  readonly onUpdate?: (item: HierarchyItem) => void
  readonly onContextMenu: (event: React.MouseEvent, item?: HierarchyItem) => void
}

const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = ({
  node,
  treeState,
  onToggleExpanded,
  onSelect,
  onUpdate,
  onContextMenu
}) => {
  const isExpanded = treeState.expandedNodes.has(node.item.id)
  const isSelected = treeState.selectedNode === node.item.id

  return (
    <>
      <TreeNode
        node={node}
        isExpanded={isExpanded}
        isSelected={isSelected}
        onToggleExpanded={onToggleExpanded}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onContextMenu={onContextMenu}
      />
      
      {/* Render children recursively */}
      {node.children.length > 0 && isExpanded && (
        <div className="tree-children">
          {node.children.map(childNode => (
            <TreeNodeRenderer
              key={childNode.item.id}
              node={childNode}
              treeState={treeState}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </>
  )
}

// =============================================================================
// Tree Node Component
// =============================================================================

interface TreeNodeProps {
  readonly node: TaskTreeNode
  readonly isExpanded: boolean
  readonly isSelected: boolean
  readonly onToggleExpanded: (nodeId: string) => void
  readonly onSelect: (item: HierarchyItem) => void
  readonly onUpdate?: (item: HierarchyItem) => void
  readonly onContextMenu: (event: React.MouseEvent, item?: HierarchyItem) => void
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onSelect,
  onUpdate: _onUpdate,
  onContextMenu
}) => {
  const hasChildren = node.children.length > 0
  const canHaveChildren = ['epic', 'story', 'task'].includes(node.item.type)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onSelect(node.item)
  }, [node.item, onSelect])

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpanded(node.item.id)
  }, [node.item.id, onToggleExpanded])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    onContextMenu(e, node.item)
  }, [onContextMenu, node.item])

  const indentationLevel = node.level * 20

  return (
    <div className="tree-node">
      {/* Node Content */}
      <div
        className={cn(
          'tree-node-content',
          'flex items-center py-2 px-3 rounded-lg cursor-pointer',
          'hover:bg-gray-50 transition-colors',
          isSelected && 'bg-blue-50 border border-blue-200'
        )}
        style={{ marginLeft: `${indentationLevel}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/Collapse Button */}
        <div className="w-6 h-6 flex items-center justify-center">
          {hasChildren && (
            <button
              onClick={handleToggle}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
        </div>

        {/* Task Type Icon */}
        <div className="w-6 h-6 flex items-center justify-center mr-2">
          <TaskTypeIcon type={node.item.type} />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {node.item.title}
            </span>
            <TaskStatusBadge status={node.item.status} />
            {node.item.storyPoints && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {node.item.storyPoints} pts
              </span>
            )}
          </div>
          {node.item.description && (
            <p className="text-sm text-gray-600 truncate mt-1">
              {node.item.description}
            </p>
          )}
        </div>

        {/* Priority Indicator */}
        <PriorityIndicator priority={node.item.priority} />

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          {canHaveChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleContextMenu(e)
              }}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded"
              title="Add child item"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Supporting Components
// =============================================================================

const TaskTypeIcon: React.FC<{ type: TaskType }> = ({ type }) => {
  const icons = {
    epic: '🏆',
    story: '📖',
    task: '📝',
    subtask: '📌'
  }

  return (
    <span className="text-sm" title={`${type} item`}>
      {icons[type]}
    </span>
  )
}

const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const statusConfig = {
    'not-started': { label: 'Not Started', color: 'bg-gray-100 text-gray-600' },
    'in-progress': { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
    'review': { label: 'Review', color: 'bg-blue-100 text-blue-700' },
    'completed': { label: 'Completed', color: 'bg-green-100 text-green-700' },
    'blocked': { label: 'Blocked', color: 'bg-red-100 text-red-700' }
  }

  const config = statusConfig[status]

  return (
    <span className={cn(
      'text-xs px-2 py-1 rounded-full font-medium',
      config.color
    )}>
      {config.label}
    </span>
  )
}

const PriorityIndicator: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const priorityConfig = {
    low: { color: 'bg-gray-400', title: 'Low Priority' },
    medium: { color: 'bg-yellow-400', title: 'Medium Priority' },
    high: { color: 'bg-orange-400', title: 'High Priority' },
    critical: { color: 'bg-red-500', title: 'Critical Priority' }
  }

  const config = priorityConfig[priority]

  return (
    <div
      className={cn('w-2 h-2 rounded-full', config.color)}
      title={config.title}
    />
  )
}

// =============================================================================
// Tree Building Utility
// =============================================================================

function buildTreeNodes(items: HierarchyItem[]): TaskTreeNode[] {
  // For now, create a simple tree structure
  // In a real implementation, this would build the actual hierarchy
  return items.map(item => ({
    item,
    children: [],
    level: 0,
    expanded: false,
    path: []
  }))
}

function getValidChildTypes(parentType: TaskType): TaskType[] {
  switch (parentType) {
    case 'epic':
      return ['story']
    case 'story':
      return ['task']
    case 'task':
      return ['subtask']
    case 'subtask':
      return []
    default:
      return []
  }
}

function getTaskTypeConfig(taskType: TaskType) {
  const configs = {
    epic: { label: 'Epic', icon: '🏆' },
    story: { label: 'Story', icon: '📖' },
    task: { label: 'Task', icon: '📝' },
    subtask: { label: 'Subtask', icon: '📌' }
  }
  return configs[taskType]
}