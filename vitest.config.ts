import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test setup
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    
    // Pool options for better React testing
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-electron/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.stories.*',
        'tests/setup/**',
        'src/templates/**',
        '.storybook/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'dist-electron/',
      '.storybook/',
      'src/templates/',
      'src/renderer/**/*.test.tsx' // Temporarily exclude React component tests
    ],
    
    // Test timeout
    testTimeout: 30000,
    
    // Globals
    globals: true,
    
    // Vitest v3 simplified dependency handling
    // Most dependencies are handled automatically now
  },
  
  // Resolve aliases to match the project structure
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/main': resolve(__dirname, './src/main'),
      '@/renderer': resolve(__dirname, './src/renderer'),
      '@/components': resolve(__dirname, './src/renderer/components'),
      '@/stores': resolve(__dirname, './src/renderer/stores'),
      '@/hooks': resolve(__dirname, './src/renderer/hooks'),
      '@/utils': resolve(__dirname, './src/renderer/utils'),
      '@/types': resolve(__dirname, './src/shared/types'),
      '@/services': resolve(__dirname, './src/main/services'),
      '@tests': resolve(__dirname, './tests')
    }
  },
  
  // Define global variables for testing
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.VITEST': true
  }
})