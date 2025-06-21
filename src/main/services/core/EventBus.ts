/**
 * In-Memory Event Bus Implementation
 * 
 * Provides event-driven communication between domain services
 * with subscription management and error handling.
 */

import { v4 as uuidv4 } from 'uuid'
import {
  CircuitBreakerState,
  EventBusMetrics,
  EventHandler,
  EventHandlerError,
  EventMetric,
  EventTimeoutError,
  IInMemoryEventBus,
  SubscriptionInfo,
  SubscriptionOptions
} from '../../../shared/contracts/EventBus'
import { 
  DomainEvent, 
  Err, 
  Ok, 
  Result 
} from '../../../shared/contracts/common'

interface Subscription {
  id: string
  eventType: string
  handler: EventHandler
  options: Required<SubscriptionOptions>
  createdAt: Date
  stats: {
    handledCount: number
    errorCount: number
    lastHandled?: Date
    lastError?: Date
  }
}

interface CircuitBreaker {
  state: CircuitBreakerState
  failureCount: number
  lastFailure?: Date
  lastSuccess?: Date
  nextAttempt?: Date
}

export class EventBus implements IInMemoryEventBus {
  private static instance: EventBus | null = null
  
  private subscriptions = new Map<string, Subscription>()
  private eventTypeSubscriptions = new Map<string, Set<string>>()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private metricsData: {
    totalEventsPublished: number
    totalEventsHandled: number
    totalErrors: number
    averageHandlingTime: number
    subscriberCounts: Record<string, number>
    circuitBreakerStates: Record<string, CircuitBreakerState>
    recentEvents: EventMetric[]
  }
  private recentEvents: EventMetric[] = []
  private paused = false

  private constructor() {
    this.metricsData = {
      totalEventsPublished: 0,
      totalEventsHandled: 0,
      totalErrors: 0,
      averageHandlingTime: 0,
      subscriberCounts: {},
      circuitBreakerStates: {},
      recentEvents: []
    }

    console.log('EventBus initialized')
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T extends DomainEvent>(event: T): Promise<Result<void, any>> {
    if (this.paused) {
      return Ok(undefined)
    }

    try {
      const startTime = Date.now()
      this.metricsData.totalEventsPublished++

      const subscriptions = this.getSubscriptionsForEvent(event.type)
      
      if (subscriptions.length === 0) {
        console.log(`No subscribers for event: ${event.type}`)
        return Ok(undefined)
      }

      // Sort by priority (higher priority first)
      subscriptions.sort((a, b) => b.options.priority - a.options.priority)

      let handledCount = 0
      let errorCount = 0

      // Execute handlers
      for (const subscription of subscriptions) {
        try {
          const circuitBreaker = this.getCircuitBreaker(subscription.id)
          
          if (circuitBreaker.state === CircuitBreakerState.OPEN) {
            if (circuitBreaker.nextAttempt && new Date() < circuitBreaker.nextAttempt) {
              console.warn(`Circuit breaker open for subscription: ${subscription.id}`)
              continue
            } else {
              // Try to transition to half-open
              circuitBreaker.state = CircuitBreakerState.HALF_OPEN
            }
          }

          // Apply filter if present
          if (subscription.options.filter && !subscription.options.filter(event)) {
            continue
          }

          // Execute handler with timeout and retries
          await this.executeHandler(subscription, event)
          
          subscription.stats.handledCount++
          subscription.stats.lastHandled = new Date()
          handledCount++

          // Update circuit breaker on success
          if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
            const successThreshold = subscription.options.circuitBreaker?.successThreshold || 3
            if (!circuitBreaker.lastSuccess) circuitBreaker.lastSuccess = new Date()
            
            // Check if we've had enough successes to close
            if (handledCount >= successThreshold) {
              circuitBreaker.state = CircuitBreakerState.CLOSED
              circuitBreaker.failureCount = 0
            }
          }

        } catch (error) {
          subscription.stats.errorCount++
          subscription.stats.lastError = new Date()
          errorCount++

          console.error(`Event handler failed for ${event.type}:`, error)

          // Update circuit breaker on failure
          const circuitBreaker = this.getCircuitBreaker(subscription.id)
          circuitBreaker.failureCount++
          circuitBreaker.lastFailure = new Date()

          const failureThreshold = subscription.options.circuitBreaker?.failureThreshold || 5
          if (circuitBreaker.failureCount >= failureThreshold) {
            circuitBreaker.state = CircuitBreakerState.OPEN
            const resetTimeout = subscription.options.circuitBreaker?.resetTimeout || 60000
            circuitBreaker.nextAttempt = new Date(Date.now() + resetTimeout)
          }

          // Call error handler if available
          if (subscription.handler.onError) {
            try {
              await subscription.handler.onError(error as Error, event)
            } catch (errorHandlerError) {
              console.error('Error handler failed:', errorHandlerError)
            }
          }
        }
      }

      const processingTime = Date.now() - startTime
      this.updateMetrics(event.type, handledCount, processingTime, errorCount === 0)

      console.log(`Published event ${event.type}: ${handledCount} handled, ${errorCount} errors`)
      return Ok(undefined)

    } catch (error) {
      console.error(`Failed to publish event ${event.type}:`, error)
      return Err(error as any)
    }
  }

  /**
   * Publish an event asynchronously (fire-and-forget)
   */
  publishAsync<T extends DomainEvent>(event: T): void {
    this.publish(event).catch(error => {
      console.error(`Async event publish failed for ${event.type}:`, error)
    })
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): string {
    const subscriptionId = uuidv4()
    
    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      options: {
        priority: options?.priority ?? 0,
        maxRetries: options?.maxRetries ?? 3,
        retryDelay: options?.retryDelay ?? 1000,
        timeout: options?.timeout ?? 30000,
        parallel: options?.parallel ?? true,
        circuitBreaker: options?.circuitBreaker || { 
          failureThreshold: 5, 
          resetTimeout: 60000, 
          successThreshold: 3 
        },
        filter: options?.filter || (() => true)
      },
      createdAt: new Date(),
      stats: {
        handledCount: 0,
        errorCount: 0
      }
    }

    this.subscriptions.set(subscriptionId, subscription)

    // Add to event type index
    if (!this.eventTypeSubscriptions.has(eventType)) {
      this.eventTypeSubscriptions.set(eventType, new Set())
    }
    this.eventTypeSubscriptions.get(eventType)!.add(subscriptionId)

    // Initialize circuit breaker
    this.circuitBreakers.set(subscriptionId, {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0
    })

    console.log(`Subscribed to ${eventType} with ID: ${subscriptionId}`)
    return subscriptionId
  }

  /**
   * Subscribe to multiple event types
   */
  subscribeToMany<T extends DomainEvent>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): string {
    const subscriptionId = uuidv4()
    
    // Create subscription for each event type but share the same ID and handler
    eventTypes.forEach(eventType => {
      const subscription: Subscription = {
        id: subscriptionId,
        eventType,
        handler: handler as EventHandler,
        options: {
          priority: options?.priority ?? 0,
          maxRetries: options?.maxRetries ?? 3,
          retryDelay: options?.retryDelay ?? 1000,
          timeout: options?.timeout ?? 30000,
          parallel: options?.parallel ?? true,
          circuitBreaker: options?.circuitBreaker || { 
            failureThreshold: 5, 
            resetTimeout: 60000, 
            successThreshold: 3 
          },
          filter: options?.filter || (() => true)
        },
        createdAt: new Date(),
        stats: {
          handledCount: 0,
          errorCount: 0
        }
      }

      this.subscriptions.set(`${subscriptionId}-${eventType}`, subscription)

      if (!this.eventTypeSubscriptions.has(eventType)) {
        this.eventTypeSubscriptions.set(eventType, new Set())
      }
      this.eventTypeSubscriptions.get(eventType)!.add(`${subscriptionId}-${eventType}`)
    })

    console.log(`Subscribed to ${eventTypes.length} event types with ID: ${subscriptionId}`)
    return subscriptionId
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      this.subscriptions.delete(subscriptionId)
      
      const eventSubscriptions = this.eventTypeSubscriptions.get(subscription.eventType)
      if (eventSubscriptions) {
        eventSubscriptions.delete(subscriptionId)
        if (eventSubscriptions.size === 0) {
          this.eventTypeSubscriptions.delete(subscription.eventType)
        }
      }
      
      this.circuitBreakers.delete(subscriptionId)
      console.log(`Unsubscribed: ${subscriptionId}`)
    }
  }

  /**
   * Unsubscribe all handlers for an event type
   */
  unsubscribeAll(eventType: string): void {
    const subscriptions = this.eventTypeSubscriptions.get(eventType)
    if (subscriptions) {
      subscriptions.forEach(subscriptionId => {
        this.subscriptions.delete(subscriptionId)
        this.circuitBreakers.delete(subscriptionId)
      })
      this.eventTypeSubscriptions.delete(eventType)
      console.log(`Unsubscribed all handlers for: ${eventType}`)
    }
  }

  /**
   * Check if there are any subscribers for an event type
   */
  hasSubscribers(eventType: string): boolean {
    const subscriptions = this.eventTypeSubscriptions.get(eventType)
    return subscriptions ? subscriptions.size > 0 : false
  }

  /**
   * Get metrics about the event bus
   */
  getMetrics(): EventBusMetrics {
    // Update current subscriber counts
    this.metricsData.subscriberCounts = {}
    this.eventTypeSubscriptions.forEach((subscriptions, eventType) => {
      this.metricsData.subscriberCounts[eventType] = subscriptions.size
    })

    // Update circuit breaker states
    this.metricsData.circuitBreakerStates = {}
    this.circuitBreakers.forEach((breaker, subscriptionId) => {
      this.metricsData.circuitBreakerStates[subscriptionId] = breaker.state
    })

    this.metricsData.recentEvents = this.recentEvents.slice(-100) // Keep last 100 events

    return { ...this.metricsData }
  }

  /**
   * Clear all subscriptions and reset the bus
   */
  clear(): void {
    this.subscriptions.clear()
    this.eventTypeSubscriptions.clear()
    this.circuitBreakers.clear()
    this.recentEvents = []
    
    this.metricsData = {
      totalEventsPublished: 0,
      totalEventsHandled: 0,
      totalErrors: 0,
      averageHandlingTime: 0,
      subscriberCounts: {},
      circuitBreakerStates: {},
      recentEvents: []
    }
    
    console.log('EventBus cleared')
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): SubscriptionInfo[] {
    return Array.from(this.subscriptions.values()).map(sub => ({
      id: sub.id,
      eventType: sub.eventType,
      priority: sub.options.priority,
      options: sub.options,
      createdAt: sub.createdAt,
      handlerCount: 1
    }))
  }

  /**
   * Pause event processing
   */
  pause(): void {
    this.paused = true
    console.log('EventBus paused')
  }

  /**
   * Resume event processing
   */
  resume(): void {
    this.paused = false
    console.log('EventBus resumed')
  }

  /**
   * Check if event processing is paused
   */
  isPaused(): boolean {
    return this.paused
  }

  // Private helper methods

  private getSubscriptionsForEvent(eventType: string): Subscription[] {
    const subscriptionIds = this.eventTypeSubscriptions.get(eventType)
    if (!subscriptionIds) return []

    return Array.from(subscriptionIds)
      .map(id => this.subscriptions.get(id))
      .filter((sub): sub is Subscription => sub !== undefined)
  }

  private getCircuitBreaker(subscriptionId: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(subscriptionId)
    if (!breaker) {
      breaker = {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0
      }
      this.circuitBreakers.set(subscriptionId, breaker)
    }
    return breaker
  }

  private async executeHandler(
    subscription: Subscription, 
    event: DomainEvent
  ): Promise<void> {
    const maxRetries = subscription.options.maxRetries
    const retryDelay = subscription.options.retryDelay
    const timeout = subscription.options.timeout

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        await Promise.race([
          subscription.handler.handle(event),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new EventTimeoutError(event.type, timeout)), timeout)
          })
        ])
        
        return // Success, exit retry loop

      } catch (error) {
        if (attempt === maxRetries) {
          throw new EventHandlerError(
            event.type,
            subscription.id,
            `Handler failed after ${maxRetries + 1} attempts`,
            error as Error
          )
        }

        // Wait before retry
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
  }

  private updateMetrics(
    eventType: string, 
    handlerCount: number, 
    processingTime: number, 
    success: boolean
  ): void {
    this.metricsData.totalEventsHandled += handlerCount
    if (!success) this.metricsData.totalErrors++

    // Update average handling time
    const totalEvents = this.metricsData.totalEventsPublished
    this.metricsData.averageHandlingTime = 
      (this.metricsData.averageHandlingTime * (totalEvents - 1) + processingTime) / totalEvents

    // Add to recent events
    const eventMetric: EventMetric = {
      eventType,
      timestamp: new Date(),
      handlerCount,
      processingTime,
      success,
      error: success ? undefined : 'Handler execution failed'
    }
    
    this.recentEvents.push(eventMetric)
    
    // Keep only recent events (last 100)
    if (this.recentEvents.length > 100) {
      this.recentEvents = this.recentEvents.slice(-100)
    }
  }
}