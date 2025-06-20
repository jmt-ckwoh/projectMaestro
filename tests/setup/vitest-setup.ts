/**
 * Vitest Global Setup
 * 
 * This file sets up the global test environment for all Vitest tests
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Vitest doesn't need jest-dom - it has built-in DOM testing capabilities
// We'll use @testing-library/react for component testing without jest-dom matchers

// =============================================================================
// Global Test Environment Setup
// =============================================================================

// Mock Electron modules globally
vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    getName: vi.fn(() => 'Project Maestro'),
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve())
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    on: vi.fn(),
    webContents: {
      openDevTools: vi.fn(),
      on: vi.fn(),
      send: vi.fn()
    },
    show: vi.fn(),
    close: vi.fn()
  })),
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeAllListeners: vi.fn()
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  },
  contextBridge: {
    exposeInMainWorld: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn(() => Promise.resolve({ canceled: false, filePaths: [] })),
    showSaveDialog: vi.fn(() => Promise.resolve({ canceled: false, filePath: '' })),
    showMessageBox: vi.fn(() => Promise.resolve({ response: 0 }))
  }
}))

// Mock fs/promises for main process tests
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  access: vi.fn()
}))

// Mock LanceDB
vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn(() => Promise.resolve({
    openTable: vi.fn(() => Promise.resolve({
      add: vi.fn(),
      search: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(),
      vectorSearch: vi.fn(() => Promise.resolve([])),
      filter: vi.fn(() => Promise.resolve([]))
    })),
    createTable: vi.fn(),
    dropTable: vi.fn()
  }))
}))

// Mock LangChain modules only when they're actually used
// This prevents import resolution errors for unused modules

// =============================================================================
// Browser API Mocks
// =============================================================================

// Mock window.api (Electron preload API)
const mockAPI = {
  // App information
  getAppInfo: vi.fn(() => Promise.resolve({
    name: 'Project Maestro',
    version: '1.0.0',
    electronVersion: '33.0.0',
    nodeVersion: '18.0.0',
    platform: 'test'
  })),
  checkHealth: vi.fn(() => Promise.resolve({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })),
  
  // Project management
  createProject: vi.fn((data: any) => Promise.resolve({
    id: 'test-project-id',
    name: data.name || 'Test Project',
    description: data.description || 'A test project',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    ...data
  })),
  getProjects: vi.fn(() => Promise.resolve([])),
  getProject: vi.fn(() => Promise.resolve(null)),
  updateProject: vi.fn((id: string, updates: any) => Promise.resolve(updates)),
  deleteProject: vi.fn(() => Promise.resolve()),
  
  // Agent communication
  sendMessage: vi.fn(() => Promise.resolve({
    messageId: 'test-message-id',
    agentType: 'producer',
    content: 'Mock agent response',
    actions: [],
    statusUpdate: null,
    errors: []
  })),
  getAgentStatus: vi.fn(() => Promise.resolve('idle')),
  getAllAgentStatuses: vi.fn(() => Promise.resolve({
    producer: 'idle',
    architect: 'idle',
    engineer: 'idle',
    qa: 'idle'
  })),
  
  // File operations
  readFile: vi.fn(() => Promise.resolve('Mock file content')),
  writeFile: vi.fn(() => Promise.resolve()),
  getFileTree: vi.fn(() => Promise.resolve({
    name: 'root',
    path: '/',
    type: 'directory',
    children: []
  })),
  
  // Memory operations
  addMemory: vi.fn(() => Promise.resolve({
    id: 'test-memory-id',
    content: 'Test memory',
    type: 'global',
    createdAt: new Date(),
    metadata: {}
  })),
  searchMemories: vi.fn(() => Promise.resolve([])),
  
  // Git operations
  createCheckpoint: vi.fn(() => Promise.resolve({
    id: 'test-checkpoint-id',
    message: 'Test checkpoint',
    timestamp: new Date(),
    files: []
  })),
  getCheckpoints: vi.fn(() => Promise.resolve([])),
  restoreCheckpoint: vi.fn(() => Promise.resolve()),
  
  // Configuration
  updateAIConfig: vi.fn(() => Promise.resolve()),
  getAIConfig: vi.fn(() => Promise.resolve({
    provider: 'bedrock'
  })),
  
  // Event subscriptions
  on: vi.fn(),
  off: vi.fn()
}

// Mock global window.api
Object.defineProperty(global, 'window', {
  value: {
    api: mockAPI
  },
  writable: true
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// =============================================================================
// Global Test Utilities
// =============================================================================

global.createMockProject = () => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'active',
  type: 'web-app',
  settings: {
    framework: 'react',
    language: 'typescript',
    buildTool: 'vite',
    testFramework: 'vitest',
    deploymentTarget: 'vercel',
    autoSave: true,
    aiAssistance: true
  },
  statistics: {
    filesCount: 0,
    linesOfCode: 0,
    testsCount: 0,
    buildTime: 0
  }
})

global.createMockAgent = (type: string = 'producer') => ({
  id: `test-${type}-id`,
  type,
  name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
  status: 'idle',
  createdAt: new Date(),
  updatedAt: new Date(),
  config: {
    personality: `Test ${type} personality`,
    capabilities: [`${type}-capability`],
    maxConcurrentTasks: 3,
    timeout: 30000
  },
  statistics: {
    messagesProcessed: 0,
    tasksCompleted: 0,
    averageResponseTime: 0,
    errorCount: 0
  }
})

global.createMockMessage = () => ({
  id: 'test-message-id',
  agentType: 'user',
  content: 'Test message content',
  timestamp: new Date(),
  status: 'sent',
  metadata: {}
})

// =============================================================================
// Test Lifecycle Hooks
// =============================================================================

// Global setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.VITEST = 'true'
})

// Global cleanup
afterAll(() => {
  vi.clearAllMocks()
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  vi.resetAllMocks()
})

// =============================================================================
// Console Setup
// =============================================================================

// Suppress specific console warnings in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      args[0]?.includes &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: Using UNSAFE_'))
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }

  console.warn = (...args: any[]) => {
    if (
      args[0]?.includes &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: Using UNSAFE_'))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// =============================================================================
// Custom Matchers (if needed)
// =============================================================================

// Add any custom Vitest matchers here if needed

// =============================================================================
// Module Resolution Helpers
// =============================================================================

// Mock CSS imports
vi.mock('*.css', () => ({}))
vi.mock('*.scss', () => ({}))
vi.mock('*.sass', () => ({}))

// Mock @/utils/cn for components
vi.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

export { mockAPI }