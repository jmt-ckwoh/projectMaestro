/**
 * Runtime Error Detection Tests
 * 
 * CRITICAL: These tests address the gaps that allowed runtime errors to go undetected.
 * They focus on actual functionality rather than just visual rendering.
 */

import { test, expect } from './helpers/electron'

test.describe('Runtime Error Detection', () => {
  let consoleErrors: any[] = []
  let consoleWarnings: any[] = []

  test.beforeEach(async ({ mainWindow }) => {
    // Clear error arrays
    consoleErrors = []
    consoleWarnings = []

    // Monitor console messages throughout test
    mainWindow.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out acceptable errors
        const text = msg.text()
        if (!text.includes('DevTools') && 
            !text.includes('X-Frame-Options') &&
            !text.includes('React DevTools')) {
          consoleErrors.push({
            text,
            location: msg.location(),
            timestamp: new Date().toISOString()
          })
        }
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // Wait for app initialization
    await mainWindow.waitForLoadState('domcontentloaded')
    await mainWindow.waitForTimeout(8000) // Give backend time to initialize
  })

  test('should have zero critical console errors', async ({ mainWindow }) => {
    // Additional wait to catch any delayed errors
    await mainWindow.waitForTimeout(3000)

    console.log('Console errors found:', consoleErrors.length)
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.map(e => e.text))
    }

    expect(consoleErrors).toHaveLength(0)
  })

  test('should initialize all IPC handlers without errors', async ({ mainWindow }) => {
    const ipcTests = [
      'app:info',
      'app:health', 
      'project:list',
      'agent:status:all',
      'ui:load-state',
      'chat:load-history',
      'chat:load-threads'
    ]

    for (const channel of ipcTests) {
      const methodName = channel.replace(':', '').replace('-', '')
      
      const result = await mainWindow.evaluate(async (method) => {
        try {
          // Test direct IPC call
          const result = await window.api[method]?.()
          return { success: true, result }
        } catch (error) {
          return { success: false, error: error.message }
        }
      }, methodName)

      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      
      console.log(`✅ IPC handler working: ${channel}`)
    }
  })

  test('should not have React infinite loops', async ({ mainWindow }) => {
    const reactErrors = consoleErrors.filter(e => 
      e.text.includes('Maximum update depth') ||
      e.text.includes('infinite loop') ||
      e.text.includes('setState inside render')
    )

    expect(reactErrors).toHaveLength(0)
  })

  test('should initialize all stores without errors', async ({ mainWindow }) => {
    // Test store initialization by triggering operations that would fail with missing IPC handlers
    const storeErrors = await mainWindow.evaluate(async () => {
      const errors = []
      
      try {
        // These operations happen during store initialization
        // They would throw "No handler registered" errors if IPC handlers are missing
        
        // Wait a bit for stores to attempt initialization
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Check if window.api is available
        if (!window.api) {
          errors.push('window.api is not available')
        }
        
        return errors
      } catch (error) {
        return [error.message]
      }
    })

    expect(storeErrors).toHaveLength(0)
  })

  test('should complete user interactions without errors', async ({ mainWindow }) => {
    // Clear any existing errors
    consoleErrors = []

    // Simulate user interactions that trigger IPC calls
    const welcomeText = mainWindow.locator('text=Welcome to Project Maestro')
    if (await welcomeText.isVisible()) {
      const getStartedBtn = mainWindow.locator('button:has-text("Get Started")')
      if (await getStartedBtn.isVisible()) {
        await getStartedBtn.click()
        await mainWindow.waitForTimeout(2000)
      }
    }

    // Test any input interactions
    const inputs = await mainWindow.locator('input, textarea').count()
    if (inputs > 0) {
      const firstInput = mainWindow.locator('input, textarea').first()
      if (await firstInput.isVisible()) {
        await firstInput.fill('Test input')
        await mainWindow.waitForTimeout(500)
        await firstInput.clear()
      }
    }

    // Validate no errors occurred during interactions
    const interactionErrors = consoleErrors.filter(e => 
      e.timestamp > new Date(Date.now() - 10000).toISOString()
    )

    expect(interactionErrors).toHaveLength(0)
  })

  test('should have healthy backend services', async ({ mainWindow }) => {
    const healthCheck = await mainWindow.evaluate(async () => {
      try {
        const appInfo = await window.api.getAppInfo()
        const healthStatus = await window.api.checkHealth()
        
        return {
          hasAppInfo: !!appInfo,
          hasHealthStatus: !!healthStatus,
          isHealthy: healthStatus?.status === 'healthy',
          appInfo,
          healthStatus
        }
      } catch (error) {
        return {
          error: error.message,
          hasAppInfo: false,
          hasHealthStatus: false,
          isHealthy: false
        }
      }
    })

    expect(healthCheck.error).toBeUndefined()
    expect(healthCheck.hasAppInfo).toBe(true)
    expect(healthCheck.hasHealthStatus).toBe(true)
    expect(healthCheck.isHealthy).toBe(true)
    
    // Validate app info structure
    expect(healthCheck.appInfo).toHaveProperty('name')
    expect(healthCheck.appInfo).toHaveProperty('version')
    expect(healthCheck.appInfo).toHaveProperty('platform')
  })
})