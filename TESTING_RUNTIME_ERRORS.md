# Runtime Error Detection Testing Guide

**CRITICAL**: This guide addresses the testing gaps that allowed critical runtime errors to go undetected during development.

## Testing Failure Analysis

On 2025-06-21, critical runtime issues were missed during development testing, including:
- Missing IPC handlers causing "No handler registered" errors
- React infinite loops causing app crashes  
- Duplicate handler registration preventing backend initialization

These were only discovered through user manual testing, which is unacceptable.

## Mandatory Runtime Error Testing

### 1. Console Error Detection (REQUIRED)

```javascript
// ✅ CORRECT - Always monitor console errors
const errors = [];
const warnings = [];

window.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push({
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    });
  }
  if (msg.type() === 'warning') {
    warnings.push(msg.text());
  }
});

// Wait for app initialization
await window.waitForTimeout(5000);

// VALIDATE: Zero critical errors
expect(errors.filter(e => 
  !e.text.includes('DevTools') && 
  !e.text.includes('X-Frame-Options')
)).toHaveLength(0);
```

### 2. IPC Handler Validation (REQUIRED)

```javascript
// ✅ Test ALL IPC operations used by stores
const ipcTests = [
  { channel: 'app:info', expectedKeys: ['name', 'version'] },
  { channel: 'app:health', expectedKeys: ['status'] },
  { channel: 'project:list', expectedKeys: ['success', 'projects'] },
  { channel: 'agent:status:all', expectedKeys: ['success', 'statuses'] },
  { channel: 'ui:load-state', expectedKeys: ['success', 'state'] },
  { channel: 'chat:load-history', expectedKeys: ['success'] },
  { channel: 'chat:load-threads', expectedKeys: ['success'] }
];

for (const test of ipcTests) {
  try {
    const result = await window.evaluate(async (channel) => {
      return await window.api[channel.replace(':', '').replace('-', '')]?.() || 
             await window.api.invoke?.(channel);
    }, test.channel);
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    
    // Validate expected structure
    test.expectedKeys.forEach(key => {
      expect(result).toHaveProperty(key);
    });
    
    console.log(`✅ IPC Handler working: ${test.channel}`);
  } catch (error) {
    throw new Error(`❌ IPC Handler failed: ${test.channel} - ${error.message}`);
  }
}
```

### 3. Store Initialization Validation (REQUIRED)

```javascript
// ✅ Test store initialization and state management
const storeTests = [
  {
    name: 'ChatStore',
    test: async () => {
      // Trigger store operations that use IPC
      await window.evaluate(() => {
        // Simulate what happens on app startup
        const store = window.__STORES__?.chatStore;
        if (store) {
          // These should not throw errors
          store.getState().loadChatHistory?.();
          store.getState().loadThreadHistory?.();
        }
      });
    }
  },
  {
    name: 'AgentStore', 
    test: async () => {
      await window.evaluate(() => {
        const store = window.__STORES__?.agentStore;
        if (store) {
          store.getState().loadAgentState?.();
          store.getState().initializeDefaultTeam?.();
        }
      });
    }
  },
  {
    name: 'ProjectStore',
    test: async () => {
      await window.evaluate(() => {
        const store = window.__STORES__?.projectStore;
        if (store) {
          store.getState().loadProjects?.();
        }
      });
    }
  }
];

for (const storeTest of storeTests) {
  try {
    await storeTest.test();
    console.log(`✅ Store working: ${storeTest.name}`);
  } catch (error) {
    throw new Error(`❌ Store failed: ${storeTest.name} - ${error.message}`);
  }
}
```

### 4. React Error Boundary Testing (REQUIRED)

```javascript
// ✅ Test for React infinite loops and crashes
test('should not have React infinite loops', async ({ window }) => {
  const reactErrors = [];
  
  window.on('console', msg => {
    if (msg.type() === 'error' && (
      msg.text().includes('Maximum update depth') ||
      msg.text().includes('infinite loop') ||
      msg.text().includes('setState inside render')
    )) {
      reactErrors.push(msg.text());
    }
  });
  
  // Trigger component interactions that could cause loops
  const chatInput = window.locator('textarea, input[placeholder*="message"]');
  if (await chatInput.isVisible()) {
    await chatInput.fill('Test message');
    await window.waitForTimeout(1000);
    await chatInput.clear();
  }
  
  // Navigate between views
  const getStartedBtn = window.locator('button:has-text("Get Started")');
  if (await getStartedBtn.isVisible()) {
    await getStartedBtn.click();
    await window.waitForTimeout(2000);
  }
  
  expect(reactErrors).toHaveLength(0);
});
```

### 5. Backend Service Health Check (REQUIRED)

```javascript
// ✅ Validate all backend services initialize correctly
test('should initialize all backend services', async ({ window }) => {
  // Wait for backend initialization
  await window.waitForTimeout(8000);
  
  const healthCheck = await window.evaluate(async () => {
    try {
      const appInfo = await window.api.getAppInfo();
      const healthStatus = await window.api.checkHealth();
      
      return {
        hasAppInfo: !!appInfo,
        hasHealthStatus: !!healthStatus,
        isHealthy: healthStatus?.status === 'healthy'
      };
    } catch (error) {
      return {
        error: error.message,
        hasAppInfo: false,
        hasHealthStatus: false,
        isHealthy: false
      };
    }
  });
  
  expect(healthCheck.hasAppInfo).toBe(true);
  expect(healthCheck.hasHealthStatus).toBe(true);
  expect(healthCheck.isHealthy).toBe(true);
  expect(healthCheck.error).toBeUndefined();
});
```

## Required Test Execution Order

1. **Console Error Detection** - Must run continuously during all tests
2. **Backend Service Health** - Validate before any UI testing
3. **IPC Handler Validation** - Test all channels used by stores
4. **Store Initialization** - Ensure stores can load without errors
5. **React Error Boundary** - Check for infinite loops during interactions
6. **User Flow Testing** - Test actual user scenarios end-to-end

## Test Failure Criteria

Tests MUST fail if:
- ✅ Any console.error() messages (except known exceptions)
- ✅ Any "No handler registered" IPC errors
- ✅ Any React infinite loop warnings
- ✅ Any store initialization failures
- ✅ Backend services report unhealthy status
- ✅ Missing expected data structures in IPC responses

## Exception Handling

Acceptable errors that can be ignored:
- ✅ `X-Frame-Options may only be set via an HTTP header` (browser security warning)
- ✅ `Download the React DevTools` (development helper message)
- ✅ Electron DevTools connection messages

All other errors indicate critical issues.

## Integration with CI/CD

```yaml
# Required test commands for CI/CD
- name: Runtime Error Detection Tests
  run: |
    npm run test:runtime-errors
    npm run test:ipc-handlers
    npm run test:store-initialization
    npm run test:react-errors
```

## Developer Workflow

Before any PR:
1. Run runtime error detection tests
2. Manually test user flows that trigger IPC calls
3. Check browser console for any error messages
4. Validate all stores initialize without issues

**Failure to follow this guide will result in runtime errors reaching users.**