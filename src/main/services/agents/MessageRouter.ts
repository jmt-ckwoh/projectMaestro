/**
 * Message Router Service
 * 
 * Context-aware agent routing system that analyzes user messages and determines
 * which agent should respond based on content, intent, and project context.
 */

import { AgentType } from '@/shared/contracts/AgentDomain'
import { DomainError, Err, GenericDomainError, Ok, Result } from '@/shared/contracts/common'
import { IMemoryDomainService } from '@/shared/contracts/MemoryDomain'

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface MessageContext {
  readonly content: string
  readonly projectId?: string
  readonly taskId?: string
  readonly conversationHistory: string[]
  readonly recentMemories?: string[]
  readonly userIntent?: UserIntent
}

export enum UserIntent {
  PROJECT_PLANNING = 'project_planning',
  TECHNICAL_DESIGN = 'technical_design', 
  CODE_IMPLEMENTATION = 'code_implementation',
  TESTING_QA = 'testing_qa',
  GENERAL_QUESTION = 'general_question',
  CLARIFICATION = 'clarification',
  DEBUGGING = 'debugging',
  ARCHITECTURE_REVIEW = 'architecture_review',
  PROJECT_STATUS = 'project_status'
}

export interface RoutingResult {
  readonly primaryAgent: AgentType
  readonly secondaryAgents: AgentType[]
  readonly confidence: number
  readonly reasoning: string
  readonly suggestedResponse?: string
}

export interface AgentCapabilities {
  readonly expertise: string[]
  readonly keywords: string[]
  readonly intentMatches: UserIntent[]
  readonly confidence: (context: MessageContext) => number
}

// =============================================================================
// Message Router Implementation
// =============================================================================

export class MessageRouter {
  private readonly agentCapabilities: Record<AgentType, AgentCapabilities>
  private readonly intentClassifier: IntentClassifier

  constructor(
    private readonly memoryService?: IMemoryDomainService
  ) {
    this.agentCapabilities = this.initializeAgentCapabilities()
    this.intentClassifier = new IntentClassifier()
  }

  // =============================================================================
  // Public API
  // =============================================================================

  async routeMessage(context: MessageContext): Promise<Result<RoutingResult, DomainError>> {
    try {
      // 1. Classify user intent
      const intent = await this.classifyIntent(context)
      const enhancedContext = { ...context, userIntent: intent }

      // 2. Search for relevant memories to enhance context
      const memories = await this.getRelevantMemories(enhancedContext)
      const contextWithMemories = { ...enhancedContext, recentMemories: memories }

      // 3. Calculate agent confidence scores
      const scores = await this.calculateAgentConfidence(contextWithMemories)

      // 4. Determine routing result
      const routing = this.determineRouting(scores, contextWithMemories)

      return Ok(routing)
    } catch (error) {
      return Err(new GenericDomainError(
        'MESSAGE_ROUTING_FAILED',
        'agent',
        'Failed to route message',
        error as Error
      ))
    }
  }

  async routeWithExplicitTarget(
    targetAgent: AgentType,
    context: MessageContext
  ): Promise<Result<RoutingResult, DomainError>> {
    try {
      const intent = await this.classifyIntent(context)
      const capabilities = this.agentCapabilities[targetAgent]
      
      // Calculate confidence for explicit targeting
      const confidence = capabilities.confidence({ ...context, userIntent: intent })
      
      return Ok({
        primaryAgent: targetAgent,
        secondaryAgents: [],
        confidence,
        reasoning: `Explicitly targeted to ${targetAgent}`,
        suggestedResponse: this.generateSuggestedResponse(targetAgent, context)
      })
    } catch (error) {
      return Err(new GenericDomainError(
        'EXPLICIT_ROUTING_FAILED',
        'agent',
        'Failed to route to explicit target',
        error as Error
      ))
    }
  }

  // =============================================================================
  // Intent Classification
  // =============================================================================

  private async classifyIntent(context: MessageContext): Promise<UserIntent> {
    return this.intentClassifier.classify(context)
  }

  // =============================================================================
  // Agent Confidence Calculation
  // =============================================================================

  private async calculateAgentConfidence(
    context: MessageContext
  ): Promise<Record<AgentType, number>> {
    const scores: Record<AgentType, number> = {} as Record<AgentType, number>

    for (const [agentType, capabilities] of Object.entries(this.agentCapabilities)) {
      scores[agentType as AgentType] = capabilities.confidence(context)
    }

    return scores
  }

  // =============================================================================
  // Routing Decision Logic
  // =============================================================================

  private determineRouting(
    scores: Record<AgentType, number>,
    context: MessageContext
  ): RoutingResult {
    // Sort agents by confidence score
    const sortedAgents = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([agentType]) => agentType as AgentType)

    const primaryAgent = sortedAgents[0]
    const primaryScore = scores[primaryAgent]

    // Determine if collaboration is needed
    const secondaryAgents = this.determineSecondaryAgents(scores, context, primaryScore)

    const reasoning = this.generateRoutingReasoning(
      primaryAgent,
      primaryScore,
      secondaryAgents,
      context
    )

    return {
      primaryAgent,
      secondaryAgents,
      confidence: primaryScore,
      reasoning,
      suggestedResponse: this.generateSuggestedResponse(primaryAgent, context)
    }
  }

  private determineSecondaryAgents(
    scores: Record<AgentType, number>,
    _context: MessageContext,
    primaryScore: number
  ): AgentType[] {
    const secondaryThreshold = 0.7
    const collaborationThreshold = 0.8

    // If primary agent has high confidence, no collaboration needed
    if (primaryScore >= collaborationThreshold) {
      return []
    }

    // Find agents with scores above secondary threshold
    return Object.entries(scores)
      .filter(([agentType, score]) => 
        score >= secondaryThreshold && 
        agentType !== Object.keys(scores)[0] // Not the primary agent
      )
      .map(([agentType]) => agentType as AgentType)
      .slice(0, 2) // Max 2 secondary agents
  }

  // =============================================================================
  // Memory Integration
  // =============================================================================

  private async getRelevantMemories(context: MessageContext): Promise<string[]> {
    if (!this.memoryService || !context.projectId) {
      return []
    }

    try {
      const searchResult = await this.memoryService.searchMemories({
        query: context.content,
        projectId: context.projectId,
        limit: 3,
        threshold: 0.7
      })

      if (searchResult.success) {
        return searchResult.data.map(memory => memory.memory.content)
      }
    } catch (error) {
      console.warn('Failed to fetch relevant memories:', error)
    }

    return []
  }

  // =============================================================================
  // Agent Capabilities Configuration
  // =============================================================================

  private initializeAgentCapabilities(): Record<AgentType, AgentCapabilities> {
    return {
      [AgentType.PRODUCER]: {
        expertise: [
          'project_management',
          'requirement_gathering', 
          'user_communication',
          'planning',
          'coordination'
        ],
        keywords: [
          'project', 'plan', 'timeline', 'requirements', 'goals', 'objectives',
          'status', 'progress', 'roadmap', 'milestone', 'deadline', 'scope',
          'what', 'why', 'when', 'how much', 'organize', 'manage', 'coordinate'
        ],
        intentMatches: [
          UserIntent.PROJECT_PLANNING,
          UserIntent.PROJECT_STATUS,
          UserIntent.GENERAL_QUESTION,
          UserIntent.CLARIFICATION
        ],
        confidence: (context) => this.calculateProducerConfidence(context)
      },

      [AgentType.ARCHITECT]: {
        expertise: [
          'system_design',
          'architecture_patterns',
          'technology_selection',
          'scalability',
          'design_decisions'
        ],
        keywords: [
          'architecture', 'design', 'system', 'database', 'api', 'scalable',
          'structure', 'pattern', 'framework', 'technology', 'stack', 'integration',
          'microservices', 'monolith', 'performance', 'security', 'infrastructure'
        ],
        intentMatches: [
          UserIntent.TECHNICAL_DESIGN,
          UserIntent.ARCHITECTURE_REVIEW
        ],
        confidence: (context) => this.calculateArchitectConfidence(context)
      },

      [AgentType.ENGINEER]: {
        expertise: [
          'code_implementation',
          'programming',
          'debugging',
          'development',
          'algorithms'
        ],
        keywords: [
          'code', 'implement', 'function', 'class', 'method', 'variable',
          'algorithm', 'logic', 'programming', 'development', 'build', 'create',
          'fix', 'bug', 'error', 'debug', 'refactor', 'optimize', 'feature'
        ],
        intentMatches: [
          UserIntent.CODE_IMPLEMENTATION,
          UserIntent.DEBUGGING
        ],
        confidence: (context) => this.calculateEngineerConfidence(context)
      },

      [AgentType.QA]: {
        expertise: [
          'testing',
          'quality_assurance',
          'bug_detection',
          'test_automation',
          'validation'
        ],
        keywords: [
          'test', 'testing', 'qa', 'quality', 'bug', 'issue', 'validate',
          'verify', 'check', 'assertion', 'coverage', 'regression', 'automation',
          'spec', 'requirement', 'edge case', 'scenario', 'acceptance'
        ],
        intentMatches: [
          UserIntent.TESTING_QA
        ],
        confidence: (context) => this.calculateQAConfidence(context)
      }
    }
  }

  // =============================================================================
  // Agent-Specific Confidence Calculations
  // =============================================================================

  private calculateProducerConfidence(context: MessageContext): number {
    let confidence = 0.3 // Base confidence

    const capabilities = this.agentCapabilities[AgentType.PRODUCER]

    // Intent matching
    if (context.userIntent && capabilities.intentMatches.includes(context.userIntent)) {
      confidence += 0.4
    }

    // Keyword matching
    const keywordMatches = this.countKeywordMatches(context.content, capabilities.keywords)
    confidence += Math.min(keywordMatches * 0.1, 0.3)

    // Question patterns that indicate project management needs
    if (this.hasQuestionPatterns(context.content, [
      'what should', 'how do i', 'where to start', 'next step', 'help me'
    ])) {
      confidence += 0.2
    }

    // Default handler for general questions
    if (context.userIntent === UserIntent.GENERAL_QUESTION) {
      confidence = Math.max(confidence, 0.6)
    }

    return Math.min(confidence, 1.0)
  }

  private calculateArchitectConfidence(context: MessageContext): number {
    let confidence = 0.2

    const capabilities = this.agentCapabilities[AgentType.ARCHITECT]

    // Intent matching
    if (context.userIntent && capabilities.intentMatches.includes(context.userIntent)) {
      confidence += 0.5
    }

    // Keyword matching
    const keywordMatches = this.countKeywordMatches(context.content, capabilities.keywords)
    confidence += Math.min(keywordMatches * 0.15, 0.4)

    // Technical complexity indicators
    if (this.hasTechnicalComplexity(context.content)) {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }

  private calculateEngineerConfidence(context: MessageContext): number {
    let confidence = 0.2

    const capabilities = this.agentCapabilities[AgentType.ENGINEER]

    // Intent matching
    if (context.userIntent && capabilities.intentMatches.includes(context.userIntent)) {
      confidence += 0.5
    }

    // Keyword matching
    const keywordMatches = this.countKeywordMatches(context.content, capabilities.keywords)
    confidence += Math.min(keywordMatches * 0.15, 0.4)

    // Code-related patterns
    if (this.hasCodePatterns(context.content)) {
      confidence += 0.3
    }

    return Math.min(confidence, 1.0)
  }

  private calculateQAConfidence(context: MessageContext): number {
    let confidence = 0.2

    const capabilities = this.agentCapabilities[AgentType.QA]

    // Intent matching
    if (context.userIntent && capabilities.intentMatches.includes(context.userIntent)) {
      confidence += 0.5
    }

    // Keyword matching
    const keywordMatches = this.countKeywordMatches(context.content, capabilities.keywords)
    confidence += Math.min(keywordMatches * 0.15, 0.4)

    // Testing-related patterns
    if (this.hasTestingPatterns(context.content)) {
      confidence += 0.3
    }

    return Math.min(confidence, 1.0)
  }

  // =============================================================================
  // Pattern Detection Helpers
  // =============================================================================

  private countKeywordMatches(content: string, keywords: string[]): number {
    const normalizedContent = content.toLowerCase()
    return keywords.filter(keyword => 
      normalizedContent.includes(keyword.toLowerCase())
    ).length
  }

  private hasQuestionPatterns(content: string, patterns: string[]): boolean {
    const normalizedContent = content.toLowerCase()
    return patterns.some(pattern => normalizedContent.includes(pattern))
  }

  private hasTechnicalComplexity(content: string): boolean {
    const technicalPatterns = [
      'scalable', 'distributed', 'microservices', 'architecture', 'design pattern',
      'database schema', 'api design', 'system design', 'infrastructure'
    ]
    return this.hasQuestionPatterns(content, technicalPatterns)
  }

  private hasCodePatterns(content: string): boolean {
    const codePatterns = [
      'function', 'class', 'method', 'variable', 'algorithm', 'implement',
      'code', 'programming', 'debug', 'fix', 'feature', 'logic'
    ]
    return this.hasQuestionPatterns(content, codePatterns)
  }

  private hasTestingPatterns(content: string): boolean {
    const testPatterns = [
      'test', 'testing', 'qa', 'quality', 'validation', 'verify', 'check',
      'bug', 'issue', 'coverage', 'assertion', 'spec'
    ]
    return this.hasQuestionPatterns(content, testPatterns)
  }

  // =============================================================================
  // Response Generation
  // =============================================================================

  private generateRoutingReasoning(
    primaryAgent: AgentType,
    confidence: number,
    secondaryAgents: AgentType[],
    context: MessageContext
  ): string {
    const agentName = this.getAgentName(primaryAgent)
    const intent = context.userIntent || 'general inquiry'
    
    let reasoning = `Routed to ${agentName} (${Math.round(confidence * 100)}% confidence) `
    reasoning += `based on ${intent} intent and content analysis.`

    if (secondaryAgents.length > 0) {
      const secondaryNames = secondaryAgents.map(this.getAgentName).join(', ')
      reasoning += ` Collaboration with ${secondaryNames} may be beneficial.`
    }

    return reasoning
  }

  private generateSuggestedResponse(agentType: AgentType, _context: MessageContext): string {
    const suggestions = {
      [AgentType.PRODUCER]: "I'll help you organize this project and clarify the requirements.",
      [AgentType.ARCHITECT]: "Let me analyze the technical requirements and design approach.",
      [AgentType.ENGINEER]: "I'll help implement this feature and write the necessary code.",
      [AgentType.QA]: "I'll help ensure this meets quality standards and create appropriate tests."
    }

    return suggestions[agentType]
  }

  private getAgentName(agentType: AgentType): string {
    const names = {
      [AgentType.PRODUCER]: 'Producer',
      [AgentType.ARCHITECT]: 'Architect',
      [AgentType.ENGINEER]: 'Engineer',
      [AgentType.QA]: 'QA'
    }
    return names[agentType]
  }
}

// =============================================================================
// Intent Classifier
// =============================================================================

class IntentClassifier {
  private readonly intentPatterns: Record<UserIntent, string[]>

  constructor() {
    this.intentPatterns = {
      [UserIntent.PROJECT_PLANNING]: [
        'plan', 'timeline', 'roadmap', 'milestone', 'schedule', 'project',
        'organize', 'structure', 'scope', 'requirements', 'goals'
      ],
      [UserIntent.TECHNICAL_DESIGN]: [
        'architecture', 'design', 'system', 'database', 'api', 'structure',
        'pattern', 'framework', 'technology', 'scalable', 'performance'
      ],
      [UserIntent.CODE_IMPLEMENTATION]: [
        'code', 'implement', 'build', 'create', 'develop', 'function',
        'class', 'method', 'algorithm', 'feature', 'programming'
      ],
      [UserIntent.TESTING_QA]: [
        'test', 'testing', 'qa', 'quality', 'validate', 'verify',
        'bug', 'coverage', 'assertion', 'spec', 'check'
      ],
      [UserIntent.DEBUGGING]: [
        'bug', 'error', 'issue', 'fix', 'debug', 'problem', 'broken',
        'not working', 'crash', 'exception', 'troubleshoot'
      ],
      [UserIntent.ARCHITECTURE_REVIEW]: [
        'review', 'evaluate', 'assessment', 'critique', 'analysis',
        'best practice', 'improve', 'optimize', 'refactor'
      ],
      [UserIntent.PROJECT_STATUS]: [
        'status', 'progress', 'update', 'how are we', 'where are we',
        'completion', 'done', 'finished', 'remaining'
      ],
      [UserIntent.CLARIFICATION]: [
        'what', 'how', 'why', 'when', 'where', 'explain', 'clarify',
        'understand', 'meaning', 'definition', 'help me understand'
      ],
      [UserIntent.GENERAL_QUESTION]: [
        'help', 'question', 'wondering', 'curious', 'advice', 'suggestion',
        'recommendation', 'think', 'opinion'
      ]
    }
  }

  classify(context: MessageContext): UserIntent {
    const content = context.content.toLowerCase()
    const scores: Record<UserIntent, number> = {} as Record<UserIntent, number>

    // Calculate scores for each intent
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const matches = patterns.filter(pattern => content.includes(pattern)).length
      scores[intent as UserIntent] = matches / patterns.length
    }

    // Find the intent with the highest score
    const sortedIntents = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)

    const [topIntent, topScore] = sortedIntents[0]

    // If no clear intent, default to general question
    if (topScore < 0.1) {
      return UserIntent.GENERAL_QUESTION
    }

    return topIntent as UserIntent
  }
}