/**
 * Domain Service Contracts
 * 
 * These interfaces define the boundaries between domains and enforce
 * consistent patterns across the application. All domain services must
 * implement these contracts to maintain architectural integrity.
 */

export * from './AgentDomain'
export * from './ProjectDomain'  
export * from './MemoryDomain'
export * from './GitDomain'
export * from './common'
export type { IEventBus, EventBusError, SubscriptionOptions } from './EventBus'