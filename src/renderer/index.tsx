/**
 * React App Entry Point
 * 
 * Renders the main React application into the DOM.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// =============================================================================
// Error Boundary for Root Level Errors
// =============================================================================

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Root error boundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
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
                Something went wrong. Please restart the application.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// =============================================================================
// App Initialization
// =============================================================================

const initializeApp = async (): Promise<void> => {
  try {
    // Check if Electron API is available
    if (!window.api) {
      throw new Error('Electron API not available. Please ensure the preload script is loaded.')
    }

    // Perform health check
    const health = await window.api.checkHealth()
    console.warn('Application health check:', health)

    // Signal that React app is ready
    window.dispatchEvent(new Event('app-ready'))
  } catch (error) {
    console.error('Failed to initialize React application:', error)
    throw error
  }
}

// =============================================================================
// Render Application
// =============================================================================

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = ReactDOM.createRoot(rootElement)

// Initialize and render
initializeApp()
  .then(() => {
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <App />
        </RootErrorBoundary>
      </React.StrictMode>
    )
  })
  .catch((error) => {
    // Render error state if initialization fails
    root.render(
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Initialization Error
            </h1>
            <p className="text-gray-600 mb-2">
              Failed to initialize Project Maestro
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  })