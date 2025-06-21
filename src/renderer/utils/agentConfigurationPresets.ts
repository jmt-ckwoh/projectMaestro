/**
 * Agent Configuration Presets
 * 
 * Epic 3 Story 3.2: Agent Configuration and Customization
 * Predefined configuration templates for different use cases
 */

import { AgentConfiguration } from '@/renderer/stores/agentStore'
import { AgentType } from '@/shared/contracts/AgentDomain'

// =============================================================================
// Configuration Preset Types
// =============================================================================

export interface ConfigurationPreset {
  id: string
  name: string
  description: string
  category: 'communication' | 'workflow' | 'personality' | 'complete'
  applicableAgents: AgentType[]
  configuration: Partial<AgentConfiguration>
}

// =============================================================================
// Predefined Configuration Presets
// =============================================================================

export const CONFIGURATION_PRESETS: ConfigurationPreset[] = [
  // Communication Style Presets
  {
    id: 'formal-corporate',
    name: 'Formal Corporate',
    description: 'Professional, structured communication for enterprise environments',
    category: 'communication',
    applicableAgents: [AgentType.PRODUCER, AgentType.ARCHITECT, AgentType.ENGINEER, AgentType.QA],
    configuration: {
      communicationStyle: 'formal',
      verbosity: 'balanced',
      autonomyLevel: 'medium',
      questionFrequency: 'minimal',
      proactiveness: 40,
      creativity: 30,
      riskTolerance: 20
    }
  },
  {
    id: 'casual-startup',
    name: 'Casual Startup',
    description: 'Friendly, fast-paced communication for startup environments',
    category: 'communication',
    applicableAgents: [AgentType.PRODUCER, AgentType.ARCHITECT, AgentType.ENGINEER, AgentType.QA],
    configuration: {
      communicationStyle: 'casual',
      verbosity: 'concise',
      autonomyLevel: 'high',
      questionFrequency: 'normal',
      proactiveness: 70,
      creativity: 60,
      riskTolerance: 50
    }
  },
  {
    id: 'consultative',
    name: 'Consultative Style',
    description: 'Thoughtful, question-driven approach for complex projects',
    category: 'communication',
    applicableAgents: [AgentType.PRODUCER, AgentType.ARCHITECT],
    configuration: {
      communicationStyle: 'professional',
      verbosity: 'verbose',
      autonomyLevel: 'low',
      questionFrequency: 'frequent',
      proactiveness: 60,
      creativity: 40,
      riskTolerance: 30
    }
  },

  // Workflow Presets
  {
    id: 'rapid-iteration',
    name: 'Rapid Iteration',
    description: 'Fast-paced development with quick decisions and minimal overhead',
    category: 'workflow',
    applicableAgents: [AgentType.ENGINEER, AgentType.QA],
    configuration: {
      autonomyLevel: 'high',
      questionFrequency: 'minimal',
      proactiveness: 80,
      creativity: 50,
      riskTolerance: 60,
      maxResponseLength: 1500,
      temperatureSetting: 0.6
    }
  },
  {
    id: 'quality-focused',
    name: 'Quality Focused',
    description: 'Thorough, careful approach prioritizing quality over speed',
    category: 'workflow',
    applicableAgents: [AgentType.ARCHITECT, AgentType.QA],
    configuration: {
      autonomyLevel: 'medium',
      questionFrequency: 'frequent',
      proactiveness: 50,
      creativity: 30,
      riskTolerance: 20,
      maxResponseLength: 3000,
      temperatureSetting: 0.4
    }
  },
  {
    id: 'balanced-development',
    name: 'Balanced Development',
    description: 'Well-rounded approach balancing speed, quality, and innovation',
    category: 'workflow',
    applicableAgents: [AgentType.PRODUCER, AgentType.ARCHITECT, AgentType.ENGINEER, AgentType.QA],
    configuration: {
      autonomyLevel: 'medium',
      questionFrequency: 'normal',
      proactiveness: 50,
      creativity: 50,
      riskTolerance: 40,
      maxResponseLength: 2000,
      temperatureSetting: 0.7
    }
  },

  // Personality Presets
  {
    id: 'creative-innovator',
    name: 'Creative Innovator',
    description: 'High creativity and risk tolerance for innovative solutions',
    category: 'personality',
    applicableAgents: [AgentType.ARCHITECT, AgentType.ENGINEER],
    configuration: {
      creativity: 85,
      riskTolerance: 70,
      proactiveness: 75,
      autonomyLevel: 'high',
      temperatureSetting: 0.9
    }
  },
  {
    id: 'reliable-executor',
    name: 'Reliable Executor',
    description: 'Consistent, dependable approach focused on proven solutions',
    category: 'personality',
    applicableAgents: [AgentType.ENGINEER, AgentType.QA],
    configuration: {
      creativity: 25,
      riskTolerance: 20,
      proactiveness: 40,
      autonomyLevel: 'medium',
      temperatureSetting: 0.3
    }
  },
  {
    id: 'collaborative-guide',
    name: 'Collaborative Guide',
    description: 'Supportive, question-driven approach that facilitates team collaboration',
    category: 'personality',
    applicableAgents: [AgentType.PRODUCER, AgentType.ARCHITECT],
    configuration: {
      questionFrequency: 'frequent',
      autonomyLevel: 'low',
      proactiveness: 60,
      creativity: 50,
      communicationStyle: 'friendly'
    }
  },

  // Complete Configuration Presets
  {
    id: 'agile-producer',
    name: 'Agile Producer',
    description: 'Complete configuration for agile project management',
    category: 'complete',
    applicableAgents: [AgentType.PRODUCER],
    configuration: {
      communicationStyle: 'friendly',
      verbosity: 'balanced',
      autonomyLevel: 'medium',
      questionFrequency: 'normal',
      proactiveness: 70,
      creativity: 50,
      riskTolerance: 40,
      maxResponseLength: 2000,
      temperatureSetting: 0.7,
      notifications: {
        statusChanges: true,
        taskAssignments: true,
        completions: true,
        errors: true
      }
    }
  },
  {
    id: 'senior-architect',
    name: 'Senior Architect',
    description: 'Complete configuration for experienced technical leadership',
    category: 'complete',
    applicableAgents: [AgentType.ARCHITECT],
    configuration: {
      communicationStyle: 'professional',
      verbosity: 'verbose',
      autonomyLevel: 'high',
      questionFrequency: 'normal',
      proactiveness: 60,
      creativity: 60,
      riskTolerance: 40,
      maxResponseLength: 3000,
      temperatureSetting: 0.6,
      notifications: {
        statusChanges: true,
        taskAssignments: true,
        completions: false,
        errors: true
      }
    }
  },
  {
    id: 'full-stack-engineer',
    name: 'Full-Stack Engineer',
    description: 'Complete configuration for versatile development work',
    category: 'complete',
    applicableAgents: [AgentType.ENGINEER],
    configuration: {
      communicationStyle: 'casual',
      verbosity: 'balanced',
      autonomyLevel: 'high',
      questionFrequency: 'minimal',
      proactiveness: 75,
      creativity: 65,
      riskTolerance: 50,
      maxResponseLength: 2500,
      temperatureSetting: 0.7,
      notifications: {
        statusChanges: false,
        taskAssignments: true,
        completions: true,
        errors: true
      }
    }
  },
  {
    id: 'qa-specialist',
    name: 'QA Specialist',
    description: 'Complete configuration for thorough quality assurance',
    category: 'complete',
    applicableAgents: [AgentType.QA],
    configuration: {
      communicationStyle: 'professional',
      verbosity: 'verbose',
      autonomyLevel: 'medium',
      questionFrequency: 'frequent',
      proactiveness: 55,
      creativity: 35,
      riskTolerance: 25,
      maxResponseLength: 2500,
      temperatureSetting: 0.4,
      notifications: {
        statusChanges: true,
        taskAssignments: true,
        completions: true,
        errors: true
      }
    }
  }
]

// =============================================================================
// Preset Utility Functions
// =============================================================================

/**
 * Get presets applicable to a specific agent type
 */
export function getPresetsForAgentType(agentType: AgentType): ConfigurationPreset[] {
  return CONFIGURATION_PRESETS.filter(preset => 
    preset.applicableAgents.includes(agentType)
  )
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: ConfigurationPreset['category']): ConfigurationPreset[] {
  return CONFIGURATION_PRESETS.filter(preset => preset.category === category)
}

/**
 * Find preset by ID
 */
export function getPresetById(id: string): ConfigurationPreset | undefined {
  return CONFIGURATION_PRESETS.find(preset => preset.id === id)
}

/**
 * Apply preset to existing configuration
 */
export function applyPresetToConfiguration(
  currentConfig: AgentConfiguration,
  preset: ConfigurationPreset
): AgentConfiguration {
  return {
    ...currentConfig,
    ...preset.configuration
  }
}

/**
 * Get preset categories with counts
 */
export function getPresetCategories(): Array<{
  category: ConfigurationPreset['category']
  label: string
  count: number
}> {
  const categories = ['communication', 'workflow', 'personality', 'complete'] as const
  
  return categories.map(category => ({
    category,
    label: category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' '),
    count: getPresetsByCategory(category).length
  }))
}

/**
 * Create custom preset from current configuration
 */
export function createCustomPreset(
  name: string,
  description: string,
  agentType: AgentType,
  configuration: AgentConfiguration
): ConfigurationPreset {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    category: 'complete',
    applicableAgents: [agentType],
    configuration
  }
}