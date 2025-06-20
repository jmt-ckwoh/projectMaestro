# Security Model & IPC Validation

**CRITICAL: These security rules prevent privilege escalation and data breaches. All IPC handlers MUST follow these patterns.**

## Threat Model

### Attack Vectors
1. **Malicious IPC Calls** - Renderer attempting unauthorized operations
2. **Path Traversal** - Accessing files outside project boundaries  
3. **Code Injection** - Injecting malicious code via agent prompts
4. **Memory Exhaustion** - DoS attacks via large payloads
5. **API Key Theft** - Extracting stored credentials
6. **Agent Hijacking** - Manipulating agent behavior for malicious purposes

### Trust Boundaries
```
User Input → Renderer (UNTRUSTED) → Preload (SANITIZE) → Main (TRUSTED) → External APIs
```

## IPC Security Architecture

### 1. Input Validation Layer
```typescript
// MANDATORY: All IPC handlers MUST validate inputs
import { z } from 'zod'
import { validateInput, SecurityError } from '@/security'

// ✅ CORRECT - Comprehensive validation
ipcMain.handle('create-project', async (event, input) => {
  // 1. Schema validation
  const validatedInput = validateInput(CreateProjectSchema, input)
  
  // 2. Security context validation
  const context = await getSecurityContext(event)
  if (!context.hasPermission('project:create')) {
    throw new SecurityError('INSUFFICIENT_PERMISSIONS', 'Project creation not allowed')
  }
  
  // 3. Rate limiting
  await rateLimiter.checkLimit(context.sessionId, 'project:create', 5, 60000)
  
  // 4. Business logic
  return await projectService.create(validatedInput)
})
```

### 2. Path Security
```typescript
// MANDATORY: All file operations MUST be within safe boundaries
import { validatePath, PROJECT_BOUNDARIES } from '@/security/path'

const safeReadFile = async (projectId: string, relativePath: string): Promise<string> => {
  // 1. Validate project ownership
  await validateProjectAccess(projectId)
  
  // 2. Sanitize path
  const safePath = validatePath(relativePath, {
    allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'],
    maxDepth: 10,
    preventTraversal: true
  })
  
  // 3. Ensure within project boundary
  const fullPath = path.join(PROJECT_BOUNDARIES.getProjectRoot(projectId), safePath)
  if (!fullPath.startsWith(PROJECT_BOUNDARIES.getProjectRoot(projectId))) {
    throw new SecurityError('PATH_TRAVERSAL', 'Path outside project boundary')
  }
  
  // 4. Size limits
  const stats = await fs.stat(fullPath)
  if (stats.size > MAX_FILE_SIZE) {
    throw new SecurityError('FILE_TOO_LARGE', `File exceeds ${MAX_FILE_SIZE} bytes`)
  }
  
  return await fs.readFile(fullPath, 'utf-8')
}
```

### 3. Agent Security
```typescript
// MANDATORY: Agent prompts MUST be sanitized
import { sanitizePrompt, validateAgentRequest } from '@/security/agent'

const sendAgentMessage = async (input: AgentMessageInput): Promise<AgentResponse> => {
  // 1. Validate agent availability
  const agent = await validateAgentRequest(input.agentType, input.projectId)
  
  // 2. Sanitize message content
  const sanitizedMessage = sanitizePrompt(input.message, {
    maxLength: 10000,
    preventCodeInjection: true,
    preventPromptInjection: true,
    allowedTags: ['code', 'pre']
  })
  
  // 3. Context validation
  if (input.context) {
    validateMessageContext(input.context)
  }
  
  // 4. Rate limiting per agent
  await rateLimiter.checkAgentLimit(input.agentType, 10, 60000)
  
  return await agentService.processMessage(agent, sanitizedMessage, input.context)
}
```

## Validation Schemas

### Input Validation
```typescript
// Project creation
export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters in name'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  template: z.enum(['blank', 'react', 'node', 'python'])
    .optional()
    .default('blank')
})

// Agent message
export const AgentMessageSchema = z.object({
  agentType: z.nativeEnum(AgentType),
  message: z.string()
    .min(1, 'Message required')
    .max(10000, 'Message too long'),
  projectId: z.string().uuid('Invalid project ID'),
  taskId: z.string().uuid('Invalid task ID').optional(),
  context: z.object({
    referencedFiles: z.array(z.string()).max(10, 'Too many referenced files'),
    previousMessages: z.array(z.string()).max(5, 'Too many previous messages')
  }).optional()
})

// File operations
export const FileOperationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  path: z.string()
    .min(1, 'Path required')
    .max(500, 'Path too long')
    .regex(/^[^<>:"|?*\x00-\x1f]+$/, 'Invalid path characters'),
  content: z.string()
    .max(1024 * 1024, 'File too large') // 1MB limit
    .optional()
})
```

### Content Sanitization
```typescript
// Prompt injection prevention
export const sanitizePrompt = (input: string, options: SanitizeOptions): string => {
  let sanitized = input
  
  // Remove potential prompt injections
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /system\s*:\s*/gi,
    /assistant\s*:\s*/gi,
    /<\s*script[^>]*>/gi,
    /javascript\s*:/gi,
    /data\s*:/gi
  ]
  
  injectionPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })
  
  // Length limits
  if (sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength) + '...[TRUNCATED]'
  }
  
  // HTML/XML sanitization
  if (options.preventCodeInjection) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
  
  return sanitized
}
```

## Rate Limiting

### Per-Operation Limits
```typescript
export const RATE_LIMITS = {
  // Project operations
  'project:create': { count: 5, windowMs: 60000 },
  'project:delete': { count: 2, windowMs: 60000 },
  
  // Agent operations
  'agent:message': { count: 30, windowMs: 60000 },
  'agent:status': { count: 60, windowMs: 60000 },
  
  // File operations
  'file:read': { count: 100, windowMs: 60000 },
  'file:write': { count: 50, windowMs: 60000 },
  
  // Memory operations
  'memory:search': { count: 20, windowMs: 60000 },
  'memory:add': { count: 10, windowMs: 60000 }
} as const

export class RateLimiter {
  private windows = new Map<string, RateWindow>()
  
  async checkLimit(
    identifier: string, 
    operation: keyof typeof RATE_LIMITS, 
    customCount?: number, 
    customWindow?: number
  ): Promise<void> {
    const limit = RATE_LIMITS[operation]
    const count = customCount ?? limit.count
    const windowMs = customWindow ?? limit.windowMs
    
    const key = `${identifier}:${operation}`
    const now = Date.now()
    const window = this.windows.get(key)
    
    if (!window || now - window.startTime > windowMs) {
      this.windows.set(key, { startTime: now, count: 1 })
      return
    }
    
    if (window.count >= count) {
      throw new SecurityError(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit exceeded for ${operation}: ${count}/${windowMs}ms`
      )
    }
    
    window.count++
  }
}
```

## Permission System

### Security Context
```typescript
export interface SecurityContext {
  readonly sessionId: string
  readonly permissions: Set<Permission>
  readonly projectAccess: Set<string>
  readonly rateLimits: Map<string, RateWindow>
  readonly createdAt: Date
  readonly lastActivity: Date
}

export type Permission = 
  | 'project:create' | 'project:read' | 'project:update' | 'project:delete'
  | 'agent:message' | 'agent:configure' | 'agent:status'
  | 'file:read' | 'file:write' | 'file:delete'
  | 'memory:read' | 'memory:write'
  | 'git:read' | 'git:write'

export const getSecurityContext = async (event: IpcMainInvokeEvent): Promise<SecurityContext> => {
  const sessionId = getSessionId(event)
  
  // Load or create security context
  let context = sessionStore.get(sessionId)
  if (!context) {
    context = createDefaultSecurityContext(sessionId)
    sessionStore.set(sessionId, context)
  }
  
  // Update last activity
  context.lastActivity = new Date()
  
  return context
}

const createDefaultSecurityContext = (sessionId: string): SecurityContext => ({
  sessionId,
  permissions: new Set([
    // Default permissions for renderer
    'project:create', 'project:read', 'project:update',
    'agent:message', 'agent:status',
    'file:read', 'file:write',
    'memory:read', 'memory:write',
    'git:read', 'git:write'
  ]),
  projectAccess: new Set(),
  rateLimits: new Map(),
  createdAt: new Date(),
  lastActivity: new Date()
})
```

### Project Access Control
```typescript
export const validateProjectAccess = async (
  projectId: string,
  permission: Permission,
  context: SecurityContext
): Promise<void> => {
  // Check if user has access to this project
  if (!context.projectAccess.has(projectId)) {
    // Verify project ownership
    const project = await projectRepository.findById(projectId)
    if (!project) {
      throw new SecurityError('PROJECT_NOT_FOUND', 'Project does not exist')
    }
    
    // Add to access list (simplified - in real app, check ownership)
    context.projectAccess.add(projectId)
  }
  
  // Check specific permission
  if (!context.permissions.has(permission)) {
    throw new SecurityError(
      'INSUFFICIENT_PERMISSIONS',
      `Permission ${permission} required for project ${projectId}`
    )
  }
}
```

## Credential Management

### API Key Security
```typescript
import { safeStorage } from 'electron'

export class CredentialManager {
  private static readonly KEY_PREFIX = 'maestro_'
  
  static async storeAPIKey(provider: string, key: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new SecurityError(
        'ENCRYPTION_UNAVAILABLE',
        'System encryption not available for credential storage'
      )
    }
    
    // Validate key format
    this.validateAPIKey(provider, key)
    
    // Encrypt and store
    const encrypted = safeStorage.encryptString(key)
    await this.secureStore(`${this.KEY_PREFIX}${provider}`, encrypted)
    
    // Log access (without key value)
    this.auditLog('credential.stored', { provider })
  }
  
  static async getAPIKey(provider: string): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }
    
    const encrypted = await this.secureRetrieve(`${this.KEY_PREFIX}${provider}`)
    if (!encrypted) {
      return null
    }
    
    // Decrypt
    const decrypted = safeStorage.decryptString(encrypted)
    
    // Log access (without key value)
    this.auditLog('credential.accessed', { provider })
    
    return decrypted
  }
  
  private static validateAPIKey(provider: string, key: string): void {
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9\-_]{95,}$/,
      bedrock: /^[A-Z0-9]{20}$/ // Access Key ID pattern
    }
    
    const pattern = patterns[provider as keyof typeof patterns]
    if (pattern && !pattern.test(key)) {
      throw new SecurityError('INVALID_API_KEY', `Invalid API key format for ${provider}`)
    }
  }
}
```

## Audit Logging

### Security Events
```typescript
export interface SecurityAuditEvent {
  readonly timestamp: Date
  readonly eventType: string
  readonly sessionId: string
  readonly details: Record<string, unknown>
  readonly severity: 'info' | 'warning' | 'error' | 'critical'
}

export class SecurityAuditor {
  private static events: SecurityAuditEvent[] = []
  
  static log(
    eventType: string,
    details: Record<string, unknown>,
    severity: SecurityAuditEvent['severity'] = 'info'
  ): void {
    const event: SecurityAuditEvent = {
      timestamp: new Date(),
      eventType,
      sessionId: getCurrentSessionId(),
      details,
      severity
    }
    
    this.events.push(event)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${severity.toUpperCase()}: ${eventType}`, details)
    }
    
    // Alert on critical events
    if (severity === 'critical') {
      this.handleCriticalEvent(event)
    }
    
    // Cleanup old events
    this.cleanupOldEvents()
  }
  
  private static handleCriticalEvent(event: SecurityAuditEvent): void {
    // In production, this might send alerts, block sessions, etc.
    console.error('[CRITICAL SECURITY EVENT]', event)
  }
}
```

## Implementation Checklist

### For Every IPC Handler:
- [ ] Input validation with Zod schema
- [ ] Security context validation
- [ ] Rate limiting applied
- [ ] Permission checking
- [ ] Path validation (if file operations)
- [ ] Content sanitization (if user input)
- [ ] Error handling without information leakage
- [ ] Audit logging

### For Every Agent Operation:
- [ ] Prompt sanitization
- [ ] Context validation
- [ ] Agent availability check
- [ ] Response filtering
- [ ] Resource usage monitoring

### For Every File Operation:
- [ ] Path traversal prevention
- [ ] Project boundary enforcement
- [ ] File size limits
- [ ] Extension validation
- [ ] Content scanning (if executable)

**Security violations will result in immediate PR rejection and security review.**