#!/usr/bin/env node

/**
 * Component Generation Script
 * 
 * Generates React components following the Project Maestro architecture patterns
 * 
 * Usage:
 *   npm run generate:component -- --name=MyComponent --type=ui
 *   node scripts/generate-component.js --name=ChatPanel --type=feature --domain=chat
 */

const fs = require('fs/promises')
const path = require('path')

// Component templates
const COMPONENT_TEMPLATES = {
  ui: `/**
 * {{COMPONENT_NAME}} Component
 * 
 * {{DESCRIPTION}}
 */

import React from 'react'
import { cn } from '@/utils/cn'

// =============================================================================
// Types
// =============================================================================

export interface {{COMPONENT_NAME}}Props {
  className?: string
  children?: React.ReactNode
}

// =============================================================================
// Component
// =============================================================================

export const {{COMPONENT_NAME}}: React.FC<{{COMPONENT_NAME}}Props> = ({ 
  className,
  children,
  ...props 
}) => {
  return (
    <div 
      className={cn('{{COMPONENT_CLASSES}}', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// =============================================================================
// Default Props & Display Name
// =============================================================================

{{COMPONENT_NAME}}.displayName = '{{COMPONENT_NAME}}'
`,

  feature: `/**
 * {{COMPONENT_NAME}} Feature Component
 * 
 * {{DESCRIPTION}}
 */

import React, { useState, useEffect } from 'react'
import { cn } from '@/utils/cn'

// =============================================================================
// Types
// =============================================================================

export interface {{COMPONENT_NAME}}Props {
  className?: string
  {{DOMAIN_PROPS}}
}

// =============================================================================
// Component
// =============================================================================

export const {{COMPONENT_NAME}}: React.FC<{{COMPONENT_NAME}}Props> = ({ 
  className,
  {{DOMAIN_PROP_NAMES}}
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Component initialization
    const initialize = async () => {
      try {
        setIsLoading(true)
        // Add initialization logic here
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    initialize()
  }, [])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('p-4 bg-red-50 border border-red-200 rounded-md', className)}>
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className={cn('{{COMPONENT_CLASSES}}', className)}>
      <h2 className="text-lg font-semibold mb-4">{{COMPONENT_NAME}}</h2>
      {/* Add component content here */}
    </div>
  )
}

// =============================================================================
// Default Props & Display Name
// =============================================================================

{{COMPONENT_NAME}}.displayName = '{{COMPONENT_NAME}}'
`,

  container: `/**
 * {{COMPONENT_NAME}} Container Component
 * 
 * {{DESCRIPTION}}
 */

import React from 'react'
import { cn } from '@/utils/cn'
import { use{{DOMAIN_STORE}} } from '@/stores/{{DOMAIN_STORE_FILE}}'

// =============================================================================
// Types
// =============================================================================

export interface {{COMPONENT_NAME}}Props {
  className?: string
  {{DOMAIN_PROPS}}
}

// =============================================================================
// Component
// =============================================================================

export const {{COMPONENT_NAME}}: React.FC<{{COMPONENT_NAME}}Props> = ({ 
  className,
  {{DOMAIN_PROP_NAMES}}
}) => {
  const {
    // Add store selectors here
    isLoading,
    error,
    // Add actions here
    reset
  } = use{{DOMAIN_STORE}}()

  const handleAction = async () => {
    try {
      // Add action logic here
    } catch (err) {
      console.error('{{COMPONENT_NAME}} action failed:', err)
    }
  }

  return (
    <div className={cn('{{COMPONENT_CLASSES}}', className)}>
      <div className="{{CONTAINER_LAYOUT}}">
        {/* Add container content here */}
      </div>
    </div>
  )
}

// =============================================================================
// Default Props & Display Name
// =============================================================================

{{COMPONENT_NAME}}.displayName = '{{COMPONENT_NAME}}'
`
}

const STORY_TEMPLATE = `/**
 * {{COMPONENT_NAME}} Stories
 */

import type { Meta, StoryObj } from '@storybook/react'
import { {{COMPONENT_NAME}} } from './{{COMPONENT_FILE}}'

const meta: Meta<typeof {{COMPONENT_NAME}}> = {
  title: '{{STORY_PATH}}/{{COMPONENT_NAME}}',
  component: {{COMPONENT_NAME}},
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    className: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    // Add default props here
  },
}

export const Loading: Story = {
  args: {
    // Add loading state props here
  },
}

export const Error: Story = {
  args: {
    // Add error state props here
  },
}
`

const TEST_TEMPLATE = `/**
 * Tests for {{COMPONENT_NAME}}
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { {{COMPONENT_NAME}} } from './{{COMPONENT_FILE}}'

describe('{{COMPONENT_NAME}}', () => {
  it('renders without crashing', () => {
    render(<{{COMPONENT_NAME}} />)
    expect(screen.getByText('{{COMPONENT_NAME}}')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-test-class'
    render(<{{COMPONENT_NAME}} className={customClass} />)
    
    const component = screen.getByText('{{COMPONENT_NAME}}').parentElement
    expect(component).toHaveClass(customClass)
  })

  {{TEST_CASES}}
})
`

// Utility functions
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}

function toKebabCase(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getDomainProps(domain) {
  const domainProps = {
    agent: 'agentType: AgentType\n  onMessage?: (message: string) => void',
    project: 'projectId: string\n  onProjectChange?: (project: Project) => void',
    chat: 'messages: Message[]\n  onSendMessage?: (message: string) => void',
    workspace: 'files: FileNode[]\n  onFileSelect?: (file: FileNode) => void',
    team: 'agents: Agent[]\n  onAgentSelect?: (agent: Agent) => void'
  }
  return domainProps[domain] || 'id: string'
}

function getDomainPropNames(domain) {
  const propNames = {
    agent: 'agentType, onMessage',
    project: 'projectId, onProjectChange',
    chat: 'messages, onSendMessage',
    workspace: 'files, onFileSelect',
    team: 'agents, onAgentSelect'
  }
  return propNames[domain] || 'id'
}

function getDomainStore(domain) {
  const stores = {
    agent: 'AgentStore',
    project: 'ProjectStore',
    chat: 'UIStore',
    workspace: 'ProjectStore',
    team: 'AgentStore'
  }
  return stores[domain] || 'UIStore'
}

function getDomainStoreFile(domain) {
  const storeFiles = {
    agent: 'agentStore',
    project: 'projectStore',
    chat: 'uiStore',
    workspace: 'projectStore',
    team: 'agentStore'
  }
  return storeFiles[domain] || 'uiStore'
}

function getComponentClasses(type, domain) {
  const classes = {
    ui: 'p-4 border rounded-md',
    feature: \`\${domain ? \`\${domain}-feature\` : 'feature'} p-6 bg-white rounded-lg shadow-sm\`,
    container: \`\${domain ? \`\${domain}-container\` : 'container'} min-h-full flex flex-col\`
  }
  return classes[type] || 'p-4'
}

function getContainerLayout(domain) {
  const layouts = {
    agent: 'flex flex-col space-y-4',
    project: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
    chat: 'flex flex-col h-full',
    workspace: 'flex flex-row h-full',
    team: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
  }
  return layouts[domain] || 'flex flex-col space-y-4'
}

function getTestCases(type, domain) {
  const testCases = {
    ui: \`
  it('handles user interactions', async () => {
    const user = userEvent.setup()
    render(<{{COMPONENT_NAME}} />)
    
    // Add interaction tests here
  })\`,
    feature: \`
  it('handles loading state', () => {
    // Mock loading state
    render(<{{COMPONENT_NAME}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays error state', () => {
    // Mock error state
    render(<{{COMPONENT_NAME}} />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })\`,
    container: \`
  it('integrates with store', () => {
    render(<{{COMPONENT_NAME}} />)
    // Add store integration tests here
  })\`
  }
  return testCases[type] || ''
}

function getStoryPath(domain) {
  if (!domain) return 'Components'
  
  const paths = {
    agent: 'Features/Agent',
    project: 'Features/Project',
    chat: 'Features/Chat',
    workspace: 'Features/Workspace',
    team: 'Features/Team'
  }
  return paths[domain] || 'Components'
}

// Main generation function
async function generateComponent(options) {
  const {
    name,
    type = 'ui',
    domain = null,
    description = \`A \${type} component for \${domain || 'the application'}\`,
    withStory = true,
    withTest = true
  } = options

  if (!name) {
    throw new Error('Component name is required')
  }

  // Determine paths
  const componentName = capitalizeFirstLetter(toCamelCase(name))
  const fileName = toKebabCase(name)
  const basePath = domain 
    ? path.join('src', 'renderer', 'components', domain)
    : path.join('src', 'renderer', 'components', 'common')

  // Ensure directory exists
  await fs.mkdir(basePath, { recursive: true })

  // Generate component
  const template = COMPONENT_TEMPLATES[type] || COMPONENT_TEMPLATES.ui
  const componentContent = template
    .replace(/{{COMPONENT_NAME}}/g, componentName)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{DOMAIN_PROPS}}/g, getDomainProps(domain))
    .replace(/{{DOMAIN_PROP_NAMES}}/g, getDomainPropNames(domain))
    .replace(/{{DOMAIN_STORE}}/g, getDomainStore(domain))
    .replace(/{{DOMAIN_STORE_FILE}}/g, getDomainStoreFile(domain))
    .replace(/{{COMPONENT_CLASSES}}/g, getComponentClasses(type, domain))
    .replace(/{{CONTAINER_LAYOUT}}/g, getContainerLayout(domain))

  const componentPath = path.join(basePath, \`\${fileName}.tsx\`)
  await fs.writeFile(componentPath, componentContent)

  console.log(\`✅ Generated component: \${componentPath}\`)

  // Generate story
  if (withStory) {
    const storyContent = STORY_TEMPLATE
      .replace(/{{COMPONENT_NAME}}/g, componentName)
      .replace(/{{COMPONENT_FILE}}/g, fileName)
      .replace(/{{STORY_PATH}}/g, getStoryPath(domain))

    const storyPath = path.join(basePath, \`\${fileName}.stories.tsx\`)
    await fs.writeFile(storyPath, storyContent)

    console.log(\`✅ Generated story: \${storyPath}\`)
  }

  // Generate test
  if (withTest) {
    const testContent = TEST_TEMPLATE
      .replace(/{{COMPONENT_NAME}}/g, componentName)
      .replace(/{{COMPONENT_FILE}}/g, fileName)
      .replace(/{{TEST_CASES}}/g, getTestCases(type, domain))

    const testPath = path.join(basePath, \`\${fileName}.test.tsx\`)
    await fs.writeFile(testPath, testContent)

    console.log(\`✅ Generated test: \${testPath}\`)
  }

  // Update index file
  const indexPath = path.join(basePath, 'index.ts')
  try {
    let indexContent = ''
    try {
      indexContent = await fs.readFile(indexPath, 'utf-8')
    } catch (err) {
      // File doesn't exist, create new
    }
    
    const exportLine = \`export { \${componentName} } from './\${fileName}'\`
    if (!indexContent.includes(exportLine)) {
      indexContent += \`\${indexContent ? '\\n' : ''}\${exportLine}\\n\`
      await fs.writeFile(indexPath, indexContent)
      console.log(\`✅ Updated index: \${indexPath}\`)
    }
  } catch (err) {
    console.warn(\`⚠️  Could not update index file: \${err.message}\`)
  }

  return {
    componentPath,
    storyPath: withStory ? path.join(basePath, \`\${fileName}.stories.tsx\`) : null,
    testPath: withTest ? path.join(basePath, \`\${fileName}.test.tsx\`) : null
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options = {}

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')
      options[key] = value === undefined ? true : value
    }
  })

  if (options.help) {
    console.log(\`
Project Maestro Component Generator

Usage:
  npm run generate:component -- --name=ComponentName [options]

Options:
  --name=NAME        Component name (required)
  --type=TYPE        Component type: ui, feature, container (default: ui)
  --domain=DOMAIN    Domain: agent, project, chat, workspace, team
  --description=DESC Component description
  --no-story         Skip generating Storybook story
  --no-test          Skip generating test file

Examples:
  npm run generate:component -- --name=Button --type=ui
  npm run generate:component -- --name=ChatPanel --type=feature --domain=chat
  npm run generate:component -- --name=AgentContainer --type=container --domain=agent
    \`)
    return
  }

  try {
    const result = await generateComponent({
      name: options.name,
      type: options.type,
      domain: options.domain,
      description: options.description,
      withStory: !options['no-story'],
      withTest: !options['no-test']
    })

    console.log(\`\\n🎉 Component generation complete!\`)
    console.log(\`\\nGenerated files:\`)
    console.log(\`  Component: \${result.componentPath}\`)
    if (result.storyPath) console.log(\`  Story: \${result.storyPath}\`)
    if (result.testPath) console.log(\`  Test: \${result.testPath}\`)
    
    console.log(\`\\nNext steps:\`)
    console.log(\`  1. Customize the component implementation\`)
    console.log(\`  2. Update the story with realistic props\`)
    console.log(\`  3. Add comprehensive tests\`)
    console.log(\`  4. Run: npm run storybook (to view in Storybook)\`)
    console.log(\`  5. Run: npm test (to run tests)\`)
  } catch (error) {
    console.error(\`❌ Error generating component: \${error.message}\`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateComponent }