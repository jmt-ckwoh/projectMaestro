/**
 * Agent Personality Display Component
 * 
 * Shows agent personality traits, capabilities, and context-aware suggestions
 */

import React, { useCallback, useState } from 'react'
import { cn } from '@/renderer/utils/cn'
import { AgentStatus, AgentType } from '@/shared/contracts/AgentDomain'
import { AgentAvatar } from './AgentAvatar'
import { useAgentStore } from '@/renderer/stores/agentStore'

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface AgentPersonalityProps {
  agentType: AgentType
  isRecommended?: boolean
  confidence?: number
  reasoning?: string
  className?: string
  onSelect?: (agentType: AgentType) => void
}

export interface AgentPersonalityData {
  name: string
  role: string
  personality: string[]
  capabilities: string[]
  bestFor: string[]
  communicationStyle: string
  whenToUse: string
}

// =============================================================================
// Agent Personality Configuration
// =============================================================================

const AGENT_PERSONALITIES: Record<AgentType, AgentPersonalityData> = {
  [AgentType.PRODUCER]: {
    name: 'Producer',
    role: 'Project Manager & Facilitator',
    personality: [
      'Encouraging and supportive',
      'Asks clarifying questions',
      'Breaks down complex ideas',
      'Celebrates progress',
      'Gently pushes for decisions'
    ],
    capabilities: [
      'Project planning and organization',
      'Requirement gathering and clarification',
      'Timeline and milestone management',
      'Team coordination',
      'User communication facilitation'
    ],
    bestFor: [
      'Starting new projects',
      'Unclear or vague requirements',
      'Project planning and roadmaps',
      'General questions and guidance',
      'Organizing ideas into actionable plans'
    ],
    communicationStyle: 'Conversational, friendly, and encouraging. Asks one question at a time for clarity.',
    whenToUse: 'When you need help organizing ideas, planning projects, or getting guidance on next steps.'
  },

  [AgentType.ARCHITECT]: {
    name: 'Architect',
    role: 'Technical Design & Strategy',
    personality: [
      'Systematic and methodical',
      'Considers long-term implications',
      'Focuses on scalability',
      'Detail-oriented',
      'Technology-focused'
    ],
    capabilities: [
      'System architecture design',
      'Technology selection and evaluation',
      'Scalability and performance planning',
      'Database design and data modeling',
      'API design and integration patterns'
    ],
    bestFor: [
      'System architecture decisions',
      'Technology stack selection',
      'Database and API design',
      'Scalability planning',
      'Technical reviews and assessments'
    ],
    communicationStyle: 'Technical, thorough, and systematic. Provides detailed explanations and considers trade-offs.',
    whenToUse: 'When you need technical design decisions, architecture planning, or technology recommendations.'
  },

  [AgentType.ENGINEER]: {
    name: 'Engineer',
    role: 'Implementation & Development',
    personality: [
      'Practical and hands-on',
      'Solution-oriented',
      'Code quality focused',
      'Efficient and pragmatic',
      'Problem-solving mindset'
    ],
    capabilities: [
      'Code implementation and development',
      'Algorithm design and optimization',
      'Debugging and troubleshooting',
      'Feature development',
      'Code refactoring and improvements'
    ],
    bestFor: [
      'Writing and implementing code',
      'Debugging and fixing issues',
      'Feature development',
      'Code optimization',
      'Technical problem solving'
    ],
    communicationStyle: 'Direct, practical, and code-focused. Provides working examples and clear implementations.',
    whenToUse: 'When you need actual code written, bugs fixed, or features implemented.'
  },

  [AgentType.QA]: {
    name: 'QA Specialist',
    role: 'Testing & Quality Assurance',
    personality: [
      'Detail-oriented and thorough',
      'Quality-focused',
      'Risk-aware',
      'Systematic tester',
      'User-experience minded'
    ],
    capabilities: [
      'Test planning and execution',
      'Bug detection and reporting',
      'Quality assurance processes',
      'Test automation strategies',
      'Requirements validation'
    ],
    bestFor: [
      'Testing strategies and plans',
      'Quality assurance reviews',
      'Bug identification and fixing',
      'Test automation',
      'Requirements validation'
    ],
    communicationStyle: 'Thorough, systematic, and quality-focused. Identifies potential issues and edge cases.',
    whenToUse: 'When you need testing strategies, quality reviews, or help ensuring your project meets standards.'
  }
}

// =============================================================================
// Agent Personality Component
// =============================================================================

export const AgentPersonality: React.FC<AgentPersonalityProps> = ({
  agentType,
  isRecommended = false,
  confidence,
  reasoning,
  className,
  onSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { agents, statuses } = useAgentStore()
  
  const personality = AGENT_PERSONALITIES[agentType]
  const agent = agents.find(a => a.type === agentType)
  const status = agent ? statuses[agent.id] : AgentStatus.OFFLINE

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  const handleSelectAgent = useCallback(() => {
    onSelect?.(agentType)
  }, [agentType, onSelect])

  return (
    <div
      className={cn(
        'border rounded-lg bg-white transition-all duration-200',
        isRecommended 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300',
        isExpanded && 'shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AgentAvatar
              type={agentType}
              status={status}
              size="md"
              showStatus={true}
              animated={status !== AgentStatus.IDLE}
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {personality.name}
                </h3>
                {isRecommended && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {personality.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {confidence !== undefined && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {Math.round(confidence * 100)}%
                </div>
                <div className="text-xs text-gray-500">match</div>
              </div>
            )}
            
            <button
              onClick={handleToggleExpand}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              <svg 
                className={cn(
                  'w-4 h-4 text-gray-600 transition-transform',
                  isExpanded && 'rotate-180'
                )}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
            <strong>Why this agent:</strong> {reasoning}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSelectAgent}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              isRecommended
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Select {personality.name}
          </button>
          
          <button
            onClick={handleToggleExpand}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? 'Less Info' : 'More Info'}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Communication Style */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Communication Style
            </h4>
            <p className="text-sm text-gray-700">
              {personality.communicationStyle}
            </p>
          </div>

          {/* When to Use */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              When to Use
            </h4>
            <p className="text-sm text-gray-700">
              {personality.whenToUse}
            </p>
          </div>

          {/* Personality Traits */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Personality Traits
            </h4>
            <div className="flex flex-wrap gap-1">
              {personality.personality.map((trait, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* Best For */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Best For
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {personality.bestFor.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Core Capabilities */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Core Capabilities
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {personality.capabilities.map((capability, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Agent Recommendation Panel
// =============================================================================

export interface AgentRecommendationPanelProps {
  recommendations: Array<{
    agentType: AgentType
    confidence: number
    reasoning: string
    isRecommended: boolean
  }>
  onSelectAgent: (agentType: AgentType) => void
  className?: string
}

export const AgentRecommendationPanel: React.FC<AgentRecommendationPanelProps> = ({
  recommendations,
  onSelectAgent,
  className
}) => {
  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-900">
          Agent Recommendations
        </h3>
      </div>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <AgentPersonality
            key={rec.agentType}
            agentType={rec.agentType}
            confidence={rec.confidence}
            reasoning={rec.reasoning}
            isRecommended={rec.isRecommended}
            onSelect={onSelectAgent}
          />
        ))}
      </div>
    </div>
  )
}