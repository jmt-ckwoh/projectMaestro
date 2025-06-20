/**
 * Common Domain Contracts
 * 
 * Shared interfaces and types used across all domains.
 * These enforce consistent patterns and prevent architectural drift.
 */

import { z } from 'zod'

// =============================================================================
// Base Domain Types
// =============================================================================

export interface DomainEntity {
  readonly id: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface DomainService<T extends DomainEntity> {
  /**
   * Find entity by ID
   * @throws EntityNotFoundError if entity doesn't exist
   */
  findById(id: string): Promise<T>
  
  /**
   * Find entity by ID, return null if not found
   */
  findByIdOrNull(id: string): Promise<T | null>
  
  /**
   * Create new entity
   * @throws ValidationError if input is invalid
   * @throws DomainError if business rules violated
   */
  create(input: unknown): Promise<T>
  
  /**
   * Update existing entity
   * @throws EntityNotFoundError if entity doesn't exist
   * @throws ValidationError if input is invalid
   * @throws DomainError if business rules violated
   */
  update(id: string, input: unknown): Promise<T>
  
  /**
   * Delete entity
   * @throws EntityNotFoundError if entity doesn't exist
   * @throws DomainError if entity cannot be deleted
   */
  delete(id: string): Promise<void>
}

// =============================================================================
// Error Types
// =============================================================================

export abstract class DomainError extends Error {
  abstract readonly code: string
  abstract readonly domain: string
  
  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = this.constructor.name
  }
}

export class EntityNotFoundError extends DomainError {
  readonly code = 'ENTITY_NOT_FOUND'
  readonly domain: string
  
  constructor(domain: string, id: string, cause?: Error) {
    super(`${domain} entity with id '${id}' not found`, cause)
    this.domain = domain
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'
  readonly domain: string
  
  constructor(domain: string, message: string, public readonly errors: z.ZodError, cause?: Error) {
    super(`${domain} validation failed: ${message}`, cause)
    this.domain = domain
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION'
  readonly domain: string
  
  constructor(domain: string, rule: string, cause?: Error) {
    super(`${domain} business rule violated: ${rule}`, cause)
    this.domain = domain
  }
}

export class ConcurrencyError extends DomainError {
  readonly code = 'CONCURRENCY_ERROR'
  readonly domain: string
  
  constructor(domain: string, operation: string, cause?: Error) {
    super(`${domain} concurrency conflict during: ${operation}`, cause)
    this.domain = domain
  }
}

// =============================================================================
// Result Pattern
// =============================================================================

export type Result<T, E = DomainError> = 
  | { success: true; data: T }
  | { success: false; error: E }

export const Ok = <T>(data: T): Result<T, never> => ({ success: true, data })
export const Err = <E>(error: E): Result<never, E> => ({ success: false, error })

/**
 * Safe wrapper for domain operations that may throw
 */
export const safeDomainOperation = async <T>(
  operation: () => Promise<T>
): Promise<Result<T, DomainError>> => {
  try {
    const result = await operation()
    return Ok(result)
  } catch (error) {
    if (error instanceof DomainError) {
      return Err(error)
    }
    // Wrap unexpected errors
    return Err(new DomainError('UNEXPECTED_ERROR', 'unexpected', error as Error))
  }
}

// =============================================================================
// Query Patterns
// =============================================================================

export interface PagedQuery {
  readonly page: number
  readonly limit: number
  readonly sortBy?: string
  readonly sortOrder?: 'asc' | 'desc'
}

export interface PagedResult<T> {
  readonly items: T[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly hasNext: boolean
  readonly hasPrev: boolean
}

export interface FilterQuery {
  readonly filters: Record<string, unknown>
}

// =============================================================================
// Event Patterns
// =============================================================================

export interface DomainEvent {
  readonly id: string
  readonly type: string
  readonly domain: string
  readonly timestamp: Date
  readonly payload: Record<string, unknown>
  readonly version: number
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  readonly eventType: string
  readonly domain: string
  handle(event: T): Promise<void>
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const IdSchema = z.string().uuid('Invalid ID format')
export const TimestampSchema = z.date()
export const NonEmptyStringSchema = z.string().min(1, 'Cannot be empty')
export const OptionalStringSchema = z.string().optional()

export const BaseEntitySchema = z.object({
  id: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
})

// =============================================================================
// Repository Pattern
// =============================================================================

export interface Repository<T extends DomainEntity> {
  findById(id: string): Promise<T | null>
  findAll(query?: PagedQuery): Promise<PagedResult<T>>
  findBy(query: FilterQuery): Promise<T[]>
  save(entity: T): Promise<T>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
}

// =============================================================================
// Service Lifecycle
// =============================================================================

export interface DomainServiceLifecycle {
  /**
   * Initialize the service
   * Called once during application startup
   */
  initialize(): Promise<void>
  
  /**
   * Cleanup resources
   * Called during application shutdown
   */
  cleanup(): Promise<void>
  
  /**
   * Health check
   * Returns service health status
   */
  healthCheck(): Promise<HealthStatus>
}

export interface HealthStatus {
  readonly healthy: boolean
  readonly checks: HealthCheck[]
}

export interface HealthCheck {
  readonly name: string
  readonly healthy: boolean
  readonly message?: string
  readonly details?: Record<string, unknown>
}