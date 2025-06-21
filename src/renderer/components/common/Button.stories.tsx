/**
 * Button Stories
 */

import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Components/Common/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants and sizes.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    isLoading: {
      control: 'boolean',
      description: 'Shows loading spinner when true',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button when true',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
    onClick: {
      action: 'clicked'
    }
  },
  args: {
    onClick: fn()
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// =============================================================================
// Stories
// =============================================================================

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
}

export const Loading: Story = {
  args: {
    isLoading: true,
    children: 'Loading...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
}

// =============================================================================
// Variant Showcase
// =============================================================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All button variants displayed together.',
      },
    },
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All button sizes displayed together.',
      },
    },
  },
}

const InteractiveComponent = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  
  const handleClick = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }
  
  return (
    <div className="space-y-4">
      <Button 
        onClick={handleClick}
        isLoading={isLoading}
      >
        {isLoading ? 'Processing...' : 'Click Me'}
      </Button>
      <p className="text-sm text-gray-600">
        Click the button to see loading state
      </p>
    </div>
  )
}

export const InteractiveExample: Story = {
  render: () => <InteractiveComponent />,
  parameters: {
    docs: {
      description: {
        story: 'An interactive example showing loading state functionality.',
      },
    },
  },
}

// =============================================================================
// Project Maestro Context
// =============================================================================

export const AgentAction: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🤖</span>
        <span className="font-semibold">Agent Actions</span>
      </div>
      
      <div className="space-y-2">
        <Button variant="primary" className="w-full">
          Send Message to Producer
        </Button>
        <Button variant="secondary" className="w-full">
          Request Architecture Review
        </Button>
        <Button variant="outline" className="w-full">
          Generate Code
        </Button>
        <Button variant="ghost" className="w-full">
          Run Quality Check
        </Button>
        <Button variant="danger" className="w-full">
          Cancel Task
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Button variants used in the context of agent interactions.',
      },
    },
  },
}