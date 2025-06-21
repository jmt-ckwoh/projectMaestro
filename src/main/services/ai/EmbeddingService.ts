/**
 * Embedding Service
 * 
 * Provides text embedding generation using AWS Bedrock Titan Embedding model.
 * Handles caching, rate limiting, and error recovery.
 */

import { 
  BedrockRuntimeClient, 
  InvokeModelCommand,
  InvokeModelCommandInput 
} from '@aws-sdk/client-bedrock-runtime'
import { fromIni } from '@aws-sdk/credential-provider-ini'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import { DomainError, Err, GenericDomainError, Ok, Result } from '../../../shared/contracts/common'

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface EmbeddingRequest {
  readonly text: string
  readonly model?: string
  readonly dimensions?: number
  readonly normalize?: boolean
}

export interface EmbeddingResponse {
  readonly embedding: number[]
  readonly model: string
  readonly dimensions: number
  readonly tokenCount: number
}

export interface EmbeddingServiceConfig {
  readonly region: string
  readonly model: string
  readonly maxRetries: number
  readonly timeoutMs: number
  readonly cacheSize: number
  readonly rateLimitPerSecond: number
  readonly enableCache: boolean
  readonly enableRateLimit: boolean
}

export interface EmbeddingCache {
  readonly embedding: number[]
  readonly model: string
  readonly dimensions: number
  readonly createdAt: Date
  readonly accessCount: number
}

export interface EmbeddingMetrics {
  readonly totalRequests: number
  readonly cacheHits: number
  readonly cacheMisses: number
  readonly totalTokens: number
  readonly averageLatency: number
  readonly errorCount: number
  readonly rateLimitHits: number
}

// =============================================================================
// Error Types
// =============================================================================

export class EmbeddingError extends DomainError {
  constructor(
    public readonly code: string, 
    message: string, 
    cause?: Error
  ) {
    super(message, cause)
  }
  
  readonly domain = 'embedding'
}

export class EmbeddingRateLimitError extends EmbeddingError {
  constructor(message: string) {
    super('EMBEDDING_RATE_LIMIT', message)
  }
}

export class EmbeddingModelError extends EmbeddingError {
  constructor(message: string, cause?: Error) {
    super('EMBEDDING_MODEL_ERROR', message, cause)
  }
}

export class EmbeddingValidationError extends EmbeddingError {
  constructor(message: string) {
    super('EMBEDDING_VALIDATION_ERROR', message)
  }
}

// =============================================================================
// Embedding Service Implementation
// =============================================================================

export class EmbeddingService {
  private readonly client: BedrockRuntimeClient
  private readonly cache = new Map<string, EmbeddingCache>()
  private readonly rateLimitTracker: number[] = []
  private readonly metrics: EmbeddingMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTokens: 0,
    averageLatency: 0,
    errorCount: 0,
    rateLimitHits: 0
  }

  constructor(private readonly config: EmbeddingServiceConfig) {
    // Initialize Bedrock client with proper configuration
    this.client = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: fromIni(),
      requestHandler: new NodeHttpHandler({
        requestTimeout: this.config.timeoutMs,
        connectionTimeout: 5000,
        socketTimeout: this.config.timeoutMs
      }),
      retryMode: 'adaptive',
      maxAttempts: this.config.maxRetries
    })
  }

  // =============================================================================
  // Public API
  // =============================================================================

  /**
   * Generate embedding for text
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<Result<EmbeddingResponse, DomainError>> {
    const startTime = Date.now()
    
    try {
      // Validate input
      const validation = this.validateRequest(request)
      if (!validation.success) {
        return validation
      }

      // Check rate limiting
      if (this.config.enableRateLimit && !this.checkRateLimit()) {
        this.updateMetrics({ rateLimitHits: 1 })
        return Err(new EmbeddingRateLimitError('Rate limit exceeded'))
      }

      // Check cache
      if (this.config.enableCache) {
        const cached = this.getCachedEmbedding(request.text, request.model)
        if (cached) {
          this.updateMetrics({ 
            totalRequests: 1, 
            cacheHits: 1,
            averageLatency: Date.now() - startTime
          })
          return Ok(cached)
        }
      }

      // Generate embedding using Bedrock
      const result = await this.callBedrockEmbedding(request)
      
      if (result.success) {
        // Cache the result
        if (this.config.enableCache) {
          this.cacheEmbedding(request.text, request.model || this.config.model, result.data)
        }

        // Update metrics
        this.updateMetrics({ 
          totalRequests: 1, 
          cacheMisses: 1,
          totalTokens: result.data.tokenCount,
          averageLatency: Date.now() - startTime
        })

        return result
      } else {
        this.updateMetrics({ 
          totalRequests: 1, 
          errorCount: 1,
          averageLatency: Date.now() - startTime
        })
        return result
      }
    } catch (error) {
      this.updateMetrics({ 
        totalRequests: 1, 
        errorCount: 1,
        averageLatency: Date.now() - startTime
      })
      return Err(new GenericDomainError(
        'EMBEDDING_GENERATION_FAILED', 
        'embedding', 
        'Failed to generate embedding', 
        error as Error
      ))
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(
    texts: string[], 
    options?: { model?: string; dimensions?: number }
  ): Promise<Result<EmbeddingResponse[], DomainError>> {
    const results: EmbeddingResponse[] = []
    const errors: DomainError[] = []

    // Process in parallel with controlled concurrency
    const concurrency = 5
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency)
      const batchPromises = batch.map(text => 
        this.generateEmbedding({ 
          text, 
          model: options?.model,
          dimensions: options?.dimensions 
        })
      )

      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value.data)
        } else if (result.status === 'fulfilled' && !result.value.success) {
          errors.push(result.value.error)
        } else {
          errors.push(new GenericDomainError(
            'BATCH_EMBEDDING_FAILED', 
            'embedding', 
            'Batch embedding failed'
          ))
        }
      }
    }

    if (errors.length === texts.length) {
      return Err(new GenericDomainError(
        'ALL_EMBEDDINGS_FAILED', 
        'embedding', 
        'All embedding requests failed'
      ))
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${texts.length} embedding requests failed`)
    }

    return Ok(results)
  }

  /**
   * Get service metrics
   */
  getMetrics(): EmbeddingMetrics {
    return { ...this.metrics }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResult = await this.generateEmbedding({ 
        text: 'health check test' 
      })
      return testResult.success
    } catch {
      return false
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cache.clear()
    this.rateLimitTracker.length = 0
    // Bedrock client doesn't require explicit cleanup
  }

  // =============================================================================
  // Private Implementation
  // =============================================================================

  private validateRequest(request: EmbeddingRequest): Result<void, DomainError> {
    if (!request.text || request.text.trim().length === 0) {
      return Err(new EmbeddingValidationError('Text cannot be empty'))
    }

    if (request.text.length > 8192) {
      return Err(new EmbeddingValidationError('Text exceeds maximum length of 8192 characters'))
    }

    if (request.dimensions && (request.dimensions < 1 || request.dimensions > 1536)) {
      return Err(new EmbeddingValidationError('Dimensions must be between 1 and 1536'))
    }

    return Ok(undefined)
  }

  private async callBedrockEmbedding(
    request: EmbeddingRequest
  ): Promise<Result<EmbeddingResponse, DomainError>> {
    try {
      const model = request.model || this.config.model
      
      // Prepare the request body for Titan Embedding model
      const requestBody = {
        inputText: request.text,
        dimensions: request.dimensions || 1536,
        normalize: request.normalize ?? true
      }

      const command: InvokeModelCommandInput = {
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
      }

      const response = await this.client.send(new InvokeModelCommand(command))
      
      if (!response.body) {
        return Err(new EmbeddingModelError('No response body from Bedrock'))
      }

      // Parse the response
      const responseText = new TextDecoder().decode(response.body)
      const responseData = JSON.parse(responseText)

      if (!responseData.embedding || !Array.isArray(responseData.embedding)) {
        return Err(new EmbeddingModelError('Invalid embedding response format'))
      }

      const embeddingResponse: EmbeddingResponse = {
        embedding: responseData.embedding,
        model,
        dimensions: responseData.embedding.length,
        tokenCount: this.estimateTokenCount(request.text)
      }

      return Ok(embeddingResponse)
    } catch (error) {
      console.error('Bedrock embedding error:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('throttling') || error.message.includes('rate limit')) {
          return Err(new EmbeddingRateLimitError('Bedrock rate limit exceeded'))
        } else if (error.message.includes('timeout')) {
          return Err(new EmbeddingModelError('Bedrock request timeout'))
        } else if (error.message.includes('unauthorized') || error.message.includes('credentials')) {
          return Err(new EmbeddingModelError('Bedrock authentication failed'))
        }
      }

      return Err(new EmbeddingModelError('Bedrock embedding request failed', error as Error))
    }
  }

  private getCachedEmbedding(text: string, model?: string): EmbeddingResponse | null {
    const cacheKey = this.getCacheKey(text, model || this.config.model)
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return null
    }

    // Update access count
    this.cache.set(cacheKey, {
      ...cached,
      accessCount: cached.accessCount + 1
    })

    return {
      embedding: cached.embedding,
      model: cached.model,
      dimensions: cached.dimensions,
      tokenCount: this.estimateTokenCount(text)
    }
  }

  private cacheEmbedding(text: string, model: string, response: EmbeddingResponse): void {
    const cacheKey = this.getCacheKey(text, model)
    
    // Check cache size limit
    if (this.cache.size >= this.config.cacheSize) {
      // Remove least recently used entry
      const oldestKey = this.findLeastRecentlyUsed()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(cacheKey, {
      embedding: response.embedding,
      model: response.model,
      dimensions: response.dimensions,
      createdAt: new Date(),
      accessCount: 1
    })
  }

  private getCacheKey(text: string, model: string): string {
    // Create a simple hash of text and model for cache key
    const content = `${model}:${text}`
    return Buffer.from(content).toString('base64').slice(0, 64)
  }

  private findLeastRecentlyUsed(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    let lowestAccessCount = Infinity

    for (const [key, cached] of this.cache) {
      if (cached.accessCount < lowestAccessCount || 
          (cached.accessCount === lowestAccessCount && cached.createdAt.getTime() < oldestTime)) {
        oldestKey = key
        oldestTime = cached.createdAt.getTime()
        lowestAccessCount = cached.accessCount
      }
    }

    return oldestKey
  }

  private checkRateLimit(): boolean {
    const now = Date.now()
    const windowStart = now - 1000 // 1 second window
    
    // Remove old entries
    while (this.rateLimitTracker.length > 0 && this.rateLimitTracker[0] < windowStart) {
      this.rateLimitTracker.shift()
    }

    // Check if we're under the limit
    if (this.rateLimitTracker.length >= this.config.rateLimitPerSecond) {
      return false
    }

    // Add current request
    this.rateLimitTracker.push(now)
    return true
  }

  private updateMetrics(updates: Partial<EmbeddingMetrics>): void {
    Object.assign(this.metrics, {
      totalRequests: this.metrics.totalRequests + (updates.totalRequests || 0),
      cacheHits: this.metrics.cacheHits + (updates.cacheHits || 0),
      cacheMisses: this.metrics.cacheMisses + (updates.cacheMisses || 0),
      totalTokens: this.metrics.totalTokens + (updates.totalTokens || 0),
      errorCount: this.metrics.errorCount + (updates.errorCount || 0),
      rateLimitHits: this.metrics.rateLimitHits + (updates.rateLimitHits || 0),
      averageLatency: updates.averageLatency 
        ? (this.metrics.averageLatency + updates.averageLatency) / 2 
        : this.metrics.averageLatency
    })
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }
}

// =============================================================================
// Configuration and Factory
// =============================================================================

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingServiceConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  model: 'amazon.titan-embed-text-v1',
  maxRetries: 3,
  timeoutMs: 30000,
  cacheSize: 1000,
  rateLimitPerSecond: 20,
  enableCache: true,
  enableRateLimit: true
}

export function createEmbeddingService(
  config?: Partial<EmbeddingServiceConfig>
): EmbeddingService {
  const fullConfig = { ...DEFAULT_EMBEDDING_CONFIG, ...config }
  return new EmbeddingService(fullConfig)
}

export default EmbeddingService