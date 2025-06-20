/**
 * Electron Main Process
 * 
 * Entry point for the main process. Creates and manages application windows,
 * sets up IPC handlers, and initializes backend services.
 */

import { BrowserWindow, app, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isDev } from './utils'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// =============================================================================
// Global State
// =============================================================================

let mainWindow: BrowserWindow | null = null

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
      preload: join(__dirname, '../preload/index.js'),
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
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
    
    // TODO: Initialize domain services
    // - Agent service
    // - Project service
    // - Memory service
    // - Git service
    
    // TODO: Set up IPC handlers
    // registerIPCHandlers()
    
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

// =============================================================================
// Basic IPC Handlers
// =============================================================================

// Health check
ipcMain.handle('app:health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: app.getVersion()
  }
})

// Get app info
ipcMain.handle('app:info', async () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform
  }
})

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