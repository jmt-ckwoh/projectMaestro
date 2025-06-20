import type { Preview } from '@storybook/react'
import { fn } from '@storybook/test'
import '../src/renderer/styles/globals.css'

// Mock window.api for Storybook
const mockAPI = {
  // App information
  getAppInfo: fn().mockImplementation(() => Promise.resolve({
    name: 'Project Maestro',
    version: '1.0.0',
    electronVersion: '33.0.0',
    nodeVersion: '18.0.0',
    platform: 'storybook'
  })),
  checkHealth: fn().mockImplementation(() => Promise.resolve({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })),
  
  // Project management
  createProject: fn().mockImplementation((data: any) => Promise.resolve({
    id: 'story-project-id',
    name: data.name || 'Story Project',
    description: data.description || 'A project for Storybook',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  })),
  getProjects: fn().mockImplementation(() => Promise.resolve([])),
  getProject: fn().mockImplementation(() => Promise.resolve(null)),
  updateProject: fn().mockImplementation(() => Promise.resolve({})),
  deleteProject: fn().mockImplementation(() => Promise.resolve()),
  
  // Agent communication
  sendMessage: fn().mockImplementation(() => Promise.resolve({
    messageId: 'story-message-id',
    agentType: 'producer',
    content: 'This is a story response from the agent.',
    actions: [],
    statusUpdate: null,
    errors: []
  })),
  getAgentStatus: fn().mockImplementation(() => Promise.resolve('idle')),
  getAllAgentStatuses: fn().mockImplementation(() => Promise.resolve({
    producer: 'idle',
    architect: 'thinking',
    engineer: 'working',
    qa: 'waiting'
  })),
  
  // File operations
  readFile: fn().mockImplementation(() => Promise.resolve('// This is story file content')),
  writeFile: fn().mockImplementation(() => Promise.resolve()),
  getFileTree: fn().mockImplementation(() => Promise.resolve({
    name: 'root',
    path: '/',
    type: 'directory',
    children: [
      { name: 'src', path: '/src', type: 'directory', children: [] },
      { name: 'package.json', path: '/package.json', type: 'file' }
    ]
  })),
  
  // Memory operations
  addMemory: fn().mockImplementation(() => Promise.resolve({
    id: 'story-memory-id',
    content: 'Story memory content',
    type: 'global',
    createdAt: new Date(),
    metadata: {}
  })),
  searchMemories: fn().mockImplementation(() => Promise.resolve([])),
  
  // Git operations
  createCheckpoint: fn().mockImplementation(() => Promise.resolve({
    id: 'story-checkpoint-id',
    message: 'Story checkpoint',
    timestamp: new Date(),
    files: []
  })),
  getCheckpoints: fn().mockImplementation(() => Promise.resolve([])),
  restoreCheckpoint: fn().mockImplementation(() => Promise.resolve()),
  
  // Configuration
  updateAIConfig: fn().mockImplementation(() => Promise.resolve()),
  getAIConfig: fn().mockImplementation(() => Promise.resolve({ provider: 'bedrock' })),
  
  // Event subscriptions
  on: fn(),
  off: fn()
}

// Mock global window.api
Object.defineProperty(window, 'api', {
  value: mockAPI,
  writable: true
})

// Mock other browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: fn(),
    removeListener: fn(),
    addEventListener: fn(),
    removeEventListener: fn(),
    dispatchEvent: fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = fn().mockImplementation(() => ({
  observe: fn(),
  unobserve: fn(),
  disconnect: fn(),
}))

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      toc: true,
    },
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'maestro-bg',
          value: '#f8fafc',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        large: {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
  },
  
  tags: ['autodocs'],
  
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
}

export default preview