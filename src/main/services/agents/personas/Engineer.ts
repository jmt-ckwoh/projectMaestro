/**
 * Engineer Agent
 * 
 * The Engineer specializes in code generation, implementation, and technical execution.
 * Takes architectural designs and user requirements to create working code solutions.
 * Focuses on best practices, code quality, and maintainable implementations.
 */

import {
  AgentAction,
  Agent as AgentEntity,
  AgentMessage,
  AgentResponse,
  AgentType
} from '@/shared/contracts/AgentDomain'
import { AgentContext, BaseAgent, LLMProvider, MemoryManager } from '../base/Agent'
import { AgentStateMachine } from '../AgentStateMachine'
import { IEventBus } from '@/shared/contracts/EventBus'
import { DomainEvent } from '@/shared/contracts/common'
import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// Engineer-Specific Types
// =============================================================================

export interface CodeImplementation {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly language: string
  readonly framework?: string
  readonly files: CodeFile[]
  readonly dependencies: Dependency[]
  readonly testFiles: TestFile[]
  readonly documentation: string
  readonly status: 'planned' | 'in_progress' | 'completed' | 'needs_review'
  readonly lastUpdated: Date
}

export interface CodeFile {
  readonly id: string
  readonly path: string
  readonly name: string
  readonly type: 'source' | 'config' | 'asset' | 'documentation'
  readonly language: string
  readonly content: string
  readonly size: number
  readonly dependencies: string[]
  readonly exports: string[]
  readonly imports: string[]
  readonly lastModified: Date
}

export interface TestFile {
  readonly id: string
  readonly path: string
  readonly name: string
  readonly type: 'unit' | 'integration' | 'e2e' | 'performance'
  readonly targetFile: string
  readonly content: string
  readonly coverage: TestCoverage
  readonly framework: string
  readonly lastModified: Date
}

export interface TestCoverage {
  readonly lines: number
  readonly functions: number
  readonly branches: number
  readonly statements: number
}

export interface Dependency {
  readonly name: string
  readonly version: string
  readonly type: 'runtime' | 'dev' | 'peer' | 'optional'
  readonly description: string
  readonly justification: string
  readonly alternatives: string[]
}

export interface RefactoringPlan {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly scope: 'file' | 'module' | 'component' | 'system'
  readonly changes: RefactoringChange[]
  readonly riskAssessment: RiskAssessment
  readonly rollbackPlan: string
  readonly estimatedEffort: string
}

export interface RefactoringChange {
  readonly type: 'rename' | 'extract' | 'inline' | 'move' | 'restructure'
  readonly description: string
  readonly files: string[]
  readonly impact: 'low' | 'medium' | 'high'
  readonly automated: boolean
}

export interface RiskAssessment {
  readonly level: 'low' | 'medium' | 'high' | 'critical'
  readonly factors: RiskFactor[]
  readonly mitigations: string[]
  readonly contingencies: string[]
}

export interface RiskFactor {
  readonly category: 'technical' | 'business' | 'operational'
  readonly description: string
  readonly probability: 'low' | 'medium' | 'high'
  readonly impact: 'low' | 'medium' | 'high'
}

export interface CodeReview {
  readonly id: string
  readonly title: string
  readonly files: string[]
  readonly reviewType: 'functionality' | 'performance' | 'security' | 'maintainability'
  readonly findings: ReviewFinding[]
  readonly recommendations: string[]
  readonly approvalStatus: 'pending' | 'approved' | 'changes_requested'
}

export interface ReviewFinding {
  readonly type: 'issue' | 'suggestion' | 'praise'
  readonly severity: 'low' | 'medium' | 'high' | 'critical'
  readonly category: 'bug' | 'performance' | 'security' | 'style' | 'architecture'
  readonly description: string
  readonly file: string
  readonly line?: number
  readonly suggestion?: string
}

export interface ImplementationTask {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly type: 'feature' | 'bugfix' | 'refactor' | 'optimization' | 'documentation'
  readonly priority: 'low' | 'medium' | 'high' | 'urgent'
  readonly complexity: 'simple' | 'moderate' | 'complex' | 'expert'
  readonly estimatedHours: number
  readonly dependencies: string[]
  readonly acceptanceCriteria: string[]
  readonly status: 'todo' | 'in_progress' | 'code_review' | 'testing' | 'done'
}

// =============================================================================
// Engineer Agent Implementation
// =============================================================================

export class EngineerAgent extends BaseAgent {
  private currentImplementation?: CodeImplementation
  private implementationHistory: CodeImplementation[] = []
  private pendingTasks: ImplementationTask[] = []
  private codeReviews: CodeReview[] = []

  constructor(
    agentEntity: AgentEntity,
    stateMachine: AgentStateMachine,
    eventBus: IEventBus,
    llmProvider: LLMProvider,
    memoryManager?: MemoryManager
  ) {
    super(agentEntity, stateMachine, eventBus, llmProvider, memoryManager)
    this.initializeEngineerTools()
  }

  // =============================================================================
  // BaseAgent Implementation
  // =============================================================================

  protected getSystemPrompt(): string {
    return `
You are the Engineer, a senior software developer specializing in creating high-quality, maintainable code implementations.

CORE IDENTITY:
You are an experienced software engineer with expertise across multiple programming languages, frameworks, and development practices. You transform architectural designs and requirements into working code, focusing on quality, performance, and maintainability.

CORE RESPONSIBILITIES:
1. Implement features and components based on architectural designs
2. Write clean, well-documented, and testable code
3. Create comprehensive unit and integration tests
4. Refactor existing code to improve quality and maintainability
5. Optimize code for performance and resource efficiency
6. Debug and fix issues in existing codebases
7. Review code for quality, security, and best practices
8. Document implementation decisions and code usage

PERSONALITY TRAITS:
- Detail-oriented and methodical in coding approach
- Values clean code principles and best practices
- Pragmatic about balancing perfection with delivery timelines
- Collaborative and open to feedback and code reviews
- Continuous learner, stays updated with technology trends
- Problem solver who enjoys debugging and optimization challenges
- Quality-focused but understands business constraints

DEVELOPMENT PHILOSOPHY:
- Write code that tells a story and is easy to understand
- Test early and test often - TDD when appropriate
- Refactor continuously to prevent technical debt
- Choose simplicity over cleverness
- Document the "why" not just the "how"
- Consider future maintainers when writing code
- Optimize for readability first, performance second
- Follow established patterns and conventions

INTERACTION PATTERNS:

When receiving implementation requirements:
1. Acknowledge the requirements and ask clarifying questions about edge cases
2. Break down complex tasks into smaller, manageable components
3. Propose implementation approach with technology choices
4. Identify potential challenges and propose solutions
5. Estimate effort and timeline realistically
6. Create detailed implementation plan with milestones

When implementing code:
1. Start with interfaces and contracts, then implement
2. Write tests alongside or before implementation (TDD)
3. Focus on one component at a time, ensuring it works before moving on
4. Document complex logic and business rules inline
5. Consider error handling and edge cases throughout
6. Refactor as you go to maintain clean code

When debugging or fixing issues:
1. Reproduce the issue systematically
2. Analyze root cause, not just symptoms
3. Propose minimal fix that addresses the root cause
4. Consider broader implications of the fix
5. Add tests to prevent regression
6. Document the issue and solution for future reference

COMMUNICATION STYLE:
- Be specific about technical implementation details
- Explain complex concepts in understandable terms
- Ask targeted questions to clarify requirements
- Provide realistic estimates and timeline expectations
- Share trade-offs and alternative approaches
- Communicate progress and blockers proactively
- Use code examples to illustrate points when helpful

TOOLS YOU HAVE ACCESS TO:
- implement_feature: Create complete feature implementation with tests
- refactor_code: Improve existing code structure and quality
- debug_issue: Systematically debug and fix code problems
- optimize_performance: Analyze and improve code performance
- review_code: Conduct thorough code reviews with feedback
- generate_tests: Create comprehensive test suites
- create_documentation: Generate technical documentation

CONSTRAINTS:
- Always write production-quality code with proper error handling
- Include comprehensive tests for all implementations
- Follow established coding standards and conventions
- Consider security implications of all code changes
- Optimize for maintainability and future changes
- Document complex business logic and technical decisions
- Never compromise on code quality for speed alone
- Always consider the impact on existing code and systems

QUALITY STANDARDS:
- Code should be self-documenting with clear variable and function names
- All public interfaces should have comprehensive documentation
- Error handling should be explicit and user-friendly
- Performance should be considered but not prematurely optimized
- Security best practices should be followed throughout
- Code should be testable and have good test coverage
- Dependencies should be minimal and well-justified

CONTEXT AWARENESS:
You have access to architectural designs, previous implementations, and project context. Build on existing patterns and maintain consistency with the overall system design. Reference previous work and ensure new code integrates well with existing components.

Remember: Your role is to transform ideas and designs into working, maintainable software. You bridge the gap between technical specifications and running code, ensuring the final product meets both functional and quality requirements.
    `.trim()
  }

  protected getPersonalityTraits(): string[] {
    return [
      'detail_oriented',
      'methodical',
      'pragmatic',
      'collaborative',
      'quality_focused',
      'problem_solver',
      'continuous_learner',
      'reliable'
    ]
  }

  protected getCapabilities(): string[] {
    return [
      'code_implementation',
      'test_development',
      'debugging',
      'refactoring',
      'performance_optimization',
      'code_review',
      'technical_documentation',
      'api_design',
      'database_integration',
      'security_implementation'
    ]
  }

  protected async processAgentMessage(message: AgentMessage, context: AgentContext): Promise<AgentResponse> {
    // Store message in memory for implementation context
    await this.storeMemory(`Implementation request: ${message.content}`, 'conversation')

    // Analyze the message for implementation requirements
    const analysisPrompt = this.buildImplementationAnalysisPrompt(message)
    const analysis = await this.callLLM([
      { role: 'user', content: analysisPrompt }
    ])

    // Generate implementation response
    const responsePrompt = this.buildImplementationResponsePrompt(message, analysis)
    const responseContent = await this.callLLM([
      { role: 'user', content: responsePrompt }
    ])

    // Extract implementation actions from the response
    const actions = await this.extractImplementationActions(responseContent, context)

    // Build the response
    const response: AgentResponse = {
      messageId: message.id,
      agentType: AgentType.ENGINEER,
      content: responseContent,
      actions,
      statusUpdate: {
        status: this.status,
        message: 'Analyzing implementation requirements and planning development'
      }
    }

    // Execute extracted actions
    await this.executeActions(actions, context)

    return response
  }

  // =============================================================================
  // Engineer-Specific Logic
  // =============================================================================

  private buildImplementationAnalysisPrompt(message: AgentMessage): string {
    const currentImpl = this.currentImplementation ? 
      `Current implementation: ${this.currentImplementation.title} - ${this.currentImplementation.status}` : 
      'No active implementation'
    
    const pendingTasks = this.pendingTasks.length > 0 ?
      `Pending tasks: ${this.pendingTasks.map(t => `${t.title} (${t.status})`).join(', ')}` :
      'No pending tasks'

    return `
Analyze this message from a software implementation perspective:

CURRENT DEVELOPMENT CONTEXT:
${currentImpl}
${pendingTasks}

MESSAGE TO ANALYZE:
"${message.content}"

From an Engineer's perspective, analyze:
1. What specific functionality needs to be implemented?
2. What programming languages, frameworks, or technologies are involved?
3. Are there existing code patterns or components to build upon?
4. What are the technical complexity and estimated effort?
5. What tests need to be written alongside the implementation?
6. Are there any potential technical challenges or edge cases?
7. What dependencies or integrations are required?
8. What documentation needs to be created or updated?

Focus on practical implementation details and development considerations.
    `.trim()
  }

  private buildImplementationResponsePrompt(message: AgentMessage, analysis: string): string {
    const recentImplementations = this.getRecentImplementationMemories()
    const developmentContext = this.currentImplementation ? 
      `Working on: ${this.currentImplementation.title} (${this.currentImplementation.status})` : 
      'No active implementation'

    return `
You are the Engineer responding to this implementation request. Provide detailed technical guidance and development plans.

IMPLEMENTATION ANALYSIS:
${analysis}

RELEVANT CONTEXT:
${recentImplementations}
${developmentContext}

MESSAGE:
"${message.content}"

Craft an engineering response that:
1. Acknowledges the implementation requirements clearly
2. Breaks down the work into specific, actionable development tasks
3. Proposes concrete implementation approach with technology choices
4. Identifies potential challenges and suggests solutions
5. Provides realistic effort estimates and timeline
6. Plans testing strategy alongside implementation
7. Considers code quality, maintainability, and best practices
8. Identifies dependencies and integration points

Keep your response practical and actionable, with specific technical details.
If code implementation should begin, mention that you'll start development.
If architectural clarification is needed, suggest coordinating with the Architect.
    `.trim()
  }

  private async extractImplementationActions(responseContent: string, _context: AgentContext): Promise<AgentAction[]> {
    const actions: AgentAction[] = []

    const actionPrompt = `
Analyze this Engineer response and identify implementation actions that should be taken:

RESPONSE:
"${responseContent}"

Identify if the response suggests:
1. Implementing a feature (extract feature details, files, and approach)
2. Creating tests (extract test types and coverage requirements)
3. Refactoring code (extract refactoring scope and changes)
4. Debugging an issue (extract issue details and debugging approach)
5. Optimizing performance (extract optimization targets and methods)
6. Reviewing code (extract review scope and criteria)
7. Creating documentation (extract documentation type and content)
8. Coordinating with other agents (identify which agents and what information needed)

Return a JSON array of actions in this format:
[
  {
    "type": "implement_feature",
    "description": "Implement specific feature with tests",
    "parameters": {
      "title": "feature title",
      "description": "detailed description",
      "language": "programming language",
      "framework": "framework if applicable",
      "files": ["file1.js", "file2.js"],
      "tests": ["test1.spec.js"],
      "complexity": "simple|moderate|complex|expert"
    }
  }
]

Only include actions that are clearly indicated in the response. Return empty array if no actions.
    `.trim()

    try {
      const actionsText = await this.callLLM([
        { role: 'user', content: actionPrompt }
      ])

      const extractedActions = JSON.parse(actionsText)
      
      for (const action of extractedActions) {
        actions.push({
          type: action.type,
          description: action.description,
          parameters: action.parameters,
          confirmation: action.type === 'refactor_code' || action.type === 'optimize_performance' // Some actions need confirmation
        })
      }
    } catch (error) {
      console.warn('Failed to extract implementation actions from response:', error)
    }

    return actions
  }

  private async executeActions(actions: AgentAction[], _context: AgentContext): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'implement_feature':
            await this.implementFeature(action.parameters)
            break
          case 'create_tests':
            await this.createTests(action.parameters)
            break
          case 'refactor_code':
            await this.refactorCode(action.parameters)
            break
          case 'debug_issue':
            await this.debugIssue(action.parameters)
            break
          case 'optimize_performance':
            await this.optimizePerformance(action.parameters)
            break
          case 'review_code':
            await this.reviewCode(action.parameters)
            break
          case 'create_documentation':
            await this.createDocumentation(action.parameters)
            break
        }
      } catch (error) {
        console.error(`Failed to execute implementation action ${action.type}:`, error)
      }
    }
  }

  private async implementFeature(parameters: any): Promise<void> {
    const { title, description, language, framework, files, tests, complexity } = parameters

    const implementation: CodeImplementation = {
      id: uuidv4(),
      title: title || 'Feature Implementation',
      description: description || 'Feature to be implemented',
      language: language || 'typescript',
      framework: framework,
      files: (files || []).map((path: string) => ({
        id: uuidv4(),
        path,
        name: path.split('/').pop() || 'unknown',
        type: 'source' as const,
        language: language || 'typescript',
        content: '// Implementation to be created',
        size: 0,
        dependencies: [],
        exports: [],
        imports: [],
        lastModified: new Date()
      })),
      dependencies: [],
      testFiles: (tests || []).map((path: string) => ({
        id: uuidv4(),
        path,
        name: path.split('/').pop() || 'unknown',
        type: 'unit' as const,
        targetFile: files?.[0] || 'unknown',
        content: '// Tests to be created',
        coverage: { lines: 0, functions: 0, branches: 0, statements: 0 },
        framework: 'jest',
        lastModified: new Date()
      })),
      documentation: 'Documentation to be created',
      status: 'in_progress',
      lastUpdated: new Date()
    }

    this.currentImplementation = implementation
    this.implementationHistory.push(implementation)

    // Create implementation task
    const task: ImplementationTask = {
      id: uuidv4(),
      title,
      description,
      type: 'feature',
      priority: 'medium',
      complexity: complexity || 'moderate',
      estimatedHours: this.estimateEffort(complexity),
      dependencies: [],
      acceptanceCriteria: [
        'Feature is fully implemented',
        'All tests pass',
        'Code review completed',
        'Documentation updated'
      ],
      status: 'in_progress'
    }

    this.pendingTasks.push(task)

    // Store in memory
    await this.storeMemory(
      `Feature implementation started: ${JSON.stringify(implementation)}`,
      'implementation'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'feature.implementation.started',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        implementation,
        task
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async createTests(parameters: any): Promise<void> {
    const { target, testType, coverage } = parameters

    // Store test creation in memory
    await this.storeMemory(
      `Tests created for: ${target} (${testType})`,
      'testing'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'tests.created',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        target,
        testType,
        coverage
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async refactorCode(parameters: any): Promise<void> {
    const { scope, changes, riskLevel } = parameters

    const refactoringPlan: RefactoringPlan = {
      id: uuidv4(),
      title: `Refactor ${scope}`,
      description: 'Code refactoring plan',
      scope: scope || 'module',
      changes: changes || [],
      riskAssessment: {
        level: riskLevel || 'medium',
        factors: [],
        mitigations: [],
        contingencies: []
      },
      rollbackPlan: 'Git rollback available',
      estimatedEffort: 'To be estimated'
    }

    // Store in memory
    await this.storeMemory(
      `Refactoring planned: ${JSON.stringify(refactoringPlan)}`,
      'refactoring'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'code.refactoring.planned',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        refactoringPlan
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async debugIssue(parameters: any): Promise<void> {
    const { issue, symptoms, approach } = parameters

    // Store debugging session in memory
    await this.storeMemory(
      `Debugging issue: ${issue} - Approach: ${approach}`,
      'debugging'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'issue.debugging.started',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        issue,
        symptoms,
        approach
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async optimizePerformance(parameters: any): Promise<void> {
    const { target, metrics, approach } = parameters

    // Store optimization plan in memory
    await this.storeMemory(
      `Performance optimization: ${target} - ${approach}`,
      'optimization'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'performance.optimization.started',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        target,
        metrics,
        approach
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async reviewCode(parameters: any): Promise<void> {
    const { files, reviewType } = parameters

    const codeReview: CodeReview = {
      id: uuidv4(),
      title: `Code Review - ${reviewType}`,
      files: files || [],
      reviewType: reviewType || 'functionality',
      findings: [],
      recommendations: [],
      approvalStatus: 'pending'
    }

    this.codeReviews.push(codeReview)

    // Store in memory
    await this.storeMemory(
      `Code review initiated: ${JSON.stringify(codeReview)}`,
      'code_review'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'code.review.initiated',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        codeReview
      }
    }
    this.eventBus.publishAsync(event)
  }

  private async createDocumentation(parameters: any): Promise<void> {
    const { type, content, target } = parameters

    // Store documentation creation in memory
    await this.storeMemory(
      `Documentation created: ${type} for ${target}`,
      'documentation'
    )

    // Emit event
    const event: DomainEvent = {
      id: uuidv4(),
      type: 'documentation.created',
      domain: 'engineering',
      timestamp: new Date(),
      version: 1,
      payload: {
        agentId: this.id,
        agentType: this.type,
        documentationType: type,
        target,
        content
      }
    }
    this.eventBus.publishAsync(event)
  }

  private estimateEffort(complexity: string): number {
    const effortMap = {
      'simple': 2,
      'moderate': 8,
      'complex': 20,
      'expert': 40
    }
    return effortMap[complexity as keyof typeof effortMap] || 8
  }

  private getRecentImplementationMemories(): string {
    // This would retrieve relevant implementation memories in a real implementation
    return 'Recent implementation context to be implemented'
  }

  private initializeEngineerTools(): void {
    // Engineer-specific tools would be registered here
    // For now, we rely on the action extraction system
  }

  // =============================================================================
  // Public Engineer Interface
  // =============================================================================

  public getCurrentImplementation(): CodeImplementation | undefined {
    return this.currentImplementation
  }

  public getPendingTasks(): ImplementationTask[] {
    return [...this.pendingTasks]
  }

  public getImplementationHistory(): CodeImplementation[] {
    return [...this.implementationHistory]
  }

  public getCodeReviews(): CodeReview[] {
    return [...this.codeReviews]
  }

  public completeTask(taskId: string): void {
    const task = this.pendingTasks.find(t => t.id === taskId)
    if (task) {
      ;(task as any).status = 'done'
    }
  }

  public approveCodeReview(reviewId: string): void {
    const review = this.codeReviews.find(r => r.id === reviewId)
    if (review) {
      ;(review as any).approvalStatus = 'approved'
    }
  }

  public requestChanges(reviewId: string, findings: ReviewFinding[]): void {
    const review = this.codeReviews.find(r => r.id === reviewId)
    if (review) {
      ;(review as any).approvalStatus = 'changes_requested'
      ;(review as any).findings = findings
    }
  }
}

export default EngineerAgent