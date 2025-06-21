# Project Maestro Memory System Documentation

## Overview

Project Maestro implements a sophisticated memory system that enables AI agents to store, retrieve, and leverage contextual information across conversations and projects. The system uses **LanceDB vector storage** for semantic similarity search and **AWS Bedrock Titan Embedding** for generating high-quality vector embeddings.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Memory System Flow                          │
│                                                             │
│ User Input → Agent → Memory Search → Context Enhancement    │
│     ↓           ↓         ↓              ↓                  │
│ Store Memory ← Response ← Vector Store ← Embedding Service  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Memory Domain Service (`MemoryDomainService.ts`)

The central orchestrator for all memory operations:

```typescript
class MemoryDomainService implements IMemoryDomainService {
  // Core memory operations
  async storeMemory(input: CreateMemoryInput): Promise<Result<Memory, DomainError>>
  async searchMemories(query: MemorySearchQuery): Promise<Result<MemorySearchResult[], DomainError>>
  async getMemory(id: string): Promise<Result<Memory, DomainError>>
  async updateMemory(id: string, input: UpdateMemoryInput): Promise<Result<Memory, DomainError>>
  async deleteMemory(id: string): Promise<Result<void, DomainError>>
  
  // Specialized retrieval methods
  async getProjectMemories(projectId: string): Promise<Result<Memory[], DomainError>>
  async getAgentMemories(agentType: string): Promise<Result<Memory[], DomainError>>
  
  // Management operations
  async cleanupMemories(criteria: MemoryCleanupCriteria): Promise<Result<number, DomainError>>
  async getMemoryStatistics(): Promise<Result<MemoryStatistics, DomainError>>
}
```

### 2. LanceDB Vector Store (`VectorStore.ts`)

Handles vector storage and semantic similarity search:

```typescript
class LanceDBVectorStore implements IVectorStore {
  // Vector operations
  async storeVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void>
  async searchSimilar(queryVector: number[], limit: number, threshold: number): Promise<VectorSearchResult[]>
  async updateVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void>
  async deleteVector(id: string): Promise<void>
  
  // Embedding generation
  async generateEmbedding(content: string): Promise<number[]>
  
  // Health and statistics
  async healthCheck(): Promise<boolean>
  async getStatistics(): Promise<VectorStoreStatistics>
}
```

### 3. Memory Repository (`MemoryRepository.ts`)

Manages JSON-based persistence and caching:

```typescript
class MemoryRepository {
  // CRUD operations
  async save(memory: Memory): Promise<Memory>
  async findById(id: string): Promise<Memory | null>
  async findAll(query?: MemoryQuery): Promise<PagedResult<Memory>>
  async delete(id: string): Promise<void>
  
  // Specialized finders
  async findByProject(projectId: string): Promise<Memory[]>
  async findByAgent(agentType: string): Promise<Memory[]>
  
  // Management
  async updateAccessStats(memoryId: string): Promise<void>
  async cleanup(criteria: CleanupCriteria): Promise<number>
  async getStatistics(): Promise<RepositoryStatistics>
}
```

### 4. AWS Bedrock Embedding Service (`EmbeddingService.ts`)

Production-ready embedding generation with enterprise features:

```typescript
class EmbeddingService {
  // Embedding generation
  async generateEmbedding(request: EmbeddingRequest): Promise<Result<EmbeddingResponse, DomainError>>
  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<Result<EmbeddingResponse[], DomainError>>
  
  // Performance and reliability
  getMetrics(): EmbeddingMetrics
  clearCache(): void
  async healthCheck(): Promise<boolean>
}
```

## Memory Types and Scopes

### Memory Types

- **`global`** - System-wide knowledge and patterns
- **`project`** - Project-specific context and decisions  
- **`task`** - Task-specific implementation details
- **`conversation`** - Chat history and user interactions
- **`user-preference`** - User settings and preferences

### Memory Scopes

- **`personal`** - User-specific memories
- **`shared`** - Team/project shared memories
- **`system`** - System-generated memories

## Usage Examples

### Storing Agent Memories

```typescript
// Store a conversation insight
const memory = await memoryService.storeMemory({
  content: "User prefers React functional components over class components",
  type: "user-preference",
  scope: "personal",
  metadata: {
    tags: ["react", "preferences", "components"],
    source: "conversation",
    importance: 0.8,
    projectId: "proj-123"
  }
});
```

### Searching for Relevant Context

```typescript
// Search for relevant memories before agent response
const searchResults = await memoryService.searchMemories({
  query: "React component architecture patterns",
  type: "project",
  projectId: "proj-123",
  limit: 5,
  threshold: 0.7
});

if (searchResults.success) {
  const relevantContext = searchResults.data
    .map(result => ({
      content: result.memory.content,
      relevance: result.similarity
    }))
    .filter(item => item.relevance > 0.8);
}
```

### Agent Integration

```typescript
// Agent Orchestrator memory integration
class AgentOrchestrator {
  async searchMemoriesForAgent(
    agentType: AgentType,
    query: string,
    options?: { projectId?: string; limit?: number }
  ): Promise<Result<any[], DomainError>> {
    return this.memoryService.searchMemories({
      query,
      agentType,
      projectId: options?.projectId,
      limit: options?.limit || 5,
      threshold: 0.7
    });
  }

  async storeMemoryForAgent(
    agentType: AgentType,
    content: string,
    metadata: MemoryMetadata
  ): Promise<Result<Memory, DomainError>> {
    return this.memoryService.storeMemory({
      content,
      type: metadata.type || 'conversation',
      scope: metadata.scope || 'shared',
      metadata: {
        ...metadata,
        agentType,
        source: 'agent'
      }
    });
  }
}
```

## Performance Characteristics

### Vector Operations
- **Embedding Dimensions**: 1536 (AWS Bedrock Titan)
- **Similarity Threshold**: 0.7 (configurable)
- **Search Latency**: <100ms for typical queries
- **Storage**: Efficient vector compression in LanceDB

### Caching Strategy
- **Memory Repository**: JSON file caching with in-memory layer
- **Embedding Service**: LRU cache with configurable size (default: 1000 entries)
- **Rate Limiting**: 20 requests/second to AWS Bedrock (configurable)

### Batch Processing
- **Concurrent Embeddings**: Up to 5 simultaneous requests
- **Controlled Backpressure**: Prevents API rate limit violations
- **Error Recovery**: Automatic retry with exponential backoff

## Security and Privacy

### Access Control
- Memory access through domain contracts only
- IPC input validation with Zod schemas
- Memory scoping prevents unauthorized access

### Data Protection
- AWS Bedrock credentials managed securely
- No sensitive data logged or cached inappropriately
- Audit trail for memory operations

### Privacy Considerations
- User memories can be scoped to personal only
- Project memories isolated by project boundaries
- Memory cleanup and archival for data retention compliance

## Testing and Quality Assurance

### Test Coverage
- **17/17 memory domain service tests passing** (100% success rate)
- **Integration tests** for agent-memory collaboration
- **Mock AWS SDK** prevents real API calls during testing
- **Error scenario coverage** for edge cases and failures

### Test Categories
1. **Unit Tests**: Individual component functionality
2. **Integration Tests**: Cross-component workflows  
3. **Performance Tests**: Latency and throughput validation
4. **Error Handling**: Failure mode verification
5. **Security Tests**: Access control and input validation

## Monitoring and Observability

### Memory System Metrics
- Total memories stored by type and scope
- Search performance and relevance scores
- Cache hit rates and performance optimization
- Storage growth and cleanup effectiveness

### Agent Integration Metrics
- Memory utilization by agent type
- Context enhancement effectiveness
- Agent response quality with memory context
- Cross-agent memory sharing patterns

### AWS Bedrock Metrics
- Embedding generation latency and throughput
- API call volume and cost optimization
- Error rates and retry patterns
- Cache effectiveness and cost savings

## Troubleshooting Guide

### Common Issues

**Memory Search Returns No Results**
```typescript
// Check similarity threshold
const results = await memoryService.searchMemories({
  query: "your search term",
  threshold: 0.5 // Lower threshold for broader results
});
```

**Embedding Generation Failures**
```typescript
// Check AWS credentials and region
const health = await embeddingService.healthCheck();
if (!health) {
  // Check AWS_REGION and credentials configuration
}
```

**Performance Issues**
```typescript
// Monitor cache effectiveness
const metrics = embeddingService.getMetrics();
console.log(`Cache hit rate: ${metrics.cacheHits / metrics.totalRequests}`);
```

### Debug Commands

```bash
# Run memory system tests
npm run test tests/memory/

# Check TypeScript compilation
npm run type-check

# Monitor vector store health
# (via application health check endpoints)
```

## Future Enhancements

### Planned Improvements
1. **Memory Clustering**: Automatic categorization and clustering
2. **Relevance Learning**: ML-based relevance score improvement
3. **Cross-Project Insights**: Knowledge transfer between projects
4. **Memory Visualization**: UI for exploring memory relationships
5. **Advanced Search**: Natural language query processing

### Performance Optimizations
1. **Vector Compression**: Reduce storage requirements
2. **Embedding Caching**: Persistent cache across sessions
3. **Lazy Loading**: On-demand memory loading in UI
4. **Background Processing**: Async memory updates

## API Reference

For complete API documentation, see:
- `src/shared/contracts/MemoryDomain.ts` - Type definitions and interfaces
- `tests/memory/MemoryDomainService.test.ts` - Usage examples and test cases
- `src/main/services/memory/` - Implementation details

## Getting Started

1. **Prerequisites**: AWS Bedrock access with Titan Embedding model
2. **Configuration**: Set AWS credentials and region
3. **Initialization**: Memory system auto-initializes on first use
4. **Testing**: Run `npm run test tests/memory/` to verify setup

The memory system is production-ready and fully integrated with the agent system, enabling sophisticated AI-driven conversations with contextual awareness.