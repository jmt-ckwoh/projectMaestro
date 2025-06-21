/**
 * Agent Activity Monitor Component
 * 
 * Epic 3 Story 3.1: Real-Time Agent Status Display
 * Displays agent activity logs and status changes in real-time
 */

import React, { useEffect, useState } from 'react'
import { useAgentStore, AgentActivityLog, AgentStatusChange } from '@/renderer/stores/agentStore'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Agent Activity Monitor Component
// =============================================================================

interface AgentActivityMonitorProps {
  agentId?: string
  maxLogs?: number
  className?: string
}

export const AgentActivityMonitor: React.FC<AgentActivityMonitorProps> = ({
  agentId,
  maxLogs = 10,
  className
}) => {
  const { 
    getAgentActivityLogs, 
    subscribeToStatusChanges,
    activityLogs: allActivityLogs 
  } = useAgentStore()
  
  const [recentChanges, setRecentChanges] = useState<AgentStatusChange[]>([])

  // Subscribe to real-time status changes
  useEffect(() => {
    const unsubscribe = subscribeToStatusChanges((change) => {
      if (!agentId || change.agentId === agentId) {
        setRecentChanges(prev => [change, ...prev.slice(0, 4)]) // Keep last 5 changes
      }
    })

    return unsubscribe
  }, [agentId, subscribeToStatusChanges])

  // Get activity logs for display
  const displayLogs = agentId 
    ? getAgentActivityLogs(agentId, maxLogs)
    : allActivityLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxLogs)

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    return date.toLocaleDateString()
  }

  const getActivityIcon = (type: AgentActivityLog['type']) => {
    switch (type) {
      case 'status_change':
        return '🔄'
      case 'task_assignment':
        return '📋'
      case 'interaction':
        return '💬'
      case 'error':
        return '❌'
      default:
        return '📝'
    }
  }

  const getActivityColor = (type: AgentActivityLog['type']) => {
    switch (type) {
      case 'status_change':
        return 'text-blue-600'
      case 'task_assignment':
        return 'text-green-600'
      case 'interaction':
        return 'text-purple-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Real-time Status Changes Alert */}
      {recentChanges.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">Recent Status Changes</span>
          </div>
          <div className="space-y-1">
            {recentChanges.slice(0, 3).map((change) => (
              <div key={change.id} className="text-xs text-blue-700">
                <span className="font-medium">
                  {change.fromStatus} → {change.toStatus}
                </span>
                {change.reason && (
                  <span className="ml-2 text-blue-600">({change.reason})</span>
                )}
                <span className="ml-2 text-blue-500">
                  {formatTimestamp(change.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">
          {agentId ? 'Agent Activity' : 'Team Activity'}
        </h4>
        
        {displayLogs.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No activity recorded yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {displayLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg"
              >
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {getActivityIcon(log.type)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    getActivityColor(log.type)
                  )}>
                    {log.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </p>
                  
                  {/* Metadata details */}
                  {log.metadata && (
                    <div className="mt-1 text-xs text-gray-400">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Compact Activity Display Component
// =============================================================================

interface CompactActivityDisplayProps {
  agentId: string
  className?: string
}

export const CompactActivityDisplay: React.FC<CompactActivityDisplayProps> = ({
  agentId,
  className
}) => {
  const { getAgentActivityLogs } = useAgentStore()
  
  const recentLogs = getAgentActivityLogs(agentId, 3)
  
  if (recentLogs.length === 0) {
    return (
      <div className={cn('text-xs text-gray-500', className)}>
        No recent activity
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {recentLogs.map((log) => (
        <div key={log.id} className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">
            {log.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <span className="text-gray-700 truncate">
            {log.description}
          </span>
        </div>
      ))}
    </div>
  )
}