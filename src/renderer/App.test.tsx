/**
 * Tests for App Component
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'
import { App } from './App'

describe('App Component', () => {
  it('renders welcome screen', async () => {
    render(<App />)
    
    // Wait for initialization
    await screen.findByText('Welcome to Project Maestro')
    
    expect(screen.getByText('Welcome to Project Maestro')).toBeInTheDocument()
    expect(screen.getByText(/communication-centric code generation environment/)).toBeInTheDocument()
  })
  
  it('displays agent team preview', async () => {
    render(<App />)
    
    await screen.findByText('Welcome to Project Maestro')
    
    expect(screen.getByText('Producer')).toBeInTheDocument()
    expect(screen.getByText('Architect')).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(screen.getByText('QA')).toBeInTheDocument()
  })
  
  it('shows create project button', async () => {
    render(<App />)
    
    await screen.findByText('Welcome to Project Maestro')
    
    const createButton = screen.getByRole('button', { name: /create new project/i })
    expect(createButton).toBeInTheDocument()
  })
})