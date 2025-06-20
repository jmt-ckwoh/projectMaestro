/**
 * Three-Panel Layout Component
 * 
 * Core UI structure: Slack (Chat) + Trello (Workspace) + Team (Agents)
 * This component implements the main layout described in the RFC.
 */

import React, { useCallback, useState } from 'react'
import { ChatPanel } from '../chat/ChatPanel'
import { WorkspacePanel } from '../workspace/WorkspacePanel'
import { TeamPanel } from '../team/TeamPanel'
import { useUIStore } from '@/renderer/stores/uiStore'
import { cn } from '@/renderer/utils/cn'

// =============================================================================
// Layout Constants
// =============================================================================

const PANEL_CONSTRAINTS = {
  chat: { min: 280, max: 600, default: 320 },
  team: { min: 240, max: 400, default: 280 },
  workspace: { min: 400 }
} as const

// =============================================================================
// Three-Panel Layout Component
// =============================================================================

export const ThreePanelLayout: React.FC = () => {
  const {
    layout,
    updateLayout,
    togglePanel,
    isCollapsed
  } = useUIStore()

  const [isResizing, setIsResizing] = useState<string | null>(null)

  // =============================================================================
  // Panel Resize Handlers
  // =============================================================================

  const handlePanelResize = useCallback((panelId: 'chat' | 'team', clientX: number) => {
    if (!isResizing) return

    const container = document.getElementById('three-panel-container')
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const totalWidth = containerRect.width

    if (panelId === 'chat') {
      const newWidth = Math.max(
        PANEL_CONSTRAINTS.chat.min,
        Math.min(PANEL_CONSTRAINTS.chat.max, clientX - containerRect.left)
      )
      updateLayout({ chatPanelWidth: newWidth })
    } else if (panelId === 'team') {
      const newWidth = Math.max(
        PANEL_CONSTRAINTS.team.min,
        Math.min(PANEL_CONSTRAINTS.team.max, containerRect.right - clientX)
      )
      updateLayout({ teamPanelWidth: newWidth })
    }
  }, [isResizing, updateLayout])

  const handleMouseDown = useCallback((panelId: 'chat' | 'team') => {
    setIsResizing(panelId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isResizing) {
      handlePanelResize(isResizing as 'chat' | 'team', e.clientX)
    }
  }, [isResizing, handlePanelResize])

  // Global mouse events for resizing
  React.useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handlePanelResize(isResizing as 'chat' | 'team', e.clientX)
      }

      const handleGlobalMouseUp = () => {
        handleMouseUp()
      }

      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isResizing, handlePanelResize, handleMouseUp])

  // =============================================================================
  // Panel Collapse Handlers
  // =============================================================================

  const handleToggleChat = useCallback(() => {
    togglePanel('chat')
  }, [togglePanel])

  const handleToggleTeam = useCallback(() => {
    togglePanel('team')
  }, [togglePanel])

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div 
      id="three-panel-container"
      className="flex h-screen bg-gray-50 select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Left Panel - Chat Interface */}
      <div 
        className={cn(
          'relative bg-white border-r border-gray-200 transition-all duration-200',
          isCollapsed.chat ? 'w-0 overflow-hidden' : ''
        )}
        style={{ 
          width: isCollapsed.chat ? 0 : layout.chatPanelWidth,
          minWidth: isCollapsed.chat ? 0 : PANEL_CONSTRAINTS.chat.min
        }}
      >
        <ChatPanel />
        
        {/* Chat Panel Resize Handle */}
        {!isCollapsed.chat && (
          <div
            className={cn(
              'absolute top-0 right-0 w-1 h-full cursor-col-resize',
              'hover:w-2 hover:bg-blue-500/20 transition-all',
              'group flex items-center justify-center',
              isResizing === 'chat' && 'w-2 bg-blue-500/30'
            )}
            onMouseDown={() => handleMouseDown('chat')}
          >
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-500 transition-colors" />
          </div>
        )}
      </div>

      {/* Collapsed Chat Panel Toggle */}
      {isCollapsed.chat && (
        <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
          <button
            onClick={handleToggleChat}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Expand Chat Panel"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.698-.413l-4.188 1.47a1 1 0 01-1.397-1.04L5.8 15.7A8 8 0 1121 12z" />
            </svg>
          </button>
          <div className="text-xs text-gray-500 mt-2 writing-mode-vertical">Chat</div>
        </div>
      )}

      {/* Center Panel - Workspace */}
      <div className="flex-1 min-w-0 relative">
        <WorkspacePanel />
      </div>

      {/* Collapsed Team Panel Toggle */}
      {isCollapsed.team && (
        <div className="w-12 bg-white border-l border-gray-200 flex flex-col items-center py-4">
          <button
            onClick={handleToggleTeam}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Expand Team Panel"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          <div className="text-xs text-gray-500 mt-2 writing-mode-vertical">Team</div>
        </div>
      )}

      {/* Right Panel - Team Interface */}
      <div 
        className={cn(
          'relative bg-white border-l border-gray-200 transition-all duration-200',
          isCollapsed.team ? 'w-0 overflow-hidden' : ''
        )}
        style={{ 
          width: isCollapsed.team ? 0 : layout.teamPanelWidth,
          minWidth: isCollapsed.team ? 0 : PANEL_CONSTRAINTS.team.min
        }}
      >
        <TeamPanel />
        
        {/* Team Panel Resize Handle */}
        {!isCollapsed.team && (
          <div
            className={cn(
              'absolute top-0 left-0 w-1 h-full cursor-col-resize',
              'hover:w-2 hover:bg-blue-500/20 transition-all',
              'group flex items-center justify-center',
              isResizing === 'team' && 'w-2 bg-blue-500/30'
            )}
            onMouseDown={() => handleMouseDown('team')}
          >
            <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-500 transition-colors" />
          </div>
        )}
      </div>

      {/* Panel Toggle Controls */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200">
          <button
            onClick={handleToggleChat}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              !isCollapsed.chat 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Chat
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onClick={handleToggleTeam}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              !isCollapsed.team 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Team
          </button>
        </div>
      </div>
    </div>
  )
}