/**
 * Event Bus Contract
 * 
 * Defines the contract for the event-driven architecture.
 * This prevents agent communication chaos by enforcing:
 * - Clear event protocols
 * - Proper subscription management
 * - Circuit breaker patterns
 * - Event ordering guarantees
 */

import { z } from 'zod'
import { DomainError, DomainEvent, Result } from './common'

// =============================================================================
// Event Bus Core Types
// =============================================================================

export interface IEventBus {
  /**
   * Publish an event to all subscribers
   * @param event The event to publish
   * @returns Promise that resolves when all handlers complete
   */
  publish<T extends DomainEvent>(event: T): Promise<Result<void, EventBusError>>
  
  /**
   * Publish an event asynchronously (fire-and-forget)
   * @param event The event to publish
   */
  publishAsync<T extends DomainEvent>(event: T): void
  
  /**
   * Subscribe to events of a specific type
   * @param eventType The type of event to subscribe to
   * @param handler The function to call when the event occurs
   * @param options Subscription options
   * @returns Subscription ID for unsubscribing
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): string
  
  /**
   * Subscribe to multiple event types
   * @param eventTypes Array of event types to subscribe to
   * @param handler The function to call when any of the events occur
   * @param options Subscription options
   * @returns Subscription ID for unsubscribing
   */
  subscribeToMany<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): string
  
  /**
   * Unsubscribe from events
   * @param subscriptionId The ID returned from subscribe()
   */
  unsubscribe(subscriptionId: string): void
  
  /**
   * Unsubscribe all handlers for an event type
   * @param eventType The event type to clear
   */
  unsubscribeAll(eventType: string): void
  
  /**
   * Check if there are any subscribers for an event type
   * @param eventType The event type to check
   */
  hasSubscribers(eventType: string): boolean
  
  /**
   * Get metrics about the event bus
   */
  getMetrics(): EventBusMetrics
  
  /**
   * Clear all subscriptions and reset the bus
   */
  clear(): void
}

// =============================================================================
// Event Handler
// =============================================================================

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  /**
   * Handle the event
   * @param event The event to handle
   * @returns Promise that resolves when handling is complete
   */
  handle(event: T): Promise<void>
  
  /**
   * Handle errors that occur during event processing
   * @param error The error that occurred
   * @param event The event that caused the error
   */
  onError?(error: Error, event: T): Promise<void>
}

// =============================================================================
// Subscription Options
// =============================================================================

export interface SubscriptionOptions {
  /**
   * Priority for event handling (higher numbers = higher priority)
   * @default 0
   */
  readonly priority?: number
  
  /**
   * Maximum number of retries if handler fails
   * @default 3
   */
  readonly maxRetries?: number
  
  /**
   * Delay between retries in milliseconds
   * @default 1000
   */
  readonly retryDelay?: number
  
  /**
   * Timeout for handler execution in milliseconds
   * @default 30000
   */
  readonly timeout?: number
  
  /**
   * Whether to run this handler in parallel with others
   * @default true
   */
  readonly parallel?: boolean
  
  /**
   * Circuit breaker options
   */
  readonly circuitBreaker?: CircuitBreakerOptions
  
  /**
   * Filter function to determine if this handler should process the event
   */
  readonly filter?: (event: DomainEvent) => boolean
}

export interface CircuitBreakerOptions {
  /**
   * Number of failures before opening the circuit
   * @default 5
   */
  readonly failureThreshold?: number
  
  /**
   * Time in milliseconds to wait before trying again
   * @default 60000
   */
  readonly resetTimeout?: number
  
  /**
   * Number of successful calls needed to close the circuit
   * @default 3
   */
  readonly successThreshold?: number
}

// =============================================================================
// Event Bus Metrics
// =============================================================================

export interface EventBusMetrics {
  readonly totalEventsPublished: number
  readonly totalEventsHandled: number
  readonly totalErrors: number
  readonly averageHandlingTime: number
  readonly subscriberCounts: Record<string, number>
  readonly circuitBreakerStates: Record<string, CircuitBreakerState>
  readonly recentEvents: EventMetric[]
}

export interface EventMetric {
  readonly eventType: string
  readonly timestamp: Date
  readonly handlerCount: number
  readonly processingTime: number
  readonly success: boolean
  readonly error?: string
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open', 
  HALF_OPEN = 'half_open'
}

// =============================================================================
// Specific Event Bus Implementation Contracts
// =============================================================================

/**
 * In-Memory Event Bus
 * For single-process scenarios
 */
export interface IInMemoryEventBus extends IEventBus {
  /**
   * Get all active subscriptions
   */
  getSubscriptions(): SubscriptionInfo[]
  
  /**
   * Pause event processing
   */
  pause(): void
  
  /**
   * Resume event processing
   */
  resume(): void
  
  /**
   * Check if event processing is paused
   */
  isPaused(): boolean
}

/**
 * Persistent Event Bus
 * For scenarios requiring event persistence and replay
 */
export interface IPersistentEventBus extends IEventBus {
  /**
   * Replay events from a specific timestamp
   * @param fromTimestamp Start replaying from this time
   * @param toTimestamp Optional end time for replay
   */
  replay(fromTimestamp: Date, toTimestamp?: Date): Promise<void>
  
  /**
   * Get event history
   * @param options Query options for event history
   */
  getEventHistory(options?: EventHistoryQuery): Promise<DomainEvent[]>
  
  /**
   * Create a snapshot of current state
   */
  createSnapshot(): Promise<string>
  
  /**
   * Restore from a snapshot
   * @param snapshotId The snapshot to restore from
   */
  restoreFromSnapshot(snapshotId: string): Promise<void>
}

export interface SubscriptionInfo {
  readonly id: string
  readonly eventType: string
  readonly priority: number
  readonly options: SubscriptionOptions
  readonly createdAt: Date
  readonly handlerCount: number
}

export interface EventHistoryQuery {
  readonly eventTypes?: string[]
  readonly startDate?: Date
  readonly endDate?: Date
  readonly limit?: number
  readonly offset?: number
}

// =============================================================================
// Event Ordering & Reliability
// =============================================================================

export interface OrderedEventBus extends IEventBus {
  /**
   * Publish event with ordering guarantee
   * @param event The event to publish
   * @param partitionKey Key to determine ordering partition
   */
  publishOrdered<T extends DomainEvent>(
    event: T, 
    partitionKey: string
  ): Promise<Result<void, EventBusError>>
  
  /**
   * Subscribe with ordering guarantee
   * @param eventType Event type to subscribe to
   * @param handler Event handler
   * @param partitionKey Partition key for ordering
   * @param options Subscription options
   */
  subscribeOrdered<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    partitionKey: string,
    options?: SubscriptionOptions
  ): string
}

export interface ReliableEventBus extends IEventBus {
  /**
   * Publish with delivery guarantee
   * @param event Event to publish
   * @param reliability Reliability level
   */
  publishReliable<T extends DomainEvent>(
    event: T,
    reliability: ReliabilityLevel
  ): Promise<Result<DeliveryReceipt, EventBusError>>
  
  /**
   * Acknowledge event processing
   * @param eventId Event ID to acknowledge
   * @param subscriptionId Subscription that processed the event
   */
  acknowledge(eventId: string, subscriptionId: string): Promise<void>
  
  /**
   * Negative acknowledge (request redelivery)
   * @param eventId Event ID to nack
   * @param subscriptionId Subscription that failed to process
   * @param reason Reason for failure
   */
  nack(eventId: string, subscriptionId: string, reason: string): Promise<void>
}

export enum ReliabilityLevel {
  FIRE_AND_FORGET = 'fire_and_forget',
  AT_LEAST_ONCE = 'at_least_once',
  EXACTLY_ONCE = 'exactly_once'
}

export interface DeliveryReceipt {
  readonly eventId: string
  readonly deliveredAt: Date
  readonly subscriberCount: number
  readonly guaranteeLevel: ReliabilityLevel
}

// =============================================================================
// Event Bus Errors
// =============================================================================

export abstract class EventBusError extends DomainError {
  readonly domain = 'eventbus'
}

export class EventHandlerError extends EventBusError {
  readonly code = 'EVENT_HANDLER_ERROR'
  
  constructor(
    public readonly eventType: string,
    public readonly handlerId: string,
    message: string,
    cause?: Error
  ) {
    super(`Event handler ${handlerId} failed for ${eventType}: ${message}`, cause)
  }
}

export class EventTimeoutError extends EventBusError {
  readonly code = 'EVENT_TIMEOUT'
  
  constructor(
    public readonly eventType: string,
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(`Event ${eventType} processing timed out after ${timeoutMs}ms`, cause)
  }
}

export class CircuitBreakerOpenError extends EventBusError {
  readonly code = 'CIRCUIT_BREAKER_OPEN'
  
  constructor(
    public readonly handlerId: string,
    public readonly eventType: string,
    cause?: Error
  ) {
    super(`Circuit breaker open for handler ${handlerId} on event ${eventType}`, cause)
  }
}

export class DuplicateSubscriptionError extends EventBusError {
  readonly code = 'DUPLICATE_SUBSCRIPTION'
  
  constructor(
    public readonly subscriptionId: string,
    cause?: Error
  ) {
    super(`Subscription ${subscriptionId} already exists`, cause)
  }
}

export class SubscriptionNotFoundError extends EventBusError {
  readonly code = 'SUBSCRIPTION_NOT_FOUND'
  
  constructor(
    public readonly subscriptionId: string,
    cause?: Error
  ) {
    super(`Subscription ${subscriptionId} not found`, cause)
  }
}

// =============================================================================
// Validation Schemas
// =============================================================================

export const SubscriptionOptionsSchema = z.object({
  priority: z.number().int().min(0).max(100).default(0),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryDelay: z.number().int().min(0).default(1000),
  timeout: z.number().int().min(1000).default(30000),
  parallel: z.boolean().default(true),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().min(1).default(5),
    resetTimeout: z.number().int().min(1000).default(60000),
    successThreshold: z.number().int().min(1).default(3)
  }).optional()
}).partial()

export const EventHistoryQuerySchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
}).partial()

// =============================================================================
// Event Bus Factory
// =============================================================================

export interface EventBusFactory {
  /**
   * Create an in-memory event bus
   */
  createInMemory(options?: InMemoryEventBusOptions): IInMemoryEventBus
  
  /**
   * Create a persistent event bus
   */
  createPersistent(options: PersistentEventBusOptions): IPersistentEventBus
  
  /**
   * Create an ordered event bus
   */
  createOrdered(options?: OrderedEventBusOptions): OrderedEventBus
  
  /**
   * Create a reliable event bus
   */
  createReliable(options: ReliableEventBusOptions): ReliableEventBus
}

export interface InMemoryEventBusOptions {
  readonly maxEventHistory?: number
  readonly defaultTimeout?: number
  readonly enableMetrics?: boolean
}

export interface PersistentEventBusOptions {
  readonly storageConnectionString: string
  readonly tablePrefix?: string
  readonly retentionDays?: number
  readonly enableSnapshots?: boolean
}

export interface OrderedEventBusOptions {
  readonly partitionCount?: number
  readonly bufferSize?: number
  readonly maxWaitTime?: number
}

export interface ReliableEventBusOptions {
  readonly storageConnectionString: string
  readonly acknowledgmentTimeout?: number
  readonly maxRedeliveryAttempts?: number
  readonly deadLetterQueue?: boolean
}