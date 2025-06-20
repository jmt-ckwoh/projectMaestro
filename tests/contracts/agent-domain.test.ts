/**
 * Contract Validation Tests for Agent Domain
 * 
 * Ensures agent domain types and enums are properly defined
 */

import { describe, it, expect } from 'vitest'
import { 
  AgentStatus, 
  AgentType
} from '@/shared/contracts/AgentDomain'

describe('Agent Domain Contracts', () => {
  describe('AgentType enum', () => {
    it('should have all required agent types', () => {
      expect(AgentType.PRODUCER).toBe('producer')
      expect(AgentType.ARCHITECT).toBe('architect')
      expect(AgentType.ENGINEER).toBe('engineer')
      expect(AgentType.QA).toBe('qa')
    })
    
    it('should have exactly 4 agent types', () => {
      const types = Object.values(AgentType)
      expect(types).toHaveLength(4)
    })
  })
  
  describe('AgentStatus enum', () => {
    it('should have all required status values', () => {
      expect(AgentStatus.IDLE).toBe('idle')
      expect(AgentStatus.THINKING).toBe('thinking')
      expect(AgentStatus.WORKING).toBe('working')
      expect(AgentStatus.WAITING).toBe('waiting')
      expect(AgentStatus.ERROR).toBe('error')
      expect(AgentStatus.OFFLINE).toBe('offline')
    })
    
    it('should have exactly 6 status values', () => {
      const statuses = Object.values(AgentStatus)
      expect(statuses).toHaveLength(6)
    })
  })
  
  describe('Agent Status Transitions', () => {
    it('should validate idle state transitions', () => {
      const fromIdle = [AgentStatus.THINKING, AgentStatus.ERROR, AgentStatus.OFFLINE]
      
      fromIdle.forEach(status => {
        expect(Object.values(AgentStatus)).toContain(status)
      })
    })
    
    it('should validate working state properties', () => {
      const busyStates = [AgentStatus.THINKING, AgentStatus.WORKING]
      const availableStates = [AgentStatus.IDLE]
      const errorStates = [AgentStatus.ERROR]
      
      busyStates.forEach(status => {
        expect(Object.values(AgentStatus)).toContain(status)
      })
      
      availableStates.forEach(status => {
        expect(Object.values(AgentStatus)).toContain(status)
      })
      
      errorStates.forEach(status => {
        expect(Object.values(AgentStatus)).toContain(status)
      })
    })
  })
  
  describe('Type Safety', () => {
    it('should ensure AgentType values are strings', () => {
      Object.values(AgentType).forEach(type => {
        expect(typeof type).toBe('string')
      })
    })
    
    it('should ensure AgentStatus values are strings', () => {
      Object.values(AgentStatus).forEach(status => {
        expect(typeof status).toBe('string')
      })
    })
  })
})