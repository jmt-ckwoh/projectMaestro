/**
 * Tests for AgentStateMachine
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentStateMachine } from './AgentStateMachine'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'

describe('AgentStateMachine', () => {
  let stateMachine: AgentStateMachine
  
  const mockConfig = {
    initialState: AgentStatus.IDLE,
    transitions: [
      { from: AgentStatus.IDLE, to: AgentStatus.THINKING, trigger: 'start_thinking' },
      { from: AgentStatus.THINKING, to: AgentStatus.WORKING, trigger: 'start_working' },
      { from: AgentStatus.WORKING, to: AgentStatus.IDLE, trigger: 'finish_work' },
      { from: AgentStatus.IDLE, to: AgentStatus.ERROR, trigger: 'error_occurred' },
      { from: AgentStatus.ERROR, to: AgentStatus.IDLE, trigger: 'recover' }
    ]
  }
  
  beforeEach(() => {
    stateMachine = new AgentStateMachine('test-agent-id', AgentType.PRODUCER, mockConfig)
  })
  
  afterEach(() => {
    if (stateMachine && typeof stateMachine.destroy === 'function') {
      stateMachine.destroy()
    }
  })
  
  describe('initialization', () => {
    it('should initialize with idle state', () => {
      expect(stateMachine.getCurrentState()).toBe(AgentStatus.IDLE)
    })
    
    it('should check if in correct state', () => {
      expect(stateMachine.isInState(AgentStatus.IDLE)).toBe(true)
      expect(stateMachine.isInState(AgentStatus.THINKING)).toBe(false)
    })
  })
  
  describe('state transitions', () => {
    it('should transition from idle to thinking', async () => {
      const result = await stateMachine.transition(AgentStatus.THINKING, 'Processing user message')
      
      expect(result).toBe(true)
      expect(stateMachine.getCurrentState()).toBe(AgentStatus.THINKING)
    })
    
    it('should reject invalid transitions', async () => {
      const result = await stateMachine.transition(AgentStatus.WORKING, 'Invalid direct transition')
      
      expect(result).toBe(false)
      expect(stateMachine.getCurrentState()).toBe(AgentStatus.IDLE)
    })
    
    it('should emit transition events', async () => {
      const listener = vi.fn()
      stateMachine.on('state-changed', listener)
      
      await stateMachine.transition(AgentStatus.THINKING, 'Test transition')
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        previousState: AgentStatus.IDLE,
        currentState: AgentStatus.THINKING,
        reason: 'Test transition'
      }))
    })
  })
  
  describe('valid transitions', () => {
    it('should return valid transitions for idle state', () => {
      const validTransitions = stateMachine.getAllowedTransitions()
      
      expect(validTransitions).toContain(AgentStatus.THINKING)
      expect(validTransitions).toContain(AgentStatus.ERROR)
    })
    
    it('should check if transition is valid', () => {
      expect(stateMachine.canTransition(AgentStatus.THINKING)).toBe(true)
      expect(stateMachine.canTransition(AgentStatus.WORKING)).toBe(false)
    })
  })
  
  describe('state machine configuration', () => {
    it('should handle producer agent configuration', () => {
      const producerStateMachine = new AgentStateMachine('producer-id', AgentType.PRODUCER, mockConfig)
      
      expect(producerStateMachine.getCurrentState()).toBe(AgentStatus.IDLE)
      expect(producerStateMachine.canTransition(AgentStatus.THINKING)).toBe(true)
    })
    
    it('should handle engineer agent configuration', () => {
      const engineerStateMachine = new AgentStateMachine('engineer-id', AgentType.ENGINEER, mockConfig)
      
      expect(engineerStateMachine.getCurrentState()).toBe(AgentStatus.IDLE)
      expect(engineerStateMachine.canTransition(AgentStatus.THINKING)).toBe(true)
    })
  })
  
  describe('error handling', () => {
    it('should transition to error state on failure', async () => {
      await stateMachine.transition(AgentStatus.ERROR, 'Simulated failure')
      
      expect(stateMachine.getCurrentState()).toBe(AgentStatus.ERROR)
      expect(stateMachine.hasError()).toBe(true)
    })
    
    it('should recover from error state', async () => {
      await stateMachine.transition(AgentStatus.ERROR)
      
      const result = await stateMachine.transition(AgentStatus.IDLE, 'Recovery completed')
      
      expect(result).toBe(true)
      expect(stateMachine.hasError()).toBe(false)
    })
  })
  
  describe('availability', () => {
    it('should check availability correctly', () => {
      expect(stateMachine.isAvailable()).toBe(true)
      expect(stateMachine.isBusy()).toBe(false)
    })
    
    it('should be busy when thinking or working', async () => {
      await stateMachine.transition(AgentStatus.THINKING)
      expect(stateMachine.isBusy()).toBe(true)
      expect(stateMachine.isAvailable()).toBe(false)
    })
  })
})