import { addons } from '@storybook/manager-api'
import { themes } from '@storybook/theming'

addons.setConfig({
  theme: {
    ...themes.light,
    brandTitle: 'Project Maestro',
    brandUrl: '/',
    brandImage: undefined,
    brandTarget: '_self',
    
    colorPrimary: '#3b82f6',
    colorSecondary: '#8b5cf6',
    
    // UI
    appBg: '#ffffff',
    appContentBg: '#ffffff',
    appBorderColor: '#e5e7eb',
    appBorderRadius: 6,
    
    // Typography
    fontBase: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    fontCode: '"Fira Code", "Monaco", "Consolas", monospace',
    
    // Text colors
    textColor: '#1f2937',
    textInverseColor: '#ffffff',
    
    // Toolbar default and active colors
    barTextColor: '#6b7280',
    barSelectedColor: '#3b82f6',
    barBg: '#f9fafb',
    
    // Form colors
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    inputTextColor: '#1f2937',
    inputBorderRadius: 4,
  },
  
  panelPosition: 'bottom',
  
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
})