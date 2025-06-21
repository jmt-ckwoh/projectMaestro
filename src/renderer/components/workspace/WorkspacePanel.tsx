/**
 * Workspace Panel Component
 * 
 * Center panel of the Three-Panel Layout - implements "Trello-like" interface
 * for project management, task boards, and context switching
 */

import React from 'react'
import { useUIStore } from '@/renderer/stores/uiStore'
import { useProjectStore } from '@/renderer/stores/projectStore'
import { cn } from '@/renderer/utils/cn'
import { TreeView } from './TreeView'
import type { HierarchyItem } from '@/shared/types/tasks'

// =============================================================================
// Workspace Panel Component
// =============================================================================

export const WorkspacePanel: React.FC = () => {
  const { layout, setWorkspaceView } = useUIStore()
  const { currentProject } = useProjectStore()

  // =============================================================================
  // View Switching
  // =============================================================================

  const handleViewChange = (view: typeof layout.workspaceView) => {
    setWorkspaceView(view)
  }

  // =============================================================================
  // Render Content Based on View
  // =============================================================================

  const renderContent = () => {
    switch (layout.workspaceView) {
      case 'tree':
        return <TreeViewTab />
      case 'board':
        return <ProjectBoardView />
      case 'architecture':
        return <ArchitectureView />
      case 'files':
        return <FilesView />
      case 'chat-focus':
        return <ChatFocusView />
      default:
        return <TreeViewTab />
    }
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Workspace Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentProject?.name || 'Project Workspace'}
            </h1>
            <p className="text-gray-600">
              {currentProject?.description || 'Select or create a project to get started'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              New Project
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'tree', label: 'Tree View', icon: '🌳' },
            { id: 'board', label: 'Kanban Board', icon: '📋' },
            { id: 'architecture', label: 'Architecture', icon: '🏗️' },
            { id: 'files', label: 'Files', icon: '📁' },
            { id: 'chat-focus', label: 'Chat Focus', icon: '💬' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleViewChange(tab.id as typeof layout.workspaceView)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                layout.workspaceView === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}

// =============================================================================
// Project Board View
// =============================================================================

const ProjectBoardView: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Project Board Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Board</h2>
          <p className="text-gray-600">Manage your project tasks in a Trello-like interface</p>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">To Do</h3>
              <p className="text-sm text-gray-600">Ideas and planned work</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="font-medium text-gray-900">Create user authentication</h4>
                <p className="text-sm text-gray-600 mt-1">Implement login/signup flow</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Epic</span>
                  <span className="text-xs text-gray-500">Assigned to Engineer</span>
                </div>
              </div>
            </div>
          </div>

          {/* In Progress Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">In Progress</h3>
              <p className="text-sm text-gray-600">Currently being worked on</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900">Design system setup</h4>
                <p className="text-sm text-gray-600 mt-1">Setting up Tailwind and component library</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Story</span>
                  <span className="text-xs text-gray-500">⚡ Working...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Done Column */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Done</h3>
              <p className="text-sm text-gray-600">Completed work</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900">Project initialization</h4>
                <p className="text-sm text-gray-600 mt-1">Set up development environment</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Task</span>
                  <span className="text-xs text-green-600">✅ Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex items-center gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Add Epic
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Add Story
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Add Task
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Architecture View
// =============================================================================

const ArchitectureView: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">System Architecture</h2>
          <p className="text-gray-600">Visual representation of your project's architecture</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏗️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Architecture Diagrams</h3>
            <p className="text-gray-600 mb-4">Architecture visualization will be available here</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Generate Architecture Diagram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Files View
// =============================================================================

const FilesView: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Files</h2>
          <p className="text-gray-600">Browse and manage your project files</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">File Explorer</h3>
            <p className="text-gray-600 mb-4">File management interface will be available here</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Open File Explorer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Tree View Tab
// =============================================================================

const TreeViewTab: React.FC = () => {
  // Mock data for demonstration - will be replaced with real data
  const mockTasks: HierarchyItem[] = [
    {
      id: '1',
      title: 'User Authentication System',
      description: 'Complete user login and registration functionality',
      type: 'epic',
      status: 'in-progress',
      priority: 'high',
      storyPoints: 21,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'project-1',
      stories: [],
      businessValue: 'Enable secure user access and personalization',
      acceptanceCriteria: [
        'Users can register with email and password',
        'Users can login securely', 
        'Password reset functionality works',
        'User sessions are managed properly'
      ]
    },
    {
      id: '2', 
      title: 'Project Dashboard Interface',
      description: 'Main dashboard for project management',
      type: 'epic',
      status: 'not-started',
      priority: 'medium',
      storyPoints: 13,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: 'project-1',
      stories: [],
      businessValue: 'Provide centralized project visibility and control',
      acceptanceCriteria: [
        'Dashboard shows project overview',
        'Real-time status updates',
        'Quick action buttons available',
        'Performance metrics displayed'
      ]
    }
  ]

  const handleItemSelect = (item: HierarchyItem) => {
    console.log('Selected item:', item)
  }

  const handleItemUpdate = (item: HierarchyItem) => {
    console.log('Update item:', item)
  }

  const handleCreateChild = (parentItem: HierarchyItem) => {
    console.log('Create child for:', parentItem)
  }

  return (
    <div className="h-full">
      <TreeView
        items={mockTasks}
        onItemSelect={handleItemSelect}
        onItemUpdate={handleItemUpdate}
        onCreateChild={handleCreateChild}
        className="h-full"
      />
    </div>
  )
}

// =============================================================================
// Chat Focus View
// =============================================================================

const ChatFocusView: React.FC = () => {
  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Chat Focus Mode</h2>
          <p className="text-gray-600">Expanded chat interface for detailed conversations</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Enhanced Chat View</h3>
            <p className="text-gray-600 mb-4">Expanded chat interface will be available here</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Switch to Chat Focus
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}