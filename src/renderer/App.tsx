/**
 * Main React Application Component
 * 
 * Root component that sets up the application layout and routing.
 */

import React, { useEffect, useState } from 'react'
import { ThreePanelLayout } from './components/layout'
import { useUIStore } from './stores/uiStore'

// =============================================================================
// App Component
// =============================================================================

export const App: React.FC = () => {
  const [appInfo, setAppInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showWelcome, setShowWelcome } = useUIStore()

  // Initialize app and fetch basic info
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true)
        
        // Get app information
        const info = await window.api.getAppInfo()
        setAppInfo(info)
        
        console.warn('App initialized with info:', info)
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Initializing Project Maestro...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Application Error
            </h1>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show welcome screen or main application
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">Project Maestro</h1>
                </div>
                <div className="ml-4 text-sm text-gray-500">
                  v{appInfo?.version}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Electron {appInfo?.electronVersion}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <WelcomeScreen onGetStarted={() => setShowWelcome(false)} />
          </div>
        </main>
      </div>
    )
  }

  // Main Three-Panel Application
  return <ThreePanelLayout />
}

// =============================================================================
// Welcome Screen Component
// =============================================================================

interface WelcomeScreenProps {
  onGetStarted: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="text-center py-12">
      <div className="max-w-3xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="text-6xl mb-6">🎭</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Project Maestro
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A communication-centric code generation environment powered by AI personas.
            Direct your team of AI agents to transform ideas into working software.
          </p>
        </div>

        {/* Agent Team Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <AgentCard
            emoji="👔"
            name="Producer"
            role="Project Manager"
            description="Guides you through the development process and coordinates the team."
          />
          <AgentCard
            emoji="🏗️"
            name="Architect"
            role="System Designer"
            description="Designs technical architecture and selects the right technologies."
          />
          <AgentCard
            emoji="⚡"
            name="Engineer"
            role="Code Generator"
            description="Implements features and writes clean, maintainable code."
          />
          <AgentCard
            emoji="🔍"
            name="QA"
            role="Quality Assurance"
            description="Tests code, finds bugs, and ensures quality standards."
          />
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-6">
            Create your first project and start collaborating with your AI team.
          </p>
          <button 
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Get Started
          </button>
        </div>

        {/* Status */}
        <div className="mt-8 text-sm text-gray-500">
          <p>Build system initialized ✓</p>
          <p>Ready for implementation 🚀</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Agent Card Component
// =============================================================================

interface AgentCardProps {
  emoji: string
  name: string
  role: string
  description: string
}

const AgentCard: React.FC<AgentCardProps> = ({ emoji, name, role, description }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
      <p className="text-sm text-blue-600 mb-3">{role}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}