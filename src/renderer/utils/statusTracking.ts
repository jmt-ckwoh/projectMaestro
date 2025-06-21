/**
 * Status Change Tracking Utilities
 * 
 * Epic 2 Story 4.3: Progress Tracking and Status Management
 * Provides utilities for tracking status changes and maintaining history
 */

import type { HierarchyItem, TaskStatus } from '@/shared/types/tasks'

// =============================================================================
// Status Change Event Types
// =============================================================================

export interface StatusChangeEvent {
  readonly itemId: string
  readonly itemTitle: string
  readonly itemType: string
  readonly oldStatus: TaskStatus
  readonly newStatus: TaskStatus
  readonly timestamp: Date
  readonly reason?: string
}

export interface StatusHistory {
  readonly itemId: string
  readonly changes: StatusChangeEvent[]
}

// =============================================================================
// Status Change Tracking
// =============================================================================

export class StatusTracker {
  private history: Map<string, StatusChangeEvent[]> = new Map()
  private listeners: Set<(event: StatusChangeEvent) => void> = new Set()

  /**
   * Record a status change
   */
  recordStatusChange(
    item: HierarchyItem,
    oldStatus: TaskStatus,
    newStatus: TaskStatus,
    reason?: string
  ): StatusChangeEvent {
    const event: StatusChangeEvent = {
      itemId: item.id,
      itemTitle: item.title,
      itemType: item.type,
      oldStatus,
      newStatus,
      timestamp: new Date(),
      reason
    }

    // Add to history
    const itemHistory = this.history.get(item.id) || []
    itemHistory.push(event)
    this.history.set(item.id, itemHistory)

    // Notify listeners
    this.listeners.forEach(listener => listener(event))

    return event
  }

  /**
   * Get status history for an item
   */
  getItemHistory(itemId: string): StatusChangeEvent[] {
    return this.history.get(itemId) || []
  }

  /**
   * Get all status changes within a time range
   */
  getRecentChanges(since: Date): StatusChangeEvent[] {
    const allChanges: StatusChangeEvent[] = []
    
    for (const itemHistory of this.history.values()) {
      const recentChanges = itemHistory.filter(change => change.timestamp >= since)
      allChanges.push(...recentChanges)
    }

    return allChanges.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Subscribe to status change events
   */
  subscribe(listener: (event: StatusChangeEvent) => void): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Get summary statistics
   */
  getStatusSummary(): {
    totalChanges: number
    byStatus: Record<TaskStatus, number>
    byType: Record<string, number>
  } {
    let totalChanges = 0
    const byStatus: Record<TaskStatus, number> = {
      'not-started': 0,
      'in-progress': 0,
      'review': 0,
      'completed': 0,
      'blocked': 0
    }
    const byType: Record<string, number> = {}

    for (const itemHistory of this.history.values()) {
      totalChanges += itemHistory.length
      
      for (const change of itemHistory) {
        byStatus[change.newStatus] = (byStatus[change.newStatus] || 0) + 1
        byType[change.itemType] = (byType[change.itemType] || 0) + 1
      }
    }

    return { totalChanges, byStatus, byType }
  }

  /**
   * Clear history (useful for testing or reset)
   */
  clearHistory(): void {
    this.history.clear()
  }
}

// =============================================================================
// Global Status Tracker Instance
// =============================================================================

export const globalStatusTracker = new StatusTracker()

// =============================================================================
// Status Change Utilities
// =============================================================================

/**
 * Format status change for display
 */
export function formatStatusChange(event: StatusChangeEvent): string {
  const timeString = event.timestamp.toLocaleTimeString()
  return `${timeString} - ${event.itemTitle} changed from ${event.oldStatus} to ${event.newStatus}`
}

/**
 * Get status transition description
 */
export function getStatusTransitionDescription(oldStatus: TaskStatus, newStatus: TaskStatus): string {
  const transitions: Record<string, string> = {
    'not-started->in-progress': 'Work started',
    'in-progress->review': 'Submitted for review',
    'review->completed': 'Review approved',
    'review->in-progress': 'Returned for revision',
    'in-progress->blocked': 'Work blocked',
    'blocked->in-progress': 'Block resolved',
    'in-progress->completed': 'Work completed',
    'completed->in-progress': 'Work reopened',
    'not-started->completed': 'Completed without progress tracking',
    'not-started->blocked': 'Blocked before starting'
  }

  const key = `${oldStatus}->${newStatus}`
  return transitions[key] || `Status changed from ${oldStatus} to ${newStatus}`
}

/**
 * Check if status transition is valid
 */
export function isValidStatusTransition(oldStatus: TaskStatus, newStatus: TaskStatus): boolean {
  // Define valid transitions
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    'not-started': ['in-progress', 'blocked', 'completed'],
    'in-progress': ['review', 'blocked', 'completed'],
    'review': ['completed', 'in-progress'],
    'blocked': ['in-progress', 'not-started'],
    'completed': ['in-progress'] // Allow reopening
  }

  return validTransitions[oldStatus]?.includes(newStatus) || false
}

/**
 * Get suggested next statuses
 */
export function getSuggestedNextStatuses(currentStatus: TaskStatus): TaskStatus[] {
  const suggestions: Record<TaskStatus, TaskStatus[]> = {
    'not-started': ['in-progress'],
    'in-progress': ['review', 'completed'],
    'review': ['completed'],
    'blocked': ['in-progress'],
    'completed': [] // No automatic suggestions for completed items
  }

  return suggestions[currentStatus] || []
}