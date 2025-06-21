/**
 * Agent Interaction Tests
 * 
 * Tests AI agent functionality and user interactions
 */

import { test, expect } from './helpers/electron'
import { ElectronTestUtils } from './helpers/electron'

test.describe('Agent Interactions', () => {
  test.beforeEach(async ({ mainWindow }) => {
    // Wait for app to be ready
    await mainWindow.waitForSelector('[data-testid="three-panel-layout"]')
    await mainWindow.waitForTimeout(1000) // Allow initialization
  })
  
  test('should display agent status indicators', async ({ mainWindow }) => {
    // Check each agent has a status indicator
    const agents = ['producer', 'architect', 'engineer', 'qa']
    
    for (const agent of agents) {
      const statusIndicator = mainWindow.locator(`[data-testid="agent-status-${agent}"]`)
      await expect(statusIndicator).toBeVisible()
      
      // Should show idle status initially
      await expect(statusIndicator).toHaveAttribute('data-status', 'idle')
    }
  })
  
  test('should allow sending messages to agents', async ({ mainWindow }) => {
    // Focus on chat input
    const chatInput = mainWindow.locator('[data-testid="chat-input"]')
    await expect(chatInput).toBeVisible()
    await chatInput.click()
    
    // Type a message
    const testMessage = 'Hello, I want to create a new web application'
    await chatInput.fill(testMessage)
    
    // Send message
    const sendButton = mainWindow.locator('[data-testid="send-message-button"]')
    await sendButton.click()
    
    // Verify message appears in chat
    const messageElement = mainWindow.locator('[data-testid^="message-"]').last()
    await expect(messageElement).toContainText(testMessage)
    
    // Verify message is marked as from user
    await expect(messageElement).toHaveAttribute('data-sender', 'user')
  })
  
  test('should show agent thinking indicators when processing', async ({ mainWindow }) => {
    // Send a message that should trigger agent response
    const chatInput = mainWindow.locator('[data-testid="chat-input"]')
    await chatInput.fill('Create a React component for me')
    
    const sendButton = mainWindow.locator('[data-testid="send-message-button"]')
    await sendButton.click()
    
    // Producer should start thinking (or working)
    const producerStatus = mainWindow.locator('[data-testid="agent-status-producer"]')
    
    // Wait for status change (with timeout)
    await expect(producerStatus).not.toHaveAttribute('data-status', 'idle', { timeout: 5000 })
    
    // Should be either thinking or working
    const status = await producerStatus.getAttribute('data-status')
    expect(['thinking', 'working']).toContain(status)
  })
  
  test('should display agent responses', async ({ mainWindow }) => {
    // Send a simple message
    const chatInput = mainWindow.locator('[data-testid="chat-input"]')
    await chatInput.fill('Hello')
    
    const sendButton = mainWindow.locator('[data-testid="send-message-button"]')
    await sendButton.click()
    
    // Wait for agent response (with generous timeout for AI)
    const agentMessage = mainWindow.locator('[data-testid^="message-"][data-sender="agent"]')
    await expect(agentMessage).toBeVisible({ timeout: 30000 })
    
    // Verify response has content
    const messageContent = await agentMessage.textContent()
    expect(messageContent).toBeTruthy()
    expect(messageContent!.length).toBeGreaterThan(0)
  })
  
  test('should support agent selection', async ({ mainWindow }) => {
    // Check for agent selector (dropdown, tabs, or similar)
    const agentSelector = mainWindow.locator('[data-testid="agent-selector"]')
    
    if (await agentSelector.isVisible()) {
      // Test selecting different agents
      await agentSelector.click()
      
      const architectOption = mainWindow.locator('[data-testid="select-architect"]')
      if (await architectOption.isVisible()) {
        await architectOption.click()
        
        // Verify selection
        await expect(agentSelector).toContainText('Architect')
      }
    }
  })
  
  test('should handle multiple agent conversation', async ({ mainWindow }) => {
    // Start a conversation that might involve multiple agents
    const chatInput = mainWindow.locator('[data-testid="chat-input"]')
    await chatInput.fill('I need help designing a database schema and then implementing it')
    
    const sendButton = mainWindow.locator('[data-testid="send-message-button"]')
    await sendButton.click()
    
    // Wait for initial response
    await mainWindow.waitForSelector('[data-testid^="message-"][data-sender="agent"]', { timeout: 30000 })
    
    // Check if multiple agents show activity
    const agentStatuses = await mainWindow.locator('[data-testid^="agent-status-"]').all()
    
    let activeAgents = 0
    for (const status of agentStatuses) {
      const statusValue = await status.getAttribute('data-status')
      if (statusValue !== 'idle') {
        activeAgents++
      }
    }
    
    // At least one agent should be active
    expect(activeAgents).toBeGreaterThan(0)
  })
  
  test('should persist chat history', async ({ electronApp, mainWindow }) => {
    const utils = new ElectronTestUtils(electronApp, mainWindow)
    
    // Send a message
    const testMessage = 'Test message for persistence'
    const chatInput = mainWindow.locator('[data-testid="chat-input"]')
    await chatInput.fill(testMessage)
    
    const sendButton = mainWindow.locator('[data-testid="send-message-button"]')
    await sendButton.click()
    
    // Wait for message to appear
    await expect(mainWindow.locator('[data-testid^="message-"]').last()).toContainText(testMessage)
    
    // Test IPC for saving chat history
    const saveResult = await utils.testIPC('chat:save-history')
    expect(saveResult).toBeTruthy()
  })
  
  test('should show agent statistics', async ({ mainWindow }) => {
    // Look for agent statistics in team panel
    const teamPanel = mainWindow.locator('[data-testid="team-panel"]')
    await expect(teamPanel).toBeVisible()
    
    // Check for statistics elements
    const statsElements = mainWindow.locator('[data-testid^="agent-stats-"]')
    const count = await statsElements.count()
    
    if (count > 0) {
      // Verify at least one stat is displayed
      await expect(statsElements.first()).toBeVisible()
    }
  })
})