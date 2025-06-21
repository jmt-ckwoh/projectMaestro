/**
 * Thread Manager Component
 * 
 * Manages conversation threads with creation, switching, and archival capabilities
 */

import React, { useCallback, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { ChatThread, useActiveThread, useChatStore, useThreads } from '@/renderer/stores/chatStore'

// =============================================================================
// Component Props
// =============================================================================

export interface ThreadManagerProps {
  className?: string
  onClose?: () => void
}

export interface ThreadItemProps {
  thread: ChatThread
  isActive: boolean
  onSelect: (threadId: string) => void
  onArchive: (threadId: string) => void
  onDelete: (threadId: string) => void
}

export interface CreateThreadDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateThread: (name: string, description?: string) => Promise<void>
}

// =============================================================================
// Thread Item Component
// =============================================================================

export const ThreadItem: React.FC<ThreadItemProps> = ({
  thread,
  isActive,
  onSelect,
  onArchive,
  onDelete
}) => {
  const [showActions, setShowActions] = useState(false)

  const formatDate = useCallback((date: Date) => {
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }, [])

  const handleSelect = useCallback(() => {
    onSelect(thread.id)
  }, [thread.id, onSelect])

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onArchive(thread.id)
  }, [thread.id, onArchive])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Delete thread "${thread.name}"? This action cannot be undone.`)) {
      onDelete(thread.id)
    }
  }, [thread.id, thread.name, onDelete])

  return (
    <div
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all duration-200',
        'border hover:border-gray-300',
        'group relative',
        isActive 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : 'bg-white border-gray-200 hover:bg-gray-50',
        thread.isArchived && 'opacity-60'
      )}
      onClick={handleSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              'font-medium truncate',
              isActive ? 'text-blue-900' : 'text-gray-900'
            )}>
              {thread.name}
            </h3>
            {thread.isArchived && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                Archived
              </span>
            )}
          </div>
          
          {thread.description && (
            <p className="text-sm text-gray-600 truncate mt-1">
              {thread.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>{formatDate(new Date(thread.lastActivity))}</span>
            <span>•</span>
            <span>{thread.participants.length} participant{thread.participants.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Thread Actions */}
        {(showActions || isActive) && !thread.isArchived && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleArchive}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Archive thread"
            >
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l7 7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-100 transition-colors"
              title="Delete thread"
            >
              <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Create Thread Dialog
// =============================================================================

export const CreateThreadDialog: React.FC<CreateThreadDialogProps> = ({
  isOpen,
  onClose,
  onCreateThread
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) return

    setIsCreating(true)
    
    try {
      await onCreateThread(name.trim(), description.trim() || undefined)
      setName('')
      setDescription('')
      onClose()
    } catch (error) {
      console.error('Failed to create thread:', error)
    } finally {
      setIsCreating(false)
    }
  }, [name, description, onCreateThread, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create New Thread
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="thread-name" className="block text-sm font-medium text-gray-700 mb-1">
              Thread Name *
            </label>
            <input
              id="thread-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter thread name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              autoFocus
            />
          </div>
          
          <div>
            <label htmlFor="thread-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="thread-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this thread is about..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className={cn(
                'px-4 py-2 rounded-lg transition-colors',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isCreating ? 'Creating...' : 'Create Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// =============================================================================
// Thread Manager Component
// =============================================================================

export const ThreadManager: React.FC<ThreadManagerProps> = ({
  className,
  onClose
}) => {
  const threads = useThreads()
  const activeThread = useActiveThread()
  const setActiveThread = useChatStore(state => state.setActiveThread)
  const createNewThread = useChatStore(state => state.createNewThread)
  const archiveCurrentThread = useChatStore(state => state.archiveCurrentThread)
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Filter threads
  const activeThreads = threads.filter(t => !t.isArchived)
  const archivedThreads = threads.filter(t => t.isArchived)
  const visibleThreads = showArchived ? threads : activeThreads

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThread(threadId)
    onClose?.()
  }, [setActiveThread, onClose])

  const handleCreateThread = useCallback(async (name: string, description?: string): Promise<void> => {
    await createNewThread(name, description)
    onClose?.()
  }, [createNewThread, onClose])

  const handleArchiveThread = useCallback((threadId: string) => {
    if (threadId === activeThread) {
      archiveCurrentThread()
    }
  }, [activeThread, archiveCurrentThread])

  const handleDeleteThread = useCallback(async (threadId: string) => {
    try {
      await window.api.deleteThread(threadId)
      // Refresh threads - the store will update through subscriptions
      window.api.loadThreads(showArchived).catch(error =>
        console.error('Failed to reload threads after deletion:', error)
      )
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  }, [showArchived])

  const handleStartNewChat = useCallback(() => {
    setActiveThread(null)
    onClose?.()
  }, [setActiveThread, onClose])

  return (
    <>
      <div className={cn('bg-white border-l border-gray-200 shadow-lg', className)}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Conversation Threads
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + New Thread
            </button>
            <button
              onClick={handleStartNewChat}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Quick Chat
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            {/* Show archived toggle */}
            {archivedThreads.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg 
                    className={cn(
                      'w-3 h-3 transition-transform',
                      showArchived && 'rotate-90'
                    )} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Show archived ({archivedThreads.length})
                </button>
              </div>
            )}

            {/* Threads */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {visibleThreads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-sm">No conversation threads yet</p>
                  <p className="text-xs mt-1">Create a new thread to organize your conversations</p>
                </div>
              ) : (
                visibleThreads
                  .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
                  .map(thread => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      isActive={thread.id === activeThread}
                      onSelect={handleSelectThread}
                      onArchive={handleArchiveThread}
                      onDelete={handleDeleteThread}
                    />
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          {visibleThreads.length > 0 && (
            <p>
              {activeThreads.length} active thread{activeThreads.length !== 1 ? 's' : ''}
              {archivedThreads.length > 0 && `, ${archivedThreads.length} archived`}
            </p>
          )}
        </div>
      </div>

      {/* Create Thread Dialog */}
      <CreateThreadDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateThread={handleCreateThread}
      />
    </>
  )
}