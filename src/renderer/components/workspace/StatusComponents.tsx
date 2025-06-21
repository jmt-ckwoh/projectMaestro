/**
 * Status Components - Status selection and progress indicators
 * 
 * Epic 2 Story 4.3: Progress Tracking and Status Management
 * Provides status dropdowns, badges, and progress visualization
 */

import React, { useCallback } from 'react'
import { cn } from '@/renderer/utils/cn'
import type { ProgressStats, TaskPriority, TaskStatus } from '@/shared/types/tasks'

// =============================================================================
// Status Badge Component
// =============================================================================

export interface StatusBadgeProps {
  readonly status: TaskStatus
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className
}) => {
  const config = getStatusConfig(status)
  
  return (
    <span
      className={cn(
        'status-badge inline-flex items-center gap-1 rounded-full font-medium',
        // Size variants
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        // Status colors
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      {config.label}
    </span>
  )
}

// =============================================================================
// Status Dropdown Component
// =============================================================================

export interface StatusDropdownProps {
  readonly value: TaskStatus
  readonly onChange: (status: TaskStatus) => void
  readonly disabled?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  value,
  onChange,
  disabled,
  size = 'md',
  className
}) => {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as TaskStatus)
  }, [onChange])

  const currentConfig = getStatusConfig(value)

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'status-dropdown',
          'appearance-none bg-white border border-gray-300 rounded-lg',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'transition-colors cursor-pointer',
          // Size variants
          size === 'sm' && 'px-2 py-1 text-xs pr-6',
          size === 'md' && 'px-3 py-2 text-sm pr-8',
          size === 'lg' && 'px-4 py-3 text-base pr-10',
          // Status-specific styling
          currentConfig.selectClassName,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {Object.entries(STATUS_OPTIONS).map(([statusValue, config]) => (
          <option key={statusValue} value={statusValue}>
            {config.label}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

// =============================================================================
// Progress Bar Component
// =============================================================================

export interface ProgressBarProps {
  readonly stats: ProgressStats
  readonly showDetails?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  stats,
  showDetails = true,
  size = 'md',
  className
}) => {
  const completionPercentage = Math.round(stats.completionPercentage)

  return (
    <div className={cn('progress-bar-container', className)}>
      {/* Progress Bar */}
      <div className="relative">
        <div
          className={cn(
            'progress-bar-track bg-gray-200 rounded-full overflow-hidden',
            size === 'sm' && 'h-1.5',
            size === 'md' && 'h-2',
            size === 'lg' && 'h-3'
          )}
        >
          <div
            className={cn(
              'progress-bar-fill transition-all duration-300 ease-in-out',
              'bg-gradient-to-r from-blue-500 to-blue-600',
              completionPercentage === 100 && 'from-green-500 to-green-600'
            )}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Percentage label */}
        {size !== 'sm' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              'font-medium text-white text-xs',
              completionPercentage < 30 && 'text-gray-700'
            )}>
              {completionPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Details */}
      {showDetails && (
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Tasks: {stats.completedItems}/{stats.totalItems}</span>
            <span>Story Points: {stats.storyPointsCompleted}/{stats.storyPointsTotal}</span>
          </div>
          
          {/* Status breakdown */}
          <div className="flex gap-3 text-xs">
            {stats.inProgressItems > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                {stats.inProgressItems} in progress
              </span>
            )}
            {stats.blockedItems > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                {stats.blockedItems} blocked
              </span>
            )}
            {stats.notStartedItems > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                {stats.notStartedItems} not started
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Priority Badge Component
// =============================================================================

export interface PriorityBadgeProps {
  readonly priority: TaskPriority
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  className
}) => {
  const config = getPriorityConfig(priority)
  
  return (
    <span
      className={cn(
        'priority-badge inline-flex items-center gap-1 rounded-full font-medium',
        // Size variants
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        // Priority colors
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

// =============================================================================
// Configuration and Utilities
// =============================================================================

interface StatusConfig {
  readonly label: string
  readonly className: string
  readonly dotColor: string
  readonly selectClassName: string
}

const STATUS_OPTIONS: Record<TaskStatus, StatusConfig> = {
  'not-started': {
    label: 'Not Started',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-400',
    selectClassName: 'text-gray-700'
  },
  'in-progress': {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dotColor: 'bg-yellow-400',
    selectClassName: 'text-yellow-800'
  },
  'review': {
    label: 'In Review',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-400',
    selectClassName: 'text-blue-800'
  },
  'completed': {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 border-green-200',
    dotColor: 'bg-green-400',
    selectClassName: 'text-green-800'
  },
  'blocked': {
    label: 'Blocked',
    className: 'bg-red-100 text-red-800 border-red-200',
    dotColor: 'bg-red-400',
    selectClassName: 'text-red-800'
  }
}

function getStatusConfig(status: TaskStatus): StatusConfig {
  return STATUS_OPTIONS[status]
}

interface PriorityConfig {
  readonly label: string
  readonly className: string
  readonly icon: string
}

const PRIORITY_OPTIONS: Record<TaskPriority, PriorityConfig> = {
  'low': {
    label: 'Low',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: '⬇️'
  },
  'medium': {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: '➡️'
  },
  'high': {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: '⬆️'
  },
  'critical': {
    label: 'Critical',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: '🔴'
  }
}

function getPriorityConfig(priority: TaskPriority): PriorityConfig {
  return PRIORITY_OPTIONS[priority]
}

// =============================================================================
// Progress Calculation Utilities
// =============================================================================

export function calculateProgressStats(items: any[]): ProgressStats {
  const totalItems = items.length
  const completedItems = items.filter(item => item.status === 'completed').length
  const inProgressItems = items.filter(item => item.status === 'in-progress').length
  const blockedItems = items.filter(item => item.status === 'blocked').length
  const reviewItems = items.filter(item => item.status === 'review').length
  const notStartedItems = items.filter(item => item.status === 'not-started').length

  const storyPointsTotal = items.reduce((sum, item) => sum + (item.storyPoints || 0), 0)
  const storyPointsCompleted = items
    .filter(item => item.status === 'completed')
    .reduce((sum, item) => sum + (item.storyPoints || 0), 0)

  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  const storyPointsPercentage = storyPointsTotal > 0 ? (storyPointsCompleted / storyPointsTotal) * 100 : 0

  return {
    totalItems,
    completedItems,
    inProgressItems: inProgressItems + reviewItems, // Combine in-progress and review
    blockedItems,
    notStartedItems,
    completionPercentage,
    storyPointsTotal,
    storyPointsCompleted,
    storyPointsPercentage
  }
}