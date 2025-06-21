import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', 'vectordb', '@lancedb/lancedb']
            }
          },
          resolve: {
            alias: {
              '@': path.resolve(__dirname, './src'),
              '@/services': path.resolve(__dirname, './src/main/services'),
              '@/types': path.resolve(__dirname, './src/shared/types')
            }
          }
        }
      },
      {
        // Preload script entry
        entry: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs'
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/renderer/components'),
      '@/stores': path.resolve(__dirname, './src/renderer/stores'),
      '@/hooks': path.resolve(__dirname, './src/renderer/hooks'),
      '@/utils': path.resolve(__dirname, './src/renderer/utils'),
      '@/types': path.resolve(__dirname, './src/shared/types')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist/renderer',
    reportCompressedSize: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  }
})