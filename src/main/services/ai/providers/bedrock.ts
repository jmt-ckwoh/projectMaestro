/**
 * AWS Bedrock Provider
 * 
 * LLM provider implementation for AWS Bedrock service.
 * Supports Claude models for agent conversations and embeddings.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { LLMProvider } from '../../agents/base/Agent'

export interface BedrockConfig {
  readonly region: string
  readonly accessKeyId?: string
  readonly secretAccessKey?: string
  readonly modelId: string
  readonly maxTokens: number
  readonly temperature: number
}

export interface BedrockMessage {
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
}

export interface BedrockResponse {
  readonly content: string
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
  }
}

export class BedrockProvider implements LLMProvider {
  private readonly client: BedrockRuntimeClient
  private readonly config: BedrockConfig

  constructor(config: BedrockConfig) {
    this.config = config
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      } : undefined
    })
  }

  async chat(messages: BedrockMessage[], options?: Partial<BedrockConfig>): Promise<string> {
    try {
      const modelId = options?.modelId || this.config.modelId
      const maxTokens = options?.maxTokens || this.config.maxTokens
      const temperature = options?.temperature || this.config.temperature

      // Convert messages to Claude format
      const claudeMessages = this.formatMessagesForClaude(messages)
      
      const body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: claudeMessages
      })

      const command = new InvokeModelCommand({
        modelId,
        body,
        contentType: 'application/json',
        accept: 'application/json'
      })

      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))

      if (!responseBody.content || !responseBody.content[0]) {
        throw new Error('Invalid response from Bedrock')
      }

      return responseBody.content[0].text
    } catch (error) {
      console.error('Bedrock chat error:', error)
      throw new Error(`Bedrock provider error: ${(error as Error).message}`)
    }
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // For now, return a mock embedding
    // In real implementation, this would use Bedrock's embedding models
    console.warn('generateEmbedding not implemented for Bedrock provider')
    return new Array(1536).fill(0).map(() => Math.random())
  }

  isAvailable(): boolean {
    try {
      return !!this.client && !!this.config.modelId
    } catch {
      return false
    }
  }

  private formatMessagesForClaude(messages: BedrockMessage[]): any[] {
    const claudeMessages: any[] = []
    let systemMessage = ''

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessage = message.content
      } else {
        claudeMessages.push({
          role: message.role,
          content: message.content
        })
      }
    }

    // Add system message as the first user message if present
    if (systemMessage && claudeMessages.length > 0) {
      claudeMessages[0] = {
        role: 'user',
        content: `${systemMessage}\n\n${claudeMessages[0].content}`
      }
    }

    return claudeMessages
  }
}

export const createBedrockProvider = (config: BedrockConfig): BedrockProvider => {
  return new BedrockProvider(config)
}

export const DEFAULT_BEDROCK_CONFIG: BedrockConfig = {
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: 4096,
  temperature: 0.7
}

export default BedrockProvider
