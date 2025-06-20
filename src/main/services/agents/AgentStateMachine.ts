/**
 * Agent State Machine
 * 
 * Enforces valid state transitions and prevents invalid agent states.
 * This prevents chaos in agent coordination by ensuring predictable behavior.
 */

import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'
import { EventEmitter } from 'events'

// =============================================================================
// State Machine Definition
// =============================================================================

export interface StateTransition {
  readonly from: AgentStatus
  readonly to: AgentStatus
  readonly trigger: string
  readonly guard?: (context: TransitionContext) => boolean
  readonly action?: (context: TransitionContext) => Promise<void>
}

export interface TransitionContext {
  readonly agentId: string
  readonly agentType: AgentType
  readonly previousState: AgentStatus
  readonly timestamp: Date
  readonly reason?: string
  readonly metadata?: Record<string, unknown>
}

export interface StateMachineConfig {
  readonly initialState: AgentStatus
  readonly transitions: StateTransition[]
  readonly timeouts?: StateTimeout[]
  readonly onInvalidTransition?: (context: TransitionContext) => void
}

export interface StateTimeout {
  readonly state: AgentStatus
  readonly timeoutMs: number
  readonly targetState: AgentStatus
  readonly condition?: (context: TransitionContext) => boolean
}

// =============================================================================
// Agent State Machine Implementation
// =============================================================================

export class AgentStateMachine extends EventEmitter {
  private currentState: AgentStatus
  private readonly config: StateMachineConfig
  private readonly agentId: string
  private readonly agentType: AgentType
  private timeoutHandle?: NodeJS.Timeout
  private readonly transitionHistory: TransitionContext[] = []

  constructor(
    agentId: string,
    agentType: AgentType,
    config: StateMachineConfig,
    initialState?: AgentStatus
  ) {
    super()
    this.agentId = agentId
    this.agentType = agentType
    this.config = config
    this.currentState = initialState ?? config.initialState
    
    this.setupTimeouts()
  }

  // =============================================================================
  // State Queries
  // =============================================================================

  getCurrentState(): AgentStatus {
    return this.currentState
  }

  getAllowedTransitions(): AgentStatus[] {
    return this.config.transitions
      .filter(t => t.from === this.currentState)
      .filter(t => !t.guard || t.guard(this.createContext(t.to)))
      .map(t => t.to)
  }

  canTransition(toState: AgentStatus, reason?: string): boolean {
    const transition = this.findTransition(this.currentState, toState)
    if (!transition) {
      return false
    }

    if (transition.guard) {
      const context = this.createContext(toState, reason)
      return transition.guard(context)
    }

    return true
  }

  isInState(state: AgentStatus): boolean {
    return this.currentState === state
  }

  isAvailable(): boolean {
    return this.currentState === AgentStatus.IDLE
  }

  isBusy(): boolean {
    return [AgentStatus.THINKING, AgentStatus.WORKING].includes(this.currentState)
  }

  hasError(): boolean {
    return this.currentState === AgentStatus.ERROR
  }

  // =============================================================================
  // State Transitions
  // =============================================================================

  async transition(toState: AgentStatus, reason?: string): Promise<boolean> {
    const transition = this.findTransition(this.currentState, toState)
    
    if (!transition) {
      this.handleInvalidTransition(toState, `No transition defined from ${this.currentState} to ${toState}`)
      return false
    }

    const context = this.createContext(toState, reason)

    // Check guard condition
    if (transition.guard && !transition.guard(context)) {
      this.handleInvalidTransition(toState, `Guard condition failed for ${this.currentState} -> ${toState}`)
      return false
    }

    // Record transition
    const previousState = this.currentState
    this.currentState = toState
    this.addToHistory(context)

    // Clear existing timeout
    this.clearTimeout()

    // Execute transition action
    if (transition.action) {
      try {
        await transition.action(context)
      } catch (error) {
        // Rollback on action failure
        this.currentState = previousState
        this.emit('transition-error', {
          agentId: this.agentId,
          from: previousState,
          to: toState,
          error,
          context
        })
        return false
      }
    }

    // Set up timeout for new state
    this.setupTimeouts()

    // Emit transition event
    this.emit('state-changed', {
      agentId: this.agentId,
      agentType: this.agentType,
      previousState,
      currentState: this.currentState,
      reason,
      timestamp: new Date()
    })

    return true
  }

  async forceTransition(toState: AgentStatus, reason: string): Promise<void> {
    const previousState = this.currentState
    this.currentState = toState
    
    const context = this.createContext(toState, reason)
    this.addToHistory(context)
    
    this.clearTimeout()
    this.setupTimeouts()
    
    this.emit('state-changed', {
      agentId: this.agentId,
      agentType: this.agentType,
      previousState,
      currentState: this.currentState,
      reason: `FORCED: ${reason}`,
      timestamp: new Date()
    })
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private findTransition(from: AgentStatus, to: AgentStatus): StateTransition | undefined {
    return this.config.transitions.find(t => t.from === from && t.to === to)
  }

  private createContext(_toState: AgentStatus, reason?: string): TransitionContext {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      previousState: this.currentState,
      timestamp: new Date(),
      reason
    }
  }

  private addToHistory(context: TransitionContext): void {
    this.transitionHistory.push(context)
    
    // Keep only last 100 transitions
    if (this.transitionHistory.length > 100) {
      this.transitionHistory.shift()
    }
  }

  private handleInvalidTransition(toState: AgentStatus, reason: string): void {
    const context = this.createContext(toState, reason)
    
    this.emit('invalid-transition', {
      agentId: this.agentId,
      from: this.currentState,
      to: toState,
      reason,
      context
    })

    if (this.config.onInvalidTransition) {
      this.config.onInvalidTransition(context)
    }
  }

  private setupTimeouts(): void {
    this.clearTimeout()
    
    const timeout = this.config.timeouts?.find(t => t.state === this.currentState)
    if (!timeout) {
      return
    }

    const context = this.createContext(timeout.targetState, 'Timeout')
    if (timeout.condition && !timeout.condition(context)) {
      return
    }

    this.timeoutHandle = setTimeout(async () => {
      await this.transition(timeout.targetState, `Timeout after ${timeout.timeoutMs}ms in ${this.currentState}`)
    }, timeout.timeoutMs)
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = undefined
    }
  }

  getTransitionHistory(): readonly TransitionContext[] {
    return [...this.transitionHistory]
  }

  destroy(): void {
    this.clearTimeout()
    this.removeAllListeners()
  }
}

// =============================================================================
// Predefined State Machine Configurations
// =============================================================================

/**
 * Standard Agent State Machine
 * Covers the most common agent lifecycle patterns
 */
export const STANDARD_AGENT_STATE_MACHINE: StateMachineConfig = {
  initialState: AgentStatus.IDLE,
  
  transitions: [
    // From IDLE
    {
      from: AgentStatus.IDLE,
      to: AgentStatus.THINKING,
      trigger: 'message_received',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.IDLE,
      to: AgentStatus.OFFLINE,
      trigger: 'disable_agent',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.IDLE,
      to: AgentStatus.ERROR,
      trigger: 'error_occurred',
      guard: (_ctx) => true
    },

    // From THINKING
    {
      from: AgentStatus.THINKING,
      to: AgentStatus.WORKING,
      trigger: 'start_work',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.THINKING,
      to: AgentStatus.WAITING,
      trigger: 'need_input',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.THINKING,
      to: AgentStatus.IDLE,
      trigger: 'task_completed',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.THINKING,
      to: AgentStatus.ERROR,
      trigger: 'error_occurred',
      guard: (_ctx) => true
    },

    // From WORKING
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.THINKING,
      trigger: 'need_planning',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.WAITING,
      trigger: 'need_input',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.IDLE,
      trigger: 'task_completed',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.ERROR,
      trigger: 'error_occurred',
      guard: (_ctx) => true
    },

    // From WAITING
    {
      from: AgentStatus.WAITING,
      to: AgentStatus.THINKING,
      trigger: 'input_received',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.WAITING,
      to: AgentStatus.IDLE,
      trigger: 'task_cancelled',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.WAITING,
      to: AgentStatus.ERROR,
      trigger: 'error_occurred',
      guard: (_ctx) => true
    },

    // From ERROR
    {
      from: AgentStatus.ERROR,
      to: AgentStatus.IDLE,
      trigger: 'error_resolved',
      guard: (_ctx) => true
    },
    {
      from: AgentStatus.ERROR,
      to: AgentStatus.OFFLINE,
      trigger: 'disable_agent',
      guard: (_ctx) => true
    },

    // From OFFLINE
    {
      from: AgentStatus.OFFLINE,
      to: AgentStatus.IDLE,
      trigger: 'enable_agent',
      guard: (_ctx) => true
    }
  ],

  timeouts: [
    {
      state: AgentStatus.THINKING,
      timeoutMs: 30000, // 30 seconds
      targetState: AgentStatus.ERROR,
      condition: (_ctx) => true
    },
    {
      state: AgentStatus.WORKING,
      timeoutMs: 300000, // 5 minutes
      targetState: AgentStatus.ERROR,
      condition: (_ctx) => true
    },
    {
      state: AgentStatus.WAITING,
      timeoutMs: 600000, // 10 minutes
      targetState: AgentStatus.IDLE,
      condition: (_ctx) => true
    }
  ],

  onInvalidTransition: (ctx) => {
    console.warn(`Invalid transition for agent ${ctx.agentId}: ${ctx.previousState} -> attempted transition`)
  }
}

/**
 * Producer Agent State Machine
 * Specialized for producer workflow patterns
 */
export const PRODUCER_AGENT_STATE_MACHINE: StateMachineConfig = {
  ...STANDARD_AGENT_STATE_MACHINE,
  
  timeouts: [
    {
      state: AgentStatus.THINKING,
      timeoutMs: 15000, // Faster thinking for producer
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WORKING,
      timeoutMs: 120000, // 2 minutes for producer tasks
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WAITING,
      timeoutMs: 1800000, // 30 minutes - producers wait longer for user input
      targetState: AgentStatus.IDLE
    }
  ]
}

/**
 * Engineer Agent State Machine
 * Specialized for code generation patterns
 */
export const ENGINEER_AGENT_STATE_MACHINE: StateMachineConfig = {
  ...STANDARD_AGENT_STATE_MACHINE,
  
  transitions: [
    ...STANDARD_AGENT_STATE_MACHINE.transitions,
    
    // Engineer-specific: Pairing with QA
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.WAITING,
      trigger: 'request_qa_review',
      guard: (_ctx) => true
    }
  ],
  
  timeouts: [
    {
      state: AgentStatus.THINKING,
      timeoutMs: 45000, // More time for code planning
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WORKING,
      timeoutMs: 600000, // 10 minutes for coding tasks
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WAITING,
      timeoutMs: 300000, // 5 minutes waiting for QA
      targetState: AgentStatus.IDLE
    }
  ]
}

/**
 * QA Agent State Machine
 * Specialized for testing and debugging patterns
 */
export const QA_AGENT_STATE_MACHINE: StateMachineConfig = {
  ...STANDARD_AGENT_STATE_MACHINE,
  
  transitions: [
    ...STANDARD_AGENT_STATE_MACHINE.transitions,
    
    // QA-specific: Bug investigation mode
    {
      from: AgentStatus.WORKING,
      to: AgentStatus.THINKING,
      trigger: 'investigation_needed',
      guard: (_ctx) => true
    }
  ],
  
  timeouts: [
    {
      state: AgentStatus.THINKING,
      timeoutMs: 60000, // More time for test planning
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WORKING,
      timeoutMs: 480000, // 8 minutes for testing tasks
      targetState: AgentStatus.ERROR
    },
    {
      state: AgentStatus.WAITING,
      timeoutMs: 180000, // 3 minutes waiting for test results
      targetState: AgentStatus.IDLE
    }
  ]
}

// =============================================================================
// State Machine Factory
// =============================================================================

export class AgentStateMachineFactory {
  static create(
    agentId: string,
    agentType: AgentType,
    initialState?: AgentStatus
  ): AgentStateMachine {
    const config = this.getConfigForAgentType(agentType)
    return new AgentStateMachine(agentId, agentType, config, initialState)
  }

  private static getConfigForAgentType(agentType: AgentType): StateMachineConfig {
    switch (agentType) {
      case AgentType.PRODUCER:
        return PRODUCER_AGENT_STATE_MACHINE
      case AgentType.ENGINEER:
        return ENGINEER_AGENT_STATE_MACHINE
      case AgentType.QA:
        return QA_AGENT_STATE_MACHINE
      case AgentType.ARCHITECT:
      default:
        return STANDARD_AGENT_STATE_MACHINE
    }
  }
}

// =============================================================================
// State Machine Manager
// =============================================================================

export class AgentStateMachineManager {
  private readonly stateMachines = new Map<string, AgentStateMachine>()

  getOrCreate(agentId: string, agentType: AgentType): AgentStateMachine {
    let stateMachine = this.stateMachines.get(agentId)
    
    if (!stateMachine) {
      stateMachine = AgentStateMachineFactory.create(agentId, agentType)
      this.stateMachines.set(agentId, stateMachine)
      
      // Forward events
      stateMachine.on('state-changed', (event) => {
        // Could emit to event bus here
        console.log(`Agent ${agentId} state changed: ${event.previousState} -> ${event.currentState}`)
      })
      
      stateMachine.on('invalid-transition', (event) => {
        console.warn(`Invalid transition attempted for agent ${agentId}:`, event)
      })
    }
    
    return stateMachine
  }

  get(agentId: string): AgentStateMachine | undefined {
    return this.stateMachines.get(agentId)
  }

  getAllStates(): Record<string, AgentStatus> {
    const states: Record<string, AgentStatus> = {}
    
    for (const [agentId, stateMachine] of this.stateMachines) {
      states[agentId] = stateMachine.getCurrentState()
    }
    
    return states
  }

  destroy(agentId: string): void {
    const stateMachine = this.stateMachines.get(agentId)
    if (stateMachine) {
      stateMachine.destroy()
      this.stateMachines.delete(agentId)
    }
  }

  destroyAll(): void {
    for (const [_agentId, stateMachine] of this.stateMachines) {
      stateMachine.destroy()
    }
    this.stateMachines.clear()
  }
}