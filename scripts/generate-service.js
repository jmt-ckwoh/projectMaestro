#!/usr/bin/env node

/**
 * Service Generation Script
 * 
 * Generates domain services following the Project Maestro architecture patterns
 * 
 * Usage:
 *   npm run generate:service -- --domain=notification --name=NotificationService
 *   node scripts/generate-service.js --domain=analytics --name=AnalyticsService --with-contract
 */

const fs = require('fs/promises')
const path = require('path')

// Service templates
const SERVICE_TEMPLATE = `/**
 * {{SERVICE_NAME}}
 * 
 * {{DESCRIPTION}}
 */

import { EventEmitter } from 'events'
import { {{CONTRACT_NAME}} } from '@shared/contracts/{{DOMAIN_CONTRACTS}}'
import { {{DOMAIN_TYPES}} } from '@shared/types/{{DOMAIN_TYPES_FILE}}'

// =============================================================================
// Types
// =============================================================================

export interface {{SERVICE_CONFIG}} {
  {{CONFIG_PROPERTIES}}
}

export interface {{SERVICE_EVENTS}} {
  {{EVENT_DEFINITIONS}}
}

// =============================================================================
// Service Implementation
// =============================================================================

export class {{SERVICE_NAME}} extends EventEmitter implements {{CONTRACT_NAME}} {
  private config: {{SERVICE_CONFIG}}
  private isInitialized = false

  constructor(config: {{SERVICE_CONFIG}}) {
    super()
    this.config = config
  }

  // =============================================================================
  // Lifecycle Methods
  // =============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Add initialization logic here
      console.log(\`Initializing \${this.constructor.name}...\`)
      
      this.isInitialized = true
      this.emit('initialized', { service: this.constructor.name })
      
      console.log(\`\${this.constructor.name} initialized successfully\`)
    } catch (error) {
      this.emit('error', { error, context: 'initialization' })
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log(\`Cleaning up \${this.constructor.name}...\`)
      
      // Add cleanup logic here
      
      this.isInitialized = false
      this.removeAllListeners()
      
      console.log(\`\${this.constructor.name} cleaned up successfully\`)
    } catch (error) {
      console.error(\`Error cleaning up \${this.constructor.name}:\`, error)
      throw error
    }
  }

  // =============================================================================
  // Public API Methods
  // =============================================================================

  {{API_METHODS}}

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  private validateConfig(): void {
    // Add config validation logic here
    if (!this.config) {
      throw new Error('Service configuration is required')
    }
  }

  private handleError(error: Error, context: string): void {
    console.error(\`\${this.constructor.name} error in \${context}:\`, error)
    this.emit('error', { error, context })
  }

  // =============================================================================
  // Getters
  // =============================================================================

  get isReady(): boolean {
    return this.isInitialized
  }

  get configuration(): Readonly<{{SERVICE_CONFIG}}> {
    return { ...this.config }
  }
}

// =============================================================================
// Service Factory
// =============================================================================

export function create{{SERVICE_NAME}}(config: {{SERVICE_CONFIG}}): {{SERVICE_NAME}} {
  const service = new {{SERVICE_NAME}}(config)
  
  // Add any additional setup here
  
  return service
}

// =============================================================================
// Default Export
// =============================================================================

export default {{SERVICE_NAME}}
`

const CONTRACT_TEMPLATE = `/**
 * {{DOMAIN_NAME}} Domain Contracts
 * 
 * Defines interfaces and types for the {{DOMAIN_NAME}} domain
 */

import { BaseService, BaseServiceConfig } from './common'

// =============================================================================
// Service Contract
// =============================================================================

export abstract class {{CONTRACT_NAME}} extends BaseService {
  {{CONTRACT_METHODS}}
}

// =============================================================================
// Domain Types
// =============================================================================

export interface {{DOMAIN_CONFIG}} extends BaseServiceConfig {
  {{DOMAIN_CONFIG_PROPERTIES}}
}

export interface {{DOMAIN_ENTITY}} {
  id: string
  createdAt: Date
  updatedAt: Date
  {{ENTITY_PROPERTIES}}
}

export interface {{DOMAIN_CREATE_INPUT}} {
  {{CREATE_INPUT_PROPERTIES}}
}

export interface {{DOMAIN_UPDATE_INPUT}} {
  {{UPDATE_INPUT_PROPERTIES}}
}

export interface {{DOMAIN_QUERY_OPTIONS}} {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  {{QUERY_OPTIONS_PROPERTIES}}
}

// =============================================================================
// Event Types
// =============================================================================

export interface {{DOMAIN_EVENTS}} {
  'entity-created': { entity: {{DOMAIN_ENTITY}} }
  'entity-updated': { entity: {{DOMAIN_ENTITY}}, changes: Partial<{{DOMAIN_ENTITY}}> }
  'entity-deleted': { id: string }
  {{DOMAIN_EVENT_TYPES}}
}
`

const IPC_HANDLER_TEMPLATE = `/**
 * {{DOMAIN_NAME}} IPC Handlers
 * 
 * Secure IPC handlers for {{DOMAIN_NAME}} domain operations
 */

import { ipcMain } from 'electron'
import { z } from 'zod'
import { {{SERVICE_NAME}} } from '../services/{{DOMAIN_FOLDER}}/{{SERVICE_FILE}}'
import { validateInput, createSecureHandler } from '../security/ipc-validation'

// =============================================================================
// Validation Schemas
// =============================================================================

const {{DOMAIN_CREATE_SCHEMA}} = z.object({
  {{CREATE_SCHEMA_PROPERTIES}}
})

const {{DOMAIN_UPDATE_SCHEMA}} = z.object({
  id: z.string().uuid(),
  {{UPDATE_SCHEMA_PROPERTIES}}
})

const {{DOMAIN_QUERY_SCHEMA}} = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  {{QUERY_SCHEMA_PROPERTIES}}
})

// =============================================================================
// IPC Handlers
// =============================================================================

export function register{{DOMAIN_NAME}}Handlers(service: {{SERVICE_NAME}}): void {
  // Create entity
  ipcMain.handle(
    '{{DOMAIN_FOLDER}}:create',
    createSecureHandler(async (event, input) => {
      const validatedInput = validateInput({{DOMAIN_CREATE_SCHEMA}}, input)
      return await service.create(validatedInput)
    })
  )

  // Get entity
  ipcMain.handle(
    '{{DOMAIN_FOLDER}}:get',
    createSecureHandler(async (event, id: string) => {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid ID is required')
      }
      return await service.get(id)
    })
  )

  // Update entity  
  ipcMain.handle(
    '{{DOMAIN_FOLDER}}:update',
    createSecureHandler(async (event, input) => {
      const validatedInput = validateInput({{DOMAIN_UPDATE_SCHEMA}}, input)
      const { id, ...updates } = validatedInput
      return await service.update(id, updates)
    })
  )

  // Delete entity
  ipcMain.handle(
    '{{DOMAIN_FOLDER}}:delete',
    createSecureHandler(async (event, id: string) => {
      if (!id || typeof id !== 'string') {
        throw new Error('Valid ID is required')
      }
      return await service.delete(id)
    })
  )

  // List entities
  ipcMain.handle(
    '{{DOMAIN_FOLDER}}:list',
    createSecureHandler(async (event, options = {}) => {
      const validatedOptions = validateInput({{DOMAIN_QUERY_SCHEMA}}, options)
      return await service.list(validatedOptions)
    })
  )

  {{ADDITIONAL_HANDLERS}}
}

// =============================================================================
// Cleanup
// =============================================================================

export function unregister{{DOMAIN_NAME}}Handlers(): void {
  const channels = [
    '{{DOMAIN_FOLDER}}:create',
    '{{DOMAIN_FOLDER}}:get',
    '{{DOMAIN_FOLDER}}:update',
    '{{DOMAIN_FOLDER}}:delete',
    '{{DOMAIN_FOLDER}}:list'
  ]

  channels.forEach(channel => {
    ipcMain.removeHandler(channel)
  })
}
`

const TEST_TEMPLATE = `/**
 * Tests for {{SERVICE_NAME}}
 */

import { {{SERVICE_NAME}}, create{{SERVICE_NAME}} } from './{{SERVICE_FILE}}'

describe('{{SERVICE_NAME}}', () => {
  let service: {{SERVICE_NAME}}
  
  beforeEach(() => {
    service = create{{SERVICE_NAME}}({
      {{TEST_CONFIG}}
    })
  })
  
  afterEach(async () => {
    await service.cleanup()
  })
  
  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize()
      expect(service.isReady).toBe(true)
    })
    
    it('should emit initialized event', async () => {
      const initHandler = jest.fn()
      service.on('initialized', initHandler)
      
      await service.initialize()
      
      expect(initHandler).toHaveBeenCalledWith({
        service: '{{SERVICE_NAME}}'
      })
    })
    
    it('should not initialize twice', async () => {
      await service.initialize()
      await service.initialize() // Should not throw
      expect(service.isReady).toBe(true)
    })
  })
  
  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await service.initialize()
      await service.cleanup()
      expect(service.isReady).toBe(false)
    })
    
    it('should remove all event listeners', async () => {
      const handler = jest.fn()
      service.on('test-event', handler)
      
      expect(service.listenerCount('test-event')).toBe(1)
      
      await service.cleanup()
      
      expect(service.listenerCount('test-event')).toBe(0)
    })
  })
  
  {{API_METHOD_TESTS}}
  
  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      // Mock an initialization error
      const errorHandler = jest.fn()
      service.on('error', errorHandler)
      
      // Force an error (implementation-specific)
      // await expect(service.initialize()).rejects.toThrow()
      
      // expect(errorHandler).toHaveBeenCalled()
    })
    
    it('should emit error events', () => {
      const errorHandler = jest.fn()
      service.on('error', errorHandler)
      
      // Trigger an error condition
      service['handleError'](new Error('Test error'), 'test-context')
      
      expect(errorHandler).toHaveBeenCalledWith({
        error: expect.any(Error),
        context: 'test-context'
      })
    })
  })
  
  describe('configuration', () => {
    it('should expose configuration as readonly', () => {
      const config = service.configuration
      expect(config).toBeDefined()
      
      // Should be a copy, not the original
      expect(config).not.toBe(service['config'])
    })
  })
})
`

// Utility functions
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + toCamelCase(str).slice(1)
}

function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function getApiMethods(domain) {
  const methods = {
    default: `
  async create(data: {{DOMAIN_CREATE_INPUT}}): Promise<{{DOMAIN_ENTITY}}> {
    try {
      this.validateConfig()
      
      // Add creation logic here
      const entity: {{DOMAIN_ENTITY}} = {
        id: \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      }
      
      this.emit('entity-created', { entity })
      return entity
    } catch (error) {
      this.handleError(error as Error, 'create')
      throw error
    }
  }

  async get(id: string): Promise<{{DOMAIN_ENTITY}} | null> {
    try {
      this.validateConfig()
      
      // Add retrieval logic here
      // Return null if not found
      return null
    } catch (error) {
      this.handleError(error as Error, 'get')
      throw error
    }
  }

  async update(id: string, updates: {{DOMAIN_UPDATE_INPUT}}): Promise<{{DOMAIN_ENTITY}}> {
    try {
      this.validateConfig()
      
      // Add update logic here
      const entity = await this.get(id)
      if (!entity) {
        throw new Error(\`Entity with id \${id} not found\`)
      }
      
      const updatedEntity = { ...entity, ...updates, updatedAt: new Date() }
      
      this.emit('entity-updated', { entity: updatedEntity, changes: updates })
      return updatedEntity
    } catch (error) {
      this.handleError(error as Error, 'update')
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.validateConfig()
      
      // Add deletion logic here
      this.emit('entity-deleted', { id })
    } catch (error) {
      this.handleError(error as Error, 'delete')
      throw error
    }
  }

  async list(options: {{DOMAIN_QUERY_OPTIONS}} = {}): Promise<{{DOMAIN_ENTITY}}[]> {
    try {
      this.validateConfig()
      
      // Add listing logic here
      return []
    } catch (error) {
      this.handleError(error as Error, 'list')
      throw error
    }
  }`,
    
    agent: `
  async createAgent(type: AgentType, config: AgentConfig): Promise<Agent> {
    // Agent-specific creation logic
  }

  async updateAgentStatus(id: string, status: AgentStatus): Promise<void> {
    // Agent status update logic
  }

  async sendMessage(agentId: string, message: AgentMessage): Promise<AgentResponse> {
    // Message sending logic
  }`,
    
    project: `
  async initializeProject(data: ProjectCreateInput): Promise<Project> {
    // Project initialization logic
  }

  async getProjectFiles(id: string): Promise<FileNode[]> {
    // File tree retrieval logic
  }

  async updateProjectSettings(id: string, settings: ProjectSettings): Promise<void> {
    // Settings update logic
  }`,
    
    memory: `
  async addMemory(content: string, type: MemoryType, metadata?: any): Promise<Memory> {
    // Memory storage logic
  }

  async searchMemories(query: string, options?: SearchOptions): Promise<Memory[]> {
    // Vector search logic
  }

  async clearMemories(filter?: MemoryFilter): Promise<void> {
    // Memory cleanup logic
  }`
  }
  
  return methods[domain] || methods.default
}

function getContractMethods(domain) {
  const methods = {
    default: `
  abstract async create(data: {{DOMAIN_CREATE_INPUT}}): Promise<{{DOMAIN_ENTITY}}>
  abstract async get(id: string): Promise<{{DOMAIN_ENTITY}} | null>
  abstract async update(id: string, updates: {{DOMAIN_UPDATE_INPUT}}): Promise<{{DOMAIN_ENTITY}}>
  abstract async delete(id: string): Promise<void>
  abstract async list(options?: {{DOMAIN_QUERY_OPTIONS}}): Promise<{{DOMAIN_ENTITY}}[]>`,
    
    agent: `
  abstract async createAgent(type: AgentType, config: AgentConfig): Promise<Agent>
  abstract async updateAgentStatus(id: string, status: AgentStatus): Promise<void>
  abstract async sendMessage(agentId: string, message: AgentMessage): Promise<AgentResponse>`,
    
    project: `
  abstract async create(data: ProjectCreateInput): Promise<Project>
  abstract async initializeProject(data: ProjectCreateInput): Promise<Project>
  abstract async getProjectFiles(id: string): Promise<FileNode[]>`,
    
    memory: `
  abstract async addMemory(content: string, type: MemoryType, metadata?: any): Promise<Memory>
  abstract async searchMemories(query: string, options?: SearchOptions): Promise<Memory[]>
  abstract async clearMemories(filter?: MemoryFilter): Promise<void>`
  }
  
  return methods[domain] || methods.default
}

function getDomainProperties(domain) {
  const properties = {
    default: `
  name: string
  description?: string
  isActive: boolean`,
    
    agent: `
  type: AgentType
  status: AgentStatus
  personality: AgentPersonality
  capabilities: string[]`,
    
    project: `
  name: string
  description: string
  type: ProjectType
  status: ProjectStatus
  settings: ProjectSettings`,
    
    memory: `
  content: string
  type: MemoryType
  embedding?: number[]
  metadata: Record<string, any>`
  }
  
  return properties[domain] || properties.default
}

function getTestConfig(domain) {
  const configs = {
    default: `
      enabled: true,
      name: 'test-service'`,
    
    agent: `
      maxAgents: 10,
      defaultTimeout: 30000`,
    
    project: `
      projectsPath: '/tmp/test-projects',
      maxProjects: 100`,
    
    memory: `
      vectorDimensions: 1536,
      maxMemories: 10000`
  }
  
  return configs[domain] || configs.default
}

// Main generation function
async function generateService(options) {
  const {
    domain,
    name,
    withContract = true,
    withIpcHandlers = true,
    withTest = true,
    description = `Service for managing ${domain} domain operations`
  } = options

  if (!domain || !name) {
    throw new Error('Domain and service name are required')
  }

  const serviceName = name.endsWith('Service') ? name : `${name}Service`
  const domainName = toPascalCase(domain)
  const domainFolder = toKebabCase(domain)
  const contractName = `${domainName}Service`
  
  // Create service directory
  const servicePath = path.join('src', 'main', 'services', domainFolder)
  await fs.mkdir(servicePath, { recursive: true })

  // Generate service implementation
  const serviceContent = SERVICE_TEMPLATE
    .replace(/{{SERVICE_NAME}}/g, serviceName)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{CONTRACT_NAME}}/g, contractName)
    .replace(/{{DOMAIN_CONTRACTS}}/g, `${domainName}Domain`)
    .replace(/{{DOMAIN_TYPES}}/g, `${domainName}Types`)
    .replace(/{{DOMAIN_TYPES_FILE}}/g, toKebabCase(domain))
    .replace(/{{SERVICE_CONFIG}}/g, `${serviceName}Config`)
    .replace(/{{SERVICE_EVENTS}}/g, `${serviceName}Events`)
    .replace(/{{CONFIG_PROPERTIES}}/g, `enabled: boolean\n  name: string`)
    .replace(/{{EVENT_DEFINITIONS}}/g, `'initialized': { service: string }\n  'error': { error: Error, context: string }`)
    .replace(/{{API_METHODS}}/g, getApiMethods(domain))
    .replace(/{{DOMAIN_CREATE_INPUT}}/g, `${domainName}CreateInput`)
    .replace(/{{DOMAIN_UPDATE_INPUT}}/g, `${domainName}UpdateInput`)
    .replace(/{{DOMAIN_QUERY_OPTIONS}}/g, `${domainName}QueryOptions`)
    .replace(/{{DOMAIN_ENTITY}}/g, domainName)

  const serviceFilePath = path.join(servicePath, `${serviceName}.ts`)
  await fs.writeFile(serviceFilePath, serviceContent)
  
  console.log(`✅ Generated service: ${serviceFilePath}`)

  // Generate contract
  if (withContract) {
    const contractsPath = path.join('src', 'shared', 'contracts')
    await fs.mkdir(contractsPath, { recursive: true })

    const contractContent = CONTRACT_TEMPLATE
      .replace(/{{DOMAIN_NAME}}/g, domainName)
      .replace(/{{CONTRACT_NAME}}/g, contractName)
      .replace(/{{CONTRACT_METHODS}}/g, getContractMethods(domain))
      .replace(/{{DOMAIN_CONFIG}}/g, `${domainName}Config`)
      .replace(/{{DOMAIN_ENTITY}}/g, domainName)
      .replace(/{{DOMAIN_CREATE_INPUT}}/g, `${domainName}CreateInput`)
      .replace(/{{DOMAIN_UPDATE_INPUT}}/g, `${domainName}UpdateInput`)
      .replace(/{{DOMAIN_QUERY_OPTIONS}}/g, `${domainName}QueryOptions`)
      .replace(/{{DOMAIN_EVENTS}}/g, `${domainName}Events`)
      .replace(/{{DOMAIN_CONFIG_PROPERTIES}}/g, `enabled: boolean`)
      .replace(/{{ENTITY_PROPERTIES}}/g, getDomainProperties(domain))
      .replace(/{{CREATE_INPUT_PROPERTIES}}/g, getDomainProperties(domain))
      .replace(/{{UPDATE_INPUT_PROPERTIES}}/g, getDomainProperties(domain) + '?')
      .replace(/{{QUERY_OPTIONS_PROPERTIES}}/g, `filter?: string`)
      .replace(/{{DOMAIN_EVENT_TYPES}}/g, `'custom-event': { data: any }`)

    const contractFilePath = path.join(contractsPath, `${domainName}Domain.ts`)
    await fs.writeFile(contractFilePath, contractContent)
    
    console.log(`✅ Generated contract: ${contractFilePath}`)
  }

  // Generate IPC handlers
  if (withIpcHandlers) {
    const ipcPath = path.join('src', 'main', 'ipc')
    await fs.mkdir(ipcPath, { recursive: true })

    const ipcContent = IPC_HANDLER_TEMPLATE
      .replace(/{{DOMAIN_NAME}}/g, domainName)
      .replace(/{{DOMAIN_FOLDER}}/g, domainFolder)
      .replace(/{{SERVICE_NAME}}/g, serviceName)
      .replace(/{{SERVICE_FILE}}/g, serviceName)
      .replace(/{{DOMAIN_CREATE_SCHEMA}}/g, `${domainName}CreateSchema`)
      .replace(/{{DOMAIN_UPDATE_SCHEMA}}/g, `${domainName}UpdateSchema`) 
      .replace(/{{DOMAIN_QUERY_SCHEMA}}/g, `${domainName}QuerySchema`)
      .replace(/{{CREATE_SCHEMA_PROPERTIES}}/g, `name: z.string()`)
      .replace(/{{UPDATE_SCHEMA_PROPERTIES}}/g, `name: z.string().optional()`)
      .replace(/{{QUERY_SCHEMA_PROPERTIES}}/g, `filter: z.string().optional()`)
      .replace(/{{ADDITIONAL_HANDLERS}}/g, '')

    const ipcFilePath = path.join(ipcPath, `${domainFolder}-handlers.ts`)
    await fs.writeFile(ipcFilePath, ipcContent)
    
    console.log(`✅ Generated IPC handlers: ${ipcFilePath}`)
  }

  // Generate test
  if (withTest) {
    const testContent = TEST_TEMPLATE
      .replace(/{{SERVICE_NAME}}/g, serviceName)
      .replace(/{{SERVICE_FILE}}/g, serviceName)
      .replace(/{{TEST_CONFIG}}/g, getTestConfig(domain))
      .replace(/{{API_METHOD_TESTS}}/g, `
  describe('API methods', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should implement CRUD operations', async () => {
      // Add API method tests here
      expect(service.create).toBeDefined()
      expect(service.get).toBeDefined()
      expect(service.update).toBeDefined()
      expect(service.delete).toBeDefined()
      expect(service.list).toBeDefined()
    })
  })`)

    const testFilePath = path.join(servicePath, `${serviceName}.test.ts`)
    await fs.writeFile(testFilePath, testContent)
    
    console.log(`✅ Generated test: ${testFilePath}`)
  }

  // Update service index
  const indexPath = path.join(servicePath, 'index.ts')
  try {
    let indexContent = ''
    try {
      indexContent = await fs.readFile(indexPath, 'utf-8')
    } catch (err) {
      // File doesn't exist, create new
    }
    
    const exportLine = `export { ${serviceName}, create${serviceName} } from './${serviceName}'`
    if (!indexContent.includes(exportLine)) {
      indexContent += `${indexContent ? '\n' : ''}${exportLine}\n`
      await fs.writeFile(indexPath, indexContent)
      console.log(`✅ Updated index: ${indexPath}`)
    }
  } catch (err) {
    console.warn(`⚠️  Could not update index file: ${err.message}`)
  }

  return {
    serviceFile: serviceFilePath,
    contractFile: withContract ? path.join('src', 'shared', 'contracts', `${domainName}Domain.ts`) : null,
    ipcFile: withIpcHandlers ? path.join('src', 'main', 'ipc', `${domainFolder}-handlers.ts`) : null,
    testFile: withTest ? path.join(servicePath, `${serviceName}.test.ts`) : null
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options = {}

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')
      options[key] = value === undefined ? true : value
    }
  })

  if (options.help) {
    console.log(`
Project Maestro Service Generator

Usage:
  npm run generate:service -- --domain=DOMAIN --name=ServiceName [options]

Options:
  --domain=DOMAIN        Service domain (required)
  --name=NAME           Service name (required) 
  --description=DESC    Service description
  --no-contract         Skip generating domain contract
  --no-ipc-handlers     Skip generating IPC handlers
  --no-test             Skip generating test file

Examples:
  npm run generate:service -- --domain=notification --name=NotificationService
  npm run generate:service -- --domain=analytics --name=AnalyticsService --no-ipc-handlers
    `)
    return
  }

  try {
    const result = await generateService({
      domain: options.domain,
      name: options.name,
      description: options.description,
      withContract: !options['no-contract'],
      withIpcHandlers: !options['no-ipc-handlers'],
      withTest: !options['no-test']
    })

    console.log(`\n🎉 Service generation complete!`)
    console.log(`\nGenerated files:`)
    console.log(`  Service: ${result.serviceFile}`)
    if (result.contractFile) console.log(`  Contract: ${result.contractFile}`)
    if (result.ipcFile) console.log(`  IPC Handlers: ${result.ipcFile}`)
    if (result.testFile) console.log(`  Test: ${result.testFile}`)
    
    console.log(`\nNext steps:`)
    console.log(`  1. Implement the service methods`)
    console.log(`  2. Register IPC handlers in main process`)
    console.log(`  3. Add service to preload API`)
    console.log(`  4. Write comprehensive tests`)
    console.log(`  5. Run: npm test (to run tests)`)
  } catch (error) {
    console.error(`❌ Error generating service: ${error.message}`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateService }