/**
 * TreeView Component - Hierarchical Task Display
 * 
 * Epic 2 Story 4.1: Tree Structure Display and Navigation
 * Implements Epic → Story → Task → Subtask hierarchy visualization
 */

import React, { useCallback, useMemo, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import type { 
  HierarchyItem, 
  TaskTreeNode, 
  TaskTreeState, 
  TaskStatus,
  TaskPriority,
  TaskType
} from '@/shared/types/tasks'

// =============================================================================
// Tree View Props
// =============================================================================

export interface TreeViewProps {
  readonly items: HierarchyItem[]
  readonly onItemSelect?: (item: HierarchyItem) => void
  readonly onItemUpdate?: (item: HierarchyItem) => void
  readonly onCreateChild?: (parentItem: HierarchyItem) => void
  readonly className?: string
}

// =============================================================================
// Tree View Component
// =============================================================================

export const TreeView: React.FC<TreeViewProps> = ({
  items,
  onItemSelect,
  onItemUpdate,
  onCreateChild,
  className
}) => {
  const [treeState, setTreeState] = useState<TaskTreeState>({
    expandedNodes: new Set<string>(),
    selectedNode: null,
    filter: {
      showCompleted: true
    }
  })

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

  return (
    <div className={cn('tree-view', 'p-4', className)}>
      <div className="tree-header mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Project Structure</h2>
        <p className="text-sm text-gray-600">Epic → Story → Task hierarchy</p>
      </div>

      <div className="tree-content">
        {treeNodes.map(node => (
          <TreeNodeRenderer
            key={node.item.id}
            node={node}
            treeState={treeState}
            onToggleExpanded={handleToggleExpanded}
            onSelect={handleSelectNode}
            onUpdate={onItemUpdate}
            onCreateChild={onCreateChild}
          />
        ))}
        
        {treeNodes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No epics yet. Create your first epic to get started.</p>
          </div>
        )}
      </div>
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
  readonly onCreateChild?: (parentItem: HierarchyItem) => void
}

const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = ({
  node,
  treeState,
  onToggleExpanded,
  onSelect,
  onUpdate,
  onCreateChild
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
        onCreateChild={onCreateChild}
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
              onCreateChild={onCreateChild}
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
  readonly onCreateChild?: (parentItem: HierarchyItem) => void
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggleExpanded,
  onSelect,
  onUpdate: _onUpdate,
  onCreateChild
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
                onCreateChild?.(node.item)
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