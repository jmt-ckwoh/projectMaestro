# Testing Guide for Project Maestro

## Overview

Project Maestro uses a comprehensive multi-layer testing strategy that includes unit tests, integration tests, end-to-end tests, and AI-driven test generation.

## Testing Architecture

### 1. Test Pyramid

```
    /\     E2E Tests (Playwright)
   /  \    - User workflows
  /____\   - Agent interactions
 /      \  - Cross-platform validation
/  UNIT  \ Integration Tests (Vitest + MSW)
----------  - IPC communication
            - Store integration
            - Service contracts
            
            Unit Tests (Vitest)
            - Components
            - Services  
            - Utilities
```

### 2. Testing Frameworks

- **Unit & Integration**: Vitest with JSDoc
- **E2E**: Playwright with Electron support
- **AI-Driven**: Custom Claude test generator
- **Visual**: Storybook for component testing

## Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Unit tests only
npm test

# E2E tests only
npm run test:e2e

# Specific test types
npm run test:e2e:electron    # Electron app tests
npm run test:e2e:web        # Web browser tests
npm run test:contracts      # Domain contract tests

# Interactive modes
npm run test:ui             # Vitest UI
npm run test:e2e:ui         # Playwright UI
npm run test:e2e:debug      # Debug mode
```

### Advanced Options

```bash
# Run with coverage
npm run test:coverage

# Run specific test files
npx vitest run src/stores/agentStore.test.ts
npx playwright test tests/e2e/app-launch.electron.spec.ts

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Generate Claude-driven tests
npm run test:claude-generate
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual components and functions in isolation

```typescript
// Example: Component unit test
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/common/Button'

test('renders button with correct text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toHaveTextContent('Click me')
})
```

**Coverage**:
- React components
- Zustand stores
- Utility functions
- Domain services

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and IPC communication

```typescript
// Example: Store integration test
test('agent store integrates with IPC', async () => {
  const store = useAgentStore.getState()
  await store.sendMessage({ content: 'Hello', agentType: 'producer' })
  
  expect(mockIPC.invoke).toHaveBeenCalledWith('agent:message', expect.any(Object))
})
```

**Coverage**:
- Store-to-IPC communication
- Agent workflow integration
- Cross-domain interactions

### 3. E2E Tests (`tests/e2e/`)

**Purpose**: Test complete user workflows in the actual Electron app

```typescript
// Example: E2E test
test('user can create a project', async ({ electronApp, mainWindow }) => {
  await mainWindow.click('[data-testid="create-project-button"]')
  await mainWindow.fill('[data-testid="project-name"]', 'My Project')
  await mainWindow.click('[data-testid="confirm-create"]')
  
  await expect(mainWindow.locator('[data-testid="project-card"]')).toBeVisible()
})
```

**Coverage**:
- Complete user workflows
- Agent interactions
- Cross-panel communication
- File operations

### 4. Claude-Driven Tests (`tests/claude-driven/`)

**Purpose**: AI-generated tests based on natural language scenarios

```typescript
// Generated automatically from scenarios
test('Complex agent collaboration workflow', async ({ electronApp, mainWindow }) => {
  // Auto-generated test steps based on scenario description
  await mainWindow.type('[data-testid="chat-input"]', 'Build a REST API with React frontend')
  await mainWindow.click('[data-testid="send-button"]')
  
  // AI-generated assertions
  await expect(mainWindow.locator('[data-testid="agent-status-architect"]')).toHaveAttribute('data-status', 'thinking')
})
```

## Test Data Attributes

For reliable E2E testing, use `data-testid` attributes:

```typescript
// ✅ Good - Stable test selectors
<button data-testid="create-project-button">Create Project</button>
<div data-testid="agent-card-producer" data-status="idle">...</div>

// ❌ Avoid - Fragile selectors
<button className="btn-primary">Create Project</button> // CSS classes can change
<div id="agent-1">...</div> // IDs might be dynamic
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.electron\.spec\.ts/
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.web\.spec\.ts/
    }
  ]
})
```

## Testing Best Practices

### 1. Test Structure

Use the AAA pattern (Arrange, Act, Assert):

```typescript
test('should update agent status', async () => {
  // Arrange
  const store = useAgentStore.getState()
  const initialStatus = store.statuses.producer
  
  // Act
  await store.updateAgentStatus('producer', 'thinking')
  
  // Assert
  expect(store.statuses.producer).toBe('thinking')
  expect(store.statuses.producer).not.toBe(initialStatus)
})
```

### 2. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good - Each test sets up its own state
beforeEach(() => {
  useAgentStore.getState().reset()
})

// ❌ Avoid - Tests depending on previous test state
test('first test', () => { /* creates data */ })
test('second test', () => { /* relies on data from first test */ })
```

### 3. Mock External Dependencies

```typescript
// Mock IPC calls
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn()
  }
}))

// Mock API calls
const mockAPI = {
  createProject: vi.fn().mockResolvedValue({ id: 'test-id' }),
  getProjects: vi.fn().mockResolvedValue([])
}
```

### 4. Test Real User Scenarios

Focus on what users actually do:

```typescript
// ✅ Good - Real user workflow
test('user creates project and sends message to agent', async () => {
  // User clicks create project
  await page.click('[data-testid="create-project"]')
  await page.fill('[data-testid="project-name"]', 'E-commerce Site')
  await page.click('[data-testid="confirm"]')
  
  // User asks for help
  await page.fill('[data-testid="chat-input"]', 'Help me set up the database')
  await page.click('[data-testid="send"]')
  
  // Verify agent responds
  await expect(page.locator('[data-testid="agent-response"]')).toBeVisible()
})
```

## Claude-Driven Testing

### 1. Generating Test Scenarios

```typescript
import { ClaudeTestGenerator } from './tests/claude-driven/test-generator'

const generator = new ClaudeTestGenerator()

// Generate scenarios from feature description
const scenarios = await generator.generateTestScenarios(`
  Feature: Advanced Project Workflow
  - User creates a complex web application project
  - Multiple agents collaborate on architecture and implementation
  - Project includes database design, API development, and frontend
  - QA agent validates the implementation
`)

// Convert to Playwright tests
const testFile = await generator.generatePlaywrightTests(scenarios)
```

### 2. Test Analysis and Improvement

```typescript
// Analyze test results
const analysis = await generator.analyzeTestResults('./test-results/results.json')

console.log(`Test Coverage: ${analysis.coverage}%`)
console.log(`Recommendations: ${analysis.recommendations.join(', ')}`)
console.log(`Risk Areas: ${analysis.riskAreas.join(', ')}`)
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:run
      
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

## Debugging Tests

### 1. Vitest Debugging

```bash
# Debug specific test
npx vitest run --reporter=verbose src/stores/agentStore.test.ts

# UI mode for interactive debugging
npm run test:ui
```

### 2. Playwright Debugging

```bash
# Debug mode - step through tests
npm run test:e2e:debug

# Headed mode - see browser actions
npm run test:e2e:headed

# Record test actions
npx playwright codegen http://localhost:5173
```

### 3. Test Artifacts

Test artifacts are automatically saved:

- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/` (on failure)
- **Traces**: `test-results/traces/` (on retry)
- **Reports**: `playwright-report/index.html`

## Test Coverage Goals

### Minimum Coverage Thresholds

- **Unit Tests**: 80% line coverage
- **Integration Tests**: 70% feature coverage
- **E2E Tests**: 90% critical path coverage

### Critical Areas (100% Coverage Required)

- Agent state machine transitions
- IPC communication handlers
- Project lifecycle operations
- Security validation functions

## Troubleshooting

### Common Issues

1. **Electron app won't launch in tests**
   - Check if app is built: `npm run build`
   - Verify Electron path in test config
   - Check for port conflicts

2. **Tests timeout**
   - Increase timeout in config
   - Add wait conditions for async operations
   - Check for infinite loops or blocking operations

3. **Flaky tests**
   - Add proper wait conditions
   - Use data-testid instead of CSS selectors
   - Mock time-dependent operations

4. **Memory leaks in tests**
   - Clean up event listeners in afterEach
   - Reset stores between tests
   - Close browser contexts properly

### Getting Help

- Check test logs: `npm run test -- --reporter=verbose`
- Review CI test results in GitHub Actions
- Use Playwright trace viewer: `npx playwright show-trace test-results/trace.zip`

## Contributing

When adding new features:

1. Write unit tests first (TDD approach)
2. Add integration tests for cross-domain features
3. Include E2E tests for user-facing workflows
4. Generate Claude-driven tests for complex scenarios
5. Update this guide with new testing patterns

Remember: **Good tests are your safety net for confident refactoring and feature development!**