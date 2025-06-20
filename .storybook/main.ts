import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions'
  ],
  
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  
  docs: {
    autodocs: 'tag',
  },
  
  viteFinal: async (config) => {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@': '/src/renderer',
          '@shared': '/src/shared',
          '@main': '/src/main',
          '@renderer': '/src/renderer',
        },
      },
      define: {
        // Mock Electron APIs in Storybook
        'process.env.NODE_ENV': JSON.stringify('storybook'),
      },
    })
  },
  
  staticDirs: ['../public'],
  
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
}

export default config