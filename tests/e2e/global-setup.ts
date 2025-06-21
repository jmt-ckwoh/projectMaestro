/**
 * Playwright Global Setup for Project Maestro
 * 
 * Handles Electron app startup and cleanup for testing
 */

import { FullConfig } from '@playwright/test'
import { _electron as electron } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  // Build the Electron app if needed
  if (process.env.CI) {
    console.log('📦 Building Electron app for CI...')
    execSync('npm run build', { stdio: 'inherit' })
  }
  
  // For Electron tests, we'll launch the app in each test
  // This setup just validates the build exists
  const electronPath = path.join(__dirname, '../../dist/main/index.js')
  
  try {
    // Verify Electron app can be imported (basic smoke test)
    if (process.env.CI) {
      const app = await electron.launch({
        args: [electronPath],
        timeout: 30000
      })
      
      // Quick health check
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded', { timeout: 10000 })
      
      await app.close()
      console.log('✅ Electron app health check passed')
    }
  } catch (error) {
    console.error('❌ Electron app health check failed:', error)
    if (process.env.CI) {
      throw error
    }
  }
  
  console.log('✅ Global setup completed')
}

export default globalSetup