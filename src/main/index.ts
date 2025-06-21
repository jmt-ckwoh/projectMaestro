/**
 * Electron Main Process
 * 
 * Entry point for the main process. Creates and manages application windows,
 * sets up IPC handlers, and initializes backend services.
 */

import { BrowserWindow, app, ipcMain } from 'electron'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { isDev } from './utils'
import { MemoryIPCHandlers } from './services/memory/MemoryIPCHandlers'
import { ChatIPCHandlers } from './services/chat/ChatIPCHandlers'
import { CoreIPCHandlers } from './services/ipc/CoreIPCHandlers'
import { createAgentOrchestrator } from './services/agents/AgentOrchestrator'
import { EventBus } from './services/core/EventBus'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// =============================================================================
// Global State
// =============================================================================

let mainWindow: BrowserWindow | null = null
let memoryIPCHandlers: MemoryIPCHandlers | null = null
let chatIPCHandlers: ChatIPCHandlers | null = null
let coreIPCHandlers: CoreIPCHandlers | null = null
let agentOrchestrator: any | null = null
let eventBus: EventBus | null = null

// =============================================================================
// Window Management
// =============================================================================

const createMainWindow = (): BrowserWindow => {
  // Create the browser window
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false // Required for some Electron features
    }
  })

  // Load the app
  if (isDev) {
    // Development mode - load from Vite dev server
    window.loadURL('http://localhost:5173')
    
    // Open DevTools in development
    window.webContents.openDevTools()
  } else {
    // Production mode - load from built files
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Show window when ready to prevent visual flash
  window.once('ready-to-show', () => {
    window.show()
    
    // Focus the window
    if (isDev) {
      window.focus()
    }
  })

  // Handle window closed
  window.on('closed', () => {
    mainWindow = null
  })

  return window
}

// =============================================================================
// App Event Handlers
// =============================================================================

app.whenReady().then(() => {
  // Create main window
  mainWindow = createMainWindow()

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })

  // Initialize backend services
  initializeServices()
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Cleanup services before quitting
    await cleanupServices()
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

// =============================================================================
// Service Initialization
// =============================================================================

const initializeServices = async (): Promise<void> => {
  try {
    console.log('Initializing backend services...')
    
    // Initialize Event Bus
    console.log('Initializing Event Bus...')
    eventBus = EventBus.getInstance()
    console.log('Event Bus initialized successfully')
    
    // Initialize Core IPC Handlers (App, Project, Agent, UI)
    console.log('Initializing Core IPC Handlers...')
    coreIPCHandlers = new CoreIPCHandlers()
    await coreIPCHandlers.initialize()
    console.log('Core IPC Handlers initialized successfully')
    
    // Initialize Memory System
    console.log('Initializing Memory System...')
    memoryIPCHandlers = new MemoryIPCHandlers()
    await memoryIPCHandlers.initialize()
    console.log('Memory System initialized successfully')
    
    // Initialize Chat System
    console.log('Initializing Chat System...')
    chatIPCHandlers = new ChatIPCHandlers()
    await chatIPCHandlers.initialize()
    console.log('Chat System initialized successfully')
    
    // Initialize Agent System with Memory Integration
    console.log('Initializing Agent System...')
    const memoryService = memoryIPCHandlers.getMemoryService()
    agentOrchestrator = createAgentOrchestrator(eventBus, memoryService)
    await agentOrchestrator.initialize()
    console.log('Agent System initialized successfully')
    
    // TODO: Initialize other domain services
    // - Project service
    // - Git service
    
    // TODO: Start Express API server
    // startAPIServer()
    
    console.log('Backend services initialized successfully')
  } catch (error) {
    console.error('Failed to initialize backend services:', error)
    
    // Show error dialog to user
    if (mainWindow) {
      mainWindow.webContents.send('service-error', {
        message: 'Failed to initialize backend services',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

const cleanupServices = async (): Promise<void> => {
  try {
    console.log('Cleaning up backend services...')
    
    // Cleanup Agent System
    if (agentOrchestrator) {
      await agentOrchestrator.shutdown()
      agentOrchestrator = null
    }
    
    // Cleanup Chat System
    if (chatIPCHandlers) {
      await chatIPCHandlers.cleanup()
      chatIPCHandlers = null
    }
    
    // Cleanup Memory System
    if (memoryIPCHandlers) {
      await memoryIPCHandlers.cleanup()
      memoryIPCHandlers = null
    }
    
    // Cleanup Core IPC Handlers
    if (coreIPCHandlers) {
      coreIPCHandlers.cleanup()
      coreIPCHandlers = null
    }
    
    // Cleanup Event Bus
    if (eventBus) {
      eventBus.clear()
      eventBus = null
    }
    
    // TODO: Cleanup other services
    
    console.log('Backend services cleanup completed')
  } catch (error) {
    console.error('Error during service cleanup:', error)
  }
}

// =============================================================================
// IPC Handlers now managed by CoreIPCHandlers
// =============================================================================

// =============================================================================
// Error Handling
// =============================================================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// =============================================================================
// Exports
// =============================================================================

export { mainWindow }