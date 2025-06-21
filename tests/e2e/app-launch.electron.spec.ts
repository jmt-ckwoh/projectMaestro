/**
 * Electron App Launch Tests
 * 
 * Tests basic Electron application functionality
 */

import { test, expect } from './helpers/electron'
import { ElectronTestUtils } from './helpers/electron'

test.describe('Electron App Launch', () => {
  test('should launch and display the main window', async ({ electronApp, mainWindow }) => {
    // Verify app launched
    expect(electronApp).toBeTruthy()
    expect(mainWindow).toBeTruthy()
    
    // Check window title
    const title = await mainWindow.title()
    expect(title).toBe('Project Maestro')
  })
  
  test('should have proper window dimensions', async ({ electronApp, mainWindow }) => {
    const utils = new ElectronTestUtils(electronApp, mainWindow)
    const state = await utils.getWindowState()
    
    expect(state).toBeTruthy()
    expect(state!.bounds.width).toBeGreaterThan(800)
    expect(state!.bounds.height).toBeGreaterThan(600)
    expect(state!.isVisible).toBe(true)
  })
  
  test('should load the main UI components', async ({ mainWindow }) => {
    // Wait for React app to load
    await mainWindow.waitForSelector('[data-testid="three-panel-layout"]', { timeout: 10000 })
    
    // Check for main panels
    await expect(mainWindow.locator('[data-testid="chat-panel"]')).toBeVisible()
    await expect(mainWindow.locator('[data-testid="workspace-panel"]')).toBeVisible()
    await expect(mainWindow.locator('[data-testid="team-panel"]')).toBeVisible()
  })
  
  test('should display agent cards in team panel', async ({ mainWindow }) => {
    // Wait for team panel to load
    await mainWindow.waitForSelector('[data-testid="team-panel"]')
    
    // Check for agent cards
    const agentCards = mainWindow.locator('[data-testid^="agent-card-"]')
    const count = await agentCards.count()
    expect(count).toBe(4) // Producer, Architect, Engineer, QA
    
    // Verify specific agents
    await expect(mainWindow.locator('[data-testid="agent-card-producer"]')).toBeVisible()
    await expect(mainWindow.locator('[data-testid="agent-card-architect"]')).toBeVisible()
    await expect(mainWindow.locator('[data-testid="agent-card-engineer"]')).toBeVisible()
    await expect(mainWindow.locator('[data-testid="agent-card-qa"]')).toBeVisible()
  })
  
  test('should handle window resize', async ({ electronApp, mainWindow }) => {
    const utils = new ElectronTestUtils(electronApp, mainWindow)
    
    // Get initial state
    const initialState = await utils.getWindowState()
    
    // Resize window
    await mainWindow.setViewportSize({ width: 1200, height: 800 })
    await mainWindow.waitForTimeout(500) // Allow resize to complete
    
    // Verify layout adapts
    const chatPanel = mainWindow.locator('[data-testid="chat-panel"]')
    const workspacePanel = mainWindow.locator('[data-testid="workspace-panel"]')
    const teamPanel = mainWindow.locator('[data-testid="team-panel"]')
    
    await expect(chatPanel).toBeVisible()
    await expect(workspacePanel).toBeVisible()
    await expect(teamPanel).toBeVisible()
  })
  
  test('should support keyboard shortcuts', async ({ electronApp, mainWindow }) => {
    // Test Ctrl+N for new project (should open dialog or similar)
    await mainWindow.keyboard.press('Control+n')
    await mainWindow.waitForTimeout(500)
    
    // Test Ctrl+, for settings (if implemented)
    await mainWindow.keyboard.press('Control+,')
    await mainWindow.waitForTimeout(500)
    
    // Verify app is still responsive
    const title = await mainWindow.title()
    expect(title).toBe('Project Maestro')
  })
})