/**
 * Project Domain Contracts
 * 
 * Defines interfaces and types for project management operations.
 * Implements domain-driven design patterns for project lifecycle.
 */

import { z } from 'zod'
import { 
  BaseEntitySchema, 
  DomainEntity, 
  DomainError, 
  DomainEvent, 
  DomainService,
  NonEmptyStringSchema,
  PagedQuery,
  PagedResult,
  Result
} from './common'

// =============================================================================
// Project Entity Types
// =============================================================================

export type ProjectType = 'web-app' | 'mobile-app' | 'api' | 'library'
export type ProjectStatus = 'planning' | 'development' | 'testing' | 'completed' | 'archived'

export interface ProjectSettings {
  readonly framework: string
  readonly language: string
  readonly buildTool: string
  readonly testFramework: string
  readonly deploymentTarget: string
  readonly autoSave: boolean
  readonly aiAssistance: boolean
}

export interface ProjectStatistics {
  readonly filesCount: number
  readonly linesOfCode: number
  readonly testsCount: number
  readonly buildTime: number
}

export interface Project extends DomainEntity {
  readonly name: string
  readonly description: string
  readonly type: ProjectType
  readonly status: ProjectStatus
  readonly settings: ProjectSettings
  readonly statistics: ProjectStatistics
}

// =============================================================================
// Input/Output Types
// =============================================================================

export interface CreateProjectInput {
  readonly name: string
  readonly description: string
  readonly type: ProjectType
  readonly settings?: Partial<ProjectSettings>
}

export interface UpdateProjectInput {
  readonly name?: string
  readonly description?: string
  readonly status?: ProjectStatus
  readonly settings?: Partial<ProjectSettings>
}

export interface ProjectQuery extends PagedQuery {
  readonly status?: ProjectStatus
  readonly type?: ProjectType
  readonly search?: string
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const ProjectTypeSchema = z.enum(['web-app', 'mobile-app', 'api', 'library'])
export const ProjectStatusSchema = z.enum(['planning', 'development', 'testing', 'completed', 'archived'])

export const ProjectSettingsSchema = z.object({
  framework: NonEmptyStringSchema,
  language: NonEmptyStringSchema,
  buildTool: NonEmptyStringSchema,
  testFramework: NonEmptyStringSchema,
  deploymentTarget: NonEmptyStringSchema,
  autoSave: z.boolean(),
  aiAssistance: z.boolean()
})

export const ProjectStatisticsSchema = z.object({
  filesCount: z.number().int().min(0),
  linesOfCode: z.number().int().min(0),
  testsCount: z.number().int().min(0),
  buildTime: z.number().min(0)
})

export const ProjectSchema = BaseEntitySchema.extend({
  name: NonEmptyStringSchema,
  description: z.string(),
  type: ProjectTypeSchema,
  status: ProjectStatusSchema,
  settings: ProjectSettingsSchema,
  statistics: ProjectStatisticsSchema
})

export const CreateProjectSchema = z.object({
  name: NonEmptyStringSchema,
  description: z.string(),
  type: ProjectTypeSchema,
  settings: ProjectSettingsSchema.partial().optional()
})

export const UpdateProjectSchema = z.object({
  name: NonEmptyStringSchema.optional(),
  description: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  settings: ProjectSettingsSchema.partial().optional()
})

export const ProjectQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: ProjectStatusSchema.optional(),
  type: ProjectTypeSchema.optional(),
  search: z.string().optional()
})

// =============================================================================
// Domain Events
// =============================================================================

export interface ProjectCreatedEvent extends DomainEvent {
  readonly type: 'project.created'
  readonly domain: 'project'
  readonly payload: {
    readonly projectId: string
    readonly name: string
    readonly type: ProjectType
  }
}

export interface ProjectUpdatedEvent extends DomainEvent {
  readonly type: 'project.updated'
  readonly domain: 'project'
  readonly payload: {
    readonly projectId: string
    readonly changes: UpdateProjectInput
  }
}

export interface ProjectStatusChangedEvent extends DomainEvent {
  readonly type: 'project.status.changed'
  readonly domain: 'project'
  readonly payload: {
    readonly projectId: string
    readonly previousStatus: ProjectStatus
    readonly newStatus: ProjectStatus
  }
}

export interface ProjectDeletedEvent extends DomainEvent {
  readonly type: 'project.deleted'
  readonly domain: 'project'
  readonly payload: {
    readonly projectId: string
    readonly name: string
  }
}

export type ProjectDomainEvent = 
  | ProjectCreatedEvent 
  | ProjectUpdatedEvent 
  | ProjectStatusChangedEvent 
  | ProjectDeletedEvent

// =============================================================================
// Domain Errors
// =============================================================================

export class ProjectNotFoundError extends DomainError {
  readonly code = 'PROJECT_NOT_FOUND'
  readonly domain = 'project'
  
  constructor(projectId: string, cause?: Error) {
    super(`Project with id '${projectId}' not found`, cause)
  }
}

export class ProjectNameConflictError extends DomainError {
  readonly code = 'PROJECT_NAME_CONFLICT'
  readonly domain = 'project'
  
  constructor(name: string, cause?: Error) {
    super(`Project with name '${name}' already exists`, cause)
  }
}

export class InvalidProjectStateError extends DomainError {
  readonly code = 'INVALID_PROJECT_STATE'
  readonly domain = 'project'
  
  constructor(operation: string, currentStatus: ProjectStatus, cause?: Error) {
    super(`Cannot ${operation} project in '${currentStatus}' status`, cause)
  }
}

export class ProjectValidationError extends DomainError {
  readonly code = 'PROJECT_VALIDATION_ERROR'
  readonly domain = 'project'
  
  constructor(message: string, public readonly validationErrors: z.ZodError, cause?: Error) {
    super(`Project validation failed: ${message}`, cause)
  }
}

// =============================================================================
// Domain Service Interface
// =============================================================================

export interface IProjectDomainService extends DomainService<Project> {
  /**
   * Create a new project
   */
  createProject(input: CreateProjectInput): Promise<Result<Project, DomainError>>
  
  /**
   * Get project by ID
   */
  getProject(id: string): Promise<Result<Project, DomainError>>
  
  /**
   * Get all projects with filtering and pagination
   */
  getProjects(query?: ProjectQuery): Promise<Result<PagedResult<Project>, DomainError>>
  
  /**
   * Update project
   */
  updateProject(id: string, input: UpdateProjectInput): Promise<Result<Project, DomainError>>
  
  /**
   * Delete project
   */
  deleteProject(id: string): Promise<Result<void, DomainError>>
  
  /**
   * Update project statistics
   */
  updateProjectStatistics(id: string, statistics: Partial<ProjectStatistics>): Promise<Result<Project, DomainError>>
  
  /**
   * Change project status with validation
   */
  changeProjectStatus(id: string, newStatus: ProjectStatus): Promise<Result<Project, DomainError>>
  
  /**
   * Check if project name is available
   */
  isProjectNameAvailable(name: string, excludeId?: string): Promise<Result<boolean, DomainError>>
  
  /**
   * Get projects by status
   */
  getProjectsByStatus(status: ProjectStatus): Promise<Result<Project[], DomainError>>
  
  /**
   * Search projects by name or description
   */
  searchProjects(searchTerm: string): Promise<Result<Project[], DomainError>>
}

// =============================================================================
// Repository Interface
// =============================================================================

export interface IProjectRepository {
  findById(id: string): Promise<Project | null>
  findByName(name: string): Promise<Project | null>
  findAll(query?: ProjectQuery): Promise<PagedResult<Project>>
  findByStatus(status: ProjectStatus): Promise<Project[]>
  search(searchTerm: string): Promise<Project[]>
  save(project: Project): Promise<Project>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  existsByName(name: string, excludeId?: string): Promise<boolean>
}

// =============================================================================
// Project Factory
// =============================================================================

export interface IProjectFactory {
  /**
   * Create a new project instance with default values
   */
  createProject(input: CreateProjectInput): Project
  
  /**
   * Create default project settings for a given type
   */
  createDefaultSettings(projectType: ProjectType): ProjectSettings
  
  /**
   * Create initial project statistics
   */
  createInitialStatistics(): ProjectStatistics
}

// =============================================================================
// Use Cases
// =============================================================================

export interface ProjectUseCases {
  createProject: (input: CreateProjectInput) => Promise<Result<Project, DomainError>>
  getProject: (id: string) => Promise<Result<Project, DomainError>>
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Result<Project, DomainError>>
  deleteProject: (id: string) => Promise<Result<void, DomainError>>
  listProjects: (query?: ProjectQuery) => Promise<Result<PagedResult<Project>, DomainError>>
  archiveProject: (id: string) => Promise<Result<Project, DomainError>>
  restoreProject: (id: string) => Promise<Result<Project, DomainError>>
}