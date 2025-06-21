/**
 * Chat Integration Components - Task-Chat Bridge
 * 
 * Epic 2 Story 4.4: Tree View Integration with Chat and Agents
 * Provides task-to-chat communication and automatic chat message generation
 */

import React, { useCallback } from 'react'
import { cn } from '@/renderer/utils/cn'
import { useChatStore } from '@/renderer/stores/chatStore'
import { useUIStore } from '@/renderer/stores/uiStore'
import type { HierarchyItem } from '@/shared/types/tasks'
import type { AgentType } from '@/shared/types/agents'

// =============================================================================
// Chat Integration Utilities
// =============================================================================

export interface TaskChatMessage {
  readonly taskId: string
  readonly taskTitle: string
  readonly taskType: string
  readonly action: 'assigned' | 'status_changed' | 'discussed' | 'completed' | 'blocked'
  readonly details?: string
  readonly agentId?: string
  readonly agentType?: AgentType
}

// =============================================================================
// Task Discussion Hook
// =============================================================================

export interface UseTaskDiscussionReturn {
  readonly discussInChat: (task: HierarchyItem, agentType?: AgentType) => void
  readonly notifyTaskAssignment: (task: HierarchyItem, agentId: string, agentType: AgentType) => void
  readonly notifyStatusChange: (task: HierarchyItem, oldStatus: string, newStatus: string) => void
  readonly switchToChat: () => void
}

export const useTaskDiscussion = (): UseTaskDiscussionReturn => {
  const sendMessage = useChatStore(state => state.sendMessage)
  const togglePanel = useUIStore(state => state.togglePanel)
  const isCollapsed = useUIStore(state => state.isCollapsed)

  const discussInChat = useCallback((task: HierarchyItem, agentType?: AgentType) => {
    const taskRef = `[${task.type.toUpperCase()}] ${task.title}`
    const mention = agentType ? `@${agentType}` : ''
    
    const message = `${mention} Let's discuss ${taskRef}.

**Task Details:**
- **Type**: ${task.type}
- **Status**: ${task.status}
- **Priority**: ${task.priority}
${task.description ? `- **Description**: ${task.description}` : ''}
${task.storyPoints ? `- **Story Points**: ${task.storyPoints}` : ''}

What are your thoughts on this ${task.type}?`

    sendMessage({ content: message })
    if (isCollapsed.chat) {
      togglePanel('chat')
    }
  }, [sendMessage, togglePanel, isCollapsed.chat])

  const notifyTaskAssignment = useCallback((task: HierarchyItem, _agentId: string, agentType: AgentType) => {
    const taskRef = `[${task.type.toUpperCase()}] ${task.title}`
    const agentEmoji = getAgentEmoji(agentType)
    
    const message = `${agentEmoji} @${agentType} has been assigned to ${taskRef}.

**Assignment Details:**
- **Task**: ${task.title}
- **Type**: ${task.type}
- **Priority**: ${task.priority}
- **Status**: ${task.status}

Please review the requirements and let me know if you have any questions!`

    sendMessage({ content: message })
  }, [sendMessage])

  const notifyStatusChange = useCallback((task: HierarchyItem, oldStatus: string, newStatus: string) => {
    const taskRef = `[${task.type.toUpperCase()}] ${task.title}`
    const statusEmoji = getStatusEmoji(newStatus)
    
    const message = `${statusEmoji} Status update for ${taskRef}:

**Status Changed**: ${oldStatus} → ${newStatus}

${getStatusChangeMessage(oldStatus, newStatus)}`

    sendMessage({ content: message })
  }, [sendMessage])

  const switchToChat = useCallback(() => {
    if (isCollapsed.chat) {
      togglePanel('chat')
    }
  }, [togglePanel, isCollapsed.chat])

  return {
    discussInChat,
    notifyTaskAssignment,
    notifyStatusChange,
    switchToChat
  }
}

// =============================================================================
// Task Chat Actions Component
// =============================================================================

export interface TaskChatActionsProps {
  readonly task: HierarchyItem
  readonly agentId?: string
  readonly className?: string
  readonly compact?: boolean
}

export const TaskChatActions: React.FC<TaskChatActionsProps> = ({
  task,
  agentId: _agentId,
  className,
  compact = false
}) => {
  const { discussInChat, switchToChat } = useTaskDiscussion()

  const handleDiscussInChat = useCallback(() => {
    discussInChat(task)
  }, [discussInChat, task])

  const handleSwitchToChat = useCallback(() => {
    switchToChat()
  }, [switchToChat])

  if (compact) {
    return (
      <div className={cn('task-chat-actions-compact flex items-center gap-1', className)}>
        <button
          onClick={handleDiscussInChat}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded transition-colors"
          title="Discuss in chat"
        >
          💬
        </button>
        <button
          onClick={handleSwitchToChat}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-green-600 rounded transition-colors"
          title="Open chat"
        >
          📱
        </button>
      </div>
    )
  }

  return (
    <div className={cn('task-chat-actions flex flex-col gap-2', className)}>
      <button
        onClick={handleDiscussInChat}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      >
        💬 Discuss in Chat
      </button>
      
      <button
        onClick={handleSwitchToChat}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
      >
        📱 Open Chat Panel
      </button>
    </div>
  )
}

// =============================================================================
// Task Reference Component
// =============================================================================

export interface TaskReferenceProps {
  readonly task: HierarchyItem
  readonly onClick?: () => void
  readonly className?: string
}

export const TaskReference: React.FC<TaskReferenceProps> = ({
  task,
  onClick,
  className
}) => {
  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  const typeConfig = getTaskTypeConfig(task.type)

  return (
    <button
      onClick={handleClick}
      className={cn(
        'task-reference inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm',
        'bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors',
        'border border-gray-200',
        onClick && 'cursor-pointer',
        className
      )}
      title={`Go to ${task.type}: ${task.title}`}
    >
      <span>{typeConfig.emoji}</span>
      <span className="font-medium">[{task.type.toUpperCase()}]</span>
      <span>{task.title}</span>
    </button>
  )
}

// =============================================================================
// Auto-Chat Message Generator
// =============================================================================

export class TaskChatNotifier {
  private static instance: TaskChatNotifier
  private sendMessage: (message: string) => void = () => {}

  static getInstance(): TaskChatNotifier {
    if (!TaskChatNotifier.instance) {
      TaskChatNotifier.instance = new TaskChatNotifier()
    }
    return TaskChatNotifier.instance
  }

  setSendMessage(sendMessageFn: (message: string) => void): void {
    this.sendMessage = sendMessageFn
  }

  notifyTaskCreated(task: HierarchyItem): void {
    const typeConfig = getTaskTypeConfig(task.type)
    const message = `${typeConfig.emoji} New ${task.type} created: **${task.title}**

**Details:**
- **Priority**: ${task.priority}
- **Status**: ${task.status}
${task.description ? `- **Description**: ${task.description}` : ''}

Ready to get started! 🚀`

    this.sendMessage(message)
  }

  notifyTaskAssigned(task: HierarchyItem, agentType: AgentType): void {
    const agentEmoji = getAgentEmoji(agentType)
    const taskEmoji = getTaskTypeConfig(task.type).emoji
    
    const message = `${agentEmoji} Task assignment for @${agentType}:

${taskEmoji} **${task.title}** (${task.type})
- **Priority**: ${task.priority}
- **Status**: ${task.status}

Please review and let me know if you need any clarification! 👍`

    this.sendMessage(message)
  }

  notifyStatusChanged(task: HierarchyItem, oldStatus: string, newStatus: string): void {
    const statusEmoji = getStatusEmoji(newStatus)
    const taskEmoji = getTaskTypeConfig(task.type).emoji
    
    const message = `${statusEmoji} Status update for ${taskEmoji} **${task.title}**:

**${oldStatus}** → **${newStatus}**

${getStatusChangeMessage(oldStatus, newStatus)}`

    this.sendMessage(message)
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function getAgentEmoji(agentType: AgentType): string {
  const emojis: Record<AgentType, string> = {
    'producer': '👔',
    'architect': '🏗️',
    'engineer': '⚡',
    'qa': '🔍'
  }
  return emojis[agentType] || '🤖'
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    'not-started': '⭕',
    'in-progress': '🔄',
    'review': '👀',
    'completed': '✅',
    'blocked': '🚫'
  }
  return emojis[status] || '📝'
}

function getTaskTypeConfig(type: string): { emoji: string } {
  const configs: Record<string, { emoji: string }> = {
    'epic': { emoji: '🏆' },
    'story': { emoji: '📖' },
    'task': { emoji: '📝' },
    'subtask': { emoji: '📌' }
  }
  return configs[type] || { emoji: '📋' }
}

function getStatusChangeMessage(oldStatus: string, newStatus: string): string {
  const messages: Record<string, string> = {
    'not-started->in-progress': 'Work has begun! 🚀',
    'in-progress->review': 'Ready for review! 👀',
    'review->completed': 'Review approved and completed! 🎉',
    'review->in-progress': 'Returned for revision. Keep going! 💪',
    'in-progress->blocked': 'Work is blocked. Need assistance! 🚨',
    'blocked->in-progress': 'Block resolved! Back to work! ⚡',
    'in-progress->completed': 'Work completed successfully! ✨',
    'completed->in-progress': 'Work has been reopened. 🔄',
    'not-started->completed': 'Completed without tracking! ⚡',
    'not-started->blocked': 'Blocked before starting. Need help! 🚨'
  }
  
  const key = `${oldStatus}->${newStatus}`
  return messages[key] || 'Status updated! 📝'
}