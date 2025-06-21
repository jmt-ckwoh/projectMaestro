/**
 * Electron Test Helpers for Project Maestro
 * 
 * Provides utilities for testing Electron-specific functionality
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright'
import { test as base, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Extend Playwright test with Electron app
export const test = base.extend<{
  electronApp: ElectronApplication
  mainWindow: Page
}>({
  electronApp: async ({}, use) => {
    // Launch Electron app
    const electronPath = process.env.CI 
      ? path.join(__dirname, '../../../dist/main/index.js')
      : path.join(__dirname, '../../../src/main/index.ts')
    
    const app = await electron.launch({
      args: [electronPath],
      timeout: 30000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_IS_DEV: '0'
      }
    })
    
    await use(app)
    await app.close()
  },
  
  mainWindow: async ({ electronApp }, use) => {
    // Get the main window
    const window = await electronApp.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    
    await use(window)
  }
})

export { expect }

// Electron-specific test utilities
export class ElectronTestUtils {
  constructor(private app: ElectronApplication, private window: Page) {}
  
  /**
   * Wait for the app to be fully initialized
   */
  async waitForAppReady() {
    await this.window.waitForSelector('[data-testid="app-ready"]', { timeout: 10000 })
  }
  
  /**
   * Test IPC communication
   */
  async testIPC(channel: string, data?: any) {
    return await this.app.evaluate(async ({ app }, { channel, data }) => {
      // Access main process for testing
      return new Promise((resolve, reject) => {
        const { ipcMain } = require('electron')
        ipcMain.once(channel, (_event: any, result: any) => {
          resolve(result)
        })
        
        // Simulate IPC call
        const mainWindow = (app as any).getBrowserWindow()
        if (mainWindow) {
          mainWindow.webContents.send(channel, data)
        } else {
          reject(new Error('No main window found'))
        }
      })
    }, { channel, data })
  }
  
  /**
   * Test window state (maximized, minimized, etc.)
   */
  async getWindowState() {
    return await this.app.evaluate(({ app }) => {
      const mainWindow = (app as any).getBrowserWindow()
      if (!mainWindow) return null
      
      return {
        isMaximized: mainWindow.isMaximized(),
        isMinimized: mainWindow.isMinimized(),
        isFullScreen: mainWindow.isFullScreen(),
        bounds: mainWindow.getBounds(),
        isVisible: mainWindow.isVisible()
      }
    })
  }
  
  /**
   * Test menu interactions
   */
  async clickMenuItem(menuPath: string[]) {
    return await this.app.evaluate(({ app: _app }, menuPath) => {
      const { Menu } = require('electron')
      const menu = Menu.getApplicationMenu()
      
      let currentMenu = menu
      for (const item of menuPath) {
        const menuItem = currentMenu?.items.find(i => i.label === item)
        if (!menuItem) {
          throw new Error(`Menu item not found: ${item}`)
        }
        
        if (menuItem.submenu) {
          currentMenu = menuItem.submenu
        } else {
          menuItem.click()
          return true
        }
      }
      
      return false
    }, menuPath)
  }
  
  /**
   * Test native dialogs
   */
  async expectDialog(action: () => Promise<void>) {
    const dialogPromise = this.app.evaluate(({ app: _app }) => {
      return new Promise((resolve) => {
        const { dialog } = require('electron')
        const originalShowOpenDialog = dialog.showOpenDialog
        const originalShowSaveDialog = dialog.showSaveDialog
        const originalShowMessageBox = dialog.showMessageBox
        
        dialog.showOpenDialog = (...args: any[]) => {
          resolve({ type: 'open', args })
          return Promise.resolve({ canceled: true, filePaths: [] })
        }
        
        dialog.showSaveDialog = (...args: any[]) => {
          resolve({ type: 'save', args })
          return Promise.resolve({ canceled: true, filePath: '' })
        }
        
        dialog.showMessageBox = (...args: any[]) => {
          resolve({ type: 'message', args })
          return Promise.resolve({ response: 0 })
        }
        
        // Restore after 5 seconds
        setTimeout(() => {
          dialog.showOpenDialog = originalShowOpenDialog
          dialog.showSaveDialog = originalShowSaveDialog
          dialog.showMessageBox = originalShowMessageBox
        }, 5000)
      })
    })
    
    await action()
    return await dialogPromise
  }
  
  /**
   * Test file system operations
   */
  async testFileOperation(operation: 'read' | 'write' | 'delete', path: string, content?: string) {
    return await this.app.evaluate(async ({ app: _app }, { operation, path, content }) => {
      const fs = require('fs').promises
      
      try {
        switch (operation) {
          case 'read':
            return await fs.readFile(path, 'utf-8')
          case 'write':
            await fs.writeFile(path, content || '')
            return true
          case 'delete':
            await fs.unlink(path)
            return true
          default:
            throw new Error(`Unknown operation: ${operation}`)
        }
      } catch (error) {
        throw error
      }
    }, { operation, path, content })
  }
  
  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${name}-${timestamp}.png`
    await this.window.screenshot({ 
      path: `test-results/screenshots/${filename}`,
      fullPage: true 
    })
    return filename
  }
  
  /**
   * Test performance metrics
   */
  async getPerformanceMetrics() {
    return await this.window.evaluate(() => {
      const perf = performance
      return {
        navigation: perf.getEntriesByType('navigation')[0],
        memory: (perf as any).memory,
        timing: perf.timing
      }
    })
  }
}