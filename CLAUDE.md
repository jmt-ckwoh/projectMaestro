# ARCHITECTURE.MD - Project Maestro System Architecture
# Version: 4.0 (Enhanced Agent Personas Complete - Vision Aligned)

## 1. Core Philosophy & Product Vision

Project Maestro is a **Project Management Interface for AI-Driven Development** that uses a **Unified TypeScript Stack** for simplicity and predictability.

**Target User**: Solo developer with strong management/communication skills but no technical background
**Core Mission**: Enable non-technical users to build software by managing AI agents as a structured development team
**Meta-Goal**: Transform the Claude Code collaborative experience into an accessible, structured application

See `PROJECT_VISION.md` for complete product definition and user journey details.

## 2. Critical Architecture Rules

### 🚨 NEVER VIOLATE THESE RULES

1. **Renderer Process has NO Node.js access** - Never import `fs`, `path`, or any Node modules in `src/renderer/`
2. **All backend operations go through IPC** - Use the preload bridge exclusively
3. **Database access is Main Process only** - LanceDB operations never happen in renderer
4. **Strict TypeScript everywhere** - No `any` types, explicit interfaces required
5. **All domain services MUST implement contracts** - See `src/shared/contracts/` for interfaces
6. **Agent state changes MUST go through StateMachine** - Direct status updates are forbidden
7. **All IPC handlers MUST validate inputs** - Use Zod schemas and security checks
8. **Store ownership is strictly enforced** - No cross-store dependencies
9. **Event-driven communication only** - No direct service-to-service calls across domains
10. **Memory operations are domain-isolated** - Memory system access through contracts only
11. **Vector embeddings are AWS Bedrock exclusive** - Use EmbeddingService, never direct API calls

## Management Principles

### Project Task Management
- `maestro_agile_tasks.md` is our primary task tracking file using Epic → Story → Task structure with story point estimates. This should ALWAYS be kept up to date whenever we identify more tasks or complete tasks. ALWAYS do this proactively.
- `tasks/tasks-rfc-maestro.md` serves as detailed historical record of implementation progress and should be maintained for reference.

### Dogfooding Development Approach
- Build Project Maestro using the same collaborative principles we want to enable for users
- Use structured agent personas, document-driven development, and session management in our own development process
- Learn and refine collaborative patterns through authentic usage

### CRITICAL: Runtime Error Testing Requirements
**NEVER SHIP CODE WITHOUT RUNTIME ERROR TESTING**

Based on critical testing failures on 2025-06-21, ALL development MUST include:

1. **Console Error Detection**: Monitor and validate zero console errors
2. **IPC Handler Testing**: Validate all IPC channels used by stores  
3. **Store Initialization Testing**: Ensure stores load without "No handler registered" errors
4. **React Error Boundary Testing**: Check for infinite loops and render issues
5. **Backend Health Validation**: Confirm all services initialize correctly

**Required Commands Before ANY Commit:**
```bash
npm run test:critical  # Runs contracts + runtime error tests
npm run test:runtime-errors  # Playwright runtime validation
```

**Testing Documentation**: See `TESTING_RUNTIME_ERRORS.md` for detailed requirements.

**Failure Criteria**: Code MUST NOT be committed if:
- Any console.error() messages (except documented exceptions)
- Any "No handler registered for" IPC errors  
- Any React infinite loop warnings
- Any store initialization failures
- Backend services report unhealthy status

### Implementation Decision Documentation
- All strategic decisions captured in `IMPLEMENTATION_DECISIONS.md` to prevent context loss
- Detailed implementation approach documented in `PROJECT_VISION.md`
- Epic completion summaries in dedicated files (e.g., `EPIC_1_COMPLETION_SUMMARY.md`)
- Visual UI collaboration strategy: wireframes first, component-by-component, existing libraries
- Team chat room model with context-aware agent routing and manual @mentions

### Epic 1 Achievement (June 2025)
- **Status**: ✅ COMPLETED - Core Chat Interface (18 story points)
- **Delivered**: Multi-agent chat, @mention system, message persistence, thread management
- **Infrastructure**: Runtime error prevention framework, ES module compatibility fixes
- **Validation**: Non-technical users can manage AI agents through familiar chat interface
- **Foundation**: Proven architecture ready for Epic 2 (Visual Workspace)

### Epic 2 Achievement (June 2025)
- **Status**: ✅ COMPLETED - Visual Workspace - Hierarchical Tree View (26 story points)
- **Delivered**: Complete project management interface with tree visualization, task creation, progress tracking, agent assignment, and chat integration
- **Infrastructure**: Status management system, agent assignment workflows, task-chat communication bridge
- **Validation**: Non-technical users can manage complex software projects using familiar PM tools integrated with AI agents
- **Foundation**: Professional project management capabilities ready for Epic 3 (Agent Management System)

### Epic 3 Progress (June 2025)
- **Status**: 🔄 IN PROGRESS - Agent Management System (21/29 story points completed - 72%)
- **Completed**: Real-time agent status display, comprehensive agent configuration system, individual agent drill-down views with work session tracking
- **Delivered**: Advanced agent detail modal with thinking process visualization, work progress tracking, artifact management, real-time work stream integration
- **Infrastructure**: Agent work session lifecycle management, thinking step recording, agent configuration persistence, comprehensive activity logging
- **Validation**: Non-technical users can monitor AI agents like a development team with full transparency into agent thinking and work processes
- **Remaining**: Basic workflow orchestration (task assignment and agent coordination) - 8 story points

## 2.5. Three-Panel Interface Architecture

Project Maestro implements a **three-panel interface** designed for familiar project management workflows:

### Left Panel: Chat Interface ✅ COMPLETED (Epic 1)
- **Purpose**: Natural language conversation with AI agents  
- **Experience**: Team chat room with multi-agent communication
- **Implementation**: Real-time chat with @mentions, persistence, threading, and agent personalities
- **Achievement**: Professional chat UX accessible to non-technical users

### Center Panel: Visual Workspace ✅ COMPLETED (Epic 2)
- **Purpose**: Project management interface using familiar visual tools
- **Views**: Hierarchical tree view with Epic → Story → Task → Subtask structure
- **Implementation**: Interactive tree visualization with expand/collapse, task creation, progress tracking
- **Target**: Familiar to users of Trello, Jira, Linear, or other PM tools
- **Integration**: Complete agent assignment, status management, and chat communication bridge
- **Achievement**: Professional PM capabilities enabling complex project management through visual interface

### Right Panel: Agent Management 🔄 IN PROGRESS (Epic 3)
- **Purpose**: Team management interface for AI agents
- **Implementation**: Real-time agent status display, configuration system, detailed work monitoring
- **Completed Features**: Agent status cards, comprehensive configuration modal, agent detail drill-down views
- **Current Capabilities**: Work session tracking, thinking process visualization, artifact management, activity monitoring
- **Value**: Treats AI agents as manageable team members with full transparency into their work and thinking
- **Foundation**: Complete agent management system ready for workflow orchestration

## 3. Memory System Architecture (Phase 3.5 - COMPLETED)

Project Maestro implements a sophisticated memory system using **LanceDB vector storage** for semantic similarity search and contextual agent memory.

### 3.1 Memory System Components

```
Memory System Architecture:
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                         │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Chat Store    │    │  Memory Store   │                │
│  │   (UI State)    │    │   (UI State)    │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────┬───────────────────────────────────┘
                         │ IPC Bridge
┌─────────────────────────┴───────────────────────────────────┐
│                    Main Process                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Memory Domain Service                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │ Memory          │  │   LanceDB       │              │ │
│  │  │ Repository      │  │ Vector Store    │              │ │
│  │  │ (JSON Cache)    │  │(Embeddings)     │              │ │
│  │  └─────────────────┘  └─────────────────┘              │ │
│  │             │                  │                       │ │
│  │             └──────────────────┴───────────────────────┤ │
│  │                    Event Bus                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                             │                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                AWS Bedrock                              │ │
│  │           Embedding Service                             │ │
│  │        (Titan Embedding Model)                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Memory Types and Scopes

**Memory Types:**
- `global` - System-wide knowledge and patterns
- `project` - Project-specific context and decisions
- `task` - Task-specific implementation details
- `conversation` - Chat history and user interactions
- `user-preference` - User settings and preferences

**Memory Scopes:**
- `personal` - User-specific memories
- `shared` - Team/project shared memories  
- `system` - System-generated memories

### 3.3 Key Memory System Files

```typescript
// Memory Domain Service - Core orchestrator
src/main/services/memory/MemoryDomainService.ts
  - Implements IMemoryDomainService contract
  - Orchestrates vector store and repository
  - Handles memory CRUD operations with Result pattern
  - Manages memory lifecycle and cleanup

// LanceDB Vector Store - Semantic search
src/main/services/memory/VectorStore.ts  
  - Vector storage using LanceDB
  - Embedding generation via EmbeddingService
  - Similarity search with configurable thresholds
  - Vector health checks and statistics

// Memory Repository - JSON persistence
src/main/services/memory/MemoryRepository.ts
  - File-based JSON storage with caching
  - Memory filtering and pagination
  - Access statistics tracking
  - Cleanup and archival operations

// AWS Bedrock Embedding Service
src/main/services/ai/EmbeddingService.ts
  - Production-ready embedding generation
  - Caching and rate limiting
  - Error recovery and circuit breakers
  - Batch processing capabilities

// Memory IPC Handlers
src/main/services/memory/MemoryIPCHandlers.ts
  - Secure renderer-main communication
  - Zod schema validation
  - Error handling and result serialization

// Event Bus Implementation  
src/main/services/core/EventBus.ts
  - Domain event publishing and subscription
  - Circuit breaker patterns
  - Event filtering and priority handling
```

### 3.4 Memory Integration Patterns

**Agent-Memory Integration:**
```typescript
// Agent Orchestrator with memory capabilities
class AgentOrchestrator {
  async searchMemoriesForAgent(
    agentType: AgentType, 
    query: string, 
    options?: { projectId?: string; limit?: number }
  ): Promise<Result<any[], DomainError>>
  
  async storeMemoryForAgent(
    agentType: AgentType,
    content: string,
    metadata: MemoryMetadata
  ): Promise<Result<Memory, DomainError>>
}
```

**Memory Search Example:**
```typescript
// Search for relevant memories
const memories = await memoryService.searchMemories({
  query: "React component patterns",
  type: "project",
  projectId: "proj-123",
  limit: 5,
  threshold: 0.7
});

if (memories.success) {
  // Use memories to enhance agent context
  const relevantContext = memories.data
    .map(m => m.memory.content)
    .join('\n');
}
```

### 3.5 Memory System Testing

**Comprehensive test suite with 17/17 tests passing:**
- Memory storage and retrieval operations
- Vector similarity search accuracy
- Agent-memory integration workflows
- Error handling and edge cases
- Memory lifecycle management
- IPC communication validation

### 3.6 Memory System Performance

**Optimized for production use:**
- LanceDB vector operations with 1536-dimensional embeddings
- JSON caching layer for fast memory access
- Configurable similarity thresholds (default: 0.7)
- Batch embedding processing to minimize API calls
- Memory access statistics for usage optimization

### 3.7 Memory System Security

**Built with security best practices:**
- Memory access through domain contracts only
- IPC input validation with Zod schemas
- AWS Bedrock credentials managed securely
- Memory scoping prevents unauthorized access
- Audit trail for memory operations

## 4. Agent System Integration

The memory system is tightly integrated with the agent system, enabling:

**Contextual Agent Responses:**
- Agents can search for relevant project memories
- Memory-enhanced prompt generation
- Cross-agent memory sharing for collaboration

**Agent Learning:**
- Agents store important conversation insights
- Project-specific knowledge accumulation
- User preference learning and adaptation

**Collaboration Enhancement:**
- Shared memory pool for agent coordination
- Handoff context preservation between agents
- Team knowledge base building

[... rest of the existing content remains unchanged ...]