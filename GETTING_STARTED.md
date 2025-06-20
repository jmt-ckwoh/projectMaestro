# Getting Started with Project Maestro

Welcome to Project Maestro! This guide will help you set up and start developing the communication-centric code generation environment.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Git** for version control

### Installation

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd projectMaestro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm run electron:dev
   ```

This will start both the Vite dev server and Electron application.

## 📁 Project Structure

```
project-maestro/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # App entry point
│   │   ├── services/      # Domain services with CLAUDE.md guides
│   │   ├── security/      # Security model and validation
│   │   └── ipc/           # IPC handlers
│   │
│   ├── renderer/          # React frontend (no Node.js access)
│   │   ├── components/    # UI components with architecture rules
│   │   ├── stores/        # Zustand state management
│   │   └── App.tsx        # Main React app
│   │
│   ├── preload/           # Secure IPC bridge
│   │   └── index.ts       # Context bridge (ONLY place for IPC)
│   │
│   └── shared/            # Shared types and contracts
│       ├── contracts/     # Domain service interfaces
│       └── types/         # TypeScript type definitions
│
├── docs/                  # Documentation
├── tasks/                 # Implementation task lists
└── tests/                 # Test files
```

## 🛠️ Development Commands

### Core Commands
```bash
npm run dev              # Start Vite dev server
npm run electron:dev     # Start full Electron app in development
npm run build           # Build for production
npm run type-check      # Check TypeScript types
npm run lint            # Lint and fix code
npm run test            # Run tests
```

### Quality Assurance
```bash
npm run lint:check      # Check linting without fixing
npm run format          # Format code with Prettier
npm run format:check    # Check formatting
npm run test:coverage   # Run tests with coverage
npm run test:contracts  # Test domain contracts
```

### Development Tools
```bash
npm run storybook       # Start Storybook for component development
npm run generate:component  # Generate new component
npm run generate:service    # Generate new domain service
npm run validate:architecture # Validate architectural compliance
```

## 🏗️ Architecture Overview

Project Maestro follows a **strongly structured architecture** with clear boundaries:

### 1. **Domain-Driven Design**
- Each domain (Agent, Project, Memory, Git) has its own service
- Services implement contracts from `src/shared/contracts/`
- Clear boundaries prevent architectural drift

### 2. **Electron Security Model**
- **Main Process**: Full Node.js access, handles business logic
- **Renderer Process**: Sandboxed React app, no Node.js access
- **Preload Script**: Secure bridge using contextBridge

### 3. **Event-Driven Architecture**
- Services communicate via event bus
- No direct cross-domain dependencies
- Loose coupling for maintainability

### 4. **State Management**
- Zustand stores with strict ownership rules
- Each store owns specific data domains
- No cross-store dependencies

## 📋 Implementation Guidelines

### Before You Code

1. **Read the domain rules** in the relevant `CLAUDE.md` file
2. **Check the task list** in `/tasks/tasks-rfc-maestro.md`
3. **Follow the file creation order** from `CLAUDE.md`

### File Creation Order (MANDATORY)

1. **Define domain contract** in `src/shared/contracts/`
2. **Create domain service** implementing the contract
3. **Add validated IPC handler** with security checks
4. **Expose secure API** in preload script
5. **Create Zustand store** following ownership rules
6. **Build React components** following component architecture
7. **Add comprehensive tests** for each layer

### Key Rules

- ✅ **All services MUST implement domain contracts**
- ✅ **Agent state changes MUST go through StateMachine**
- ✅ **All IPC handlers MUST validate inputs**
- ✅ **Store ownership is strictly enforced**
- ✅ **Event-driven communication only**

## 🔒 Security Guidelines

### IPC Security Checklist

For every IPC handler:
- [ ] Input validation with Zod schema
- [ ] Security context validation
- [ ] Rate limiting applied
- [ ] Permission checking
- [ ] Path validation (if file operations)
- [ ] Content sanitization (if user input)
- [ ] Error handling without information leakage
- [ ] Audit logging

### Component Security

- Never import Node.js modules in renderer
- Always use `window.api` for backend communication
- Validate all user inputs
- Follow CSP (Content Security Policy) rules

## 🧪 Testing Strategy

### Test Types
```bash
# Unit tests for individual components/services
npm run test

# Integration tests for domain interactions
npm run test tests/integration

# Contract tests for domain boundaries
npm run test:contracts

# E2E tests for full user workflows
npm run test tests/e2e
```

### Testing Requirements

- **Unit tests** for all services and components
- **Contract tests** for domain boundaries
- **Integration tests** for agent collaboration
- **E2E tests** for user workflows

## 📖 Key Documentation

### Architecture & Rules
- [`CLAUDE.md`](./CLAUDE.md) - Main architecture document
- [`src/main/services/agents/CLAUDE.md`](./src/main/services/agents/CLAUDE.md) - Agent domain rules
- [`src/renderer/components/CLAUDE.md`](./src/renderer/components/CLAUDE.md) - Component architecture
- [`src/renderer/stores/STORE_ARCHITECTURE.md`](./src/renderer/stores/STORE_ARCHITECTURE.md) - State management
- [`src/main/security/SECURITY_MODEL.md`](./src/main/security/SECURITY_MODEL.md) - Security guidelines

### Implementation Guidance
- [`tasks/tasks-rfc-maestro.md`](./tasks/tasks-rfc-maestro.md) - Detailed task breakdown
- [`docs/rfc_maestro.md`](./docs/rfc_maestro.md) - Original RFC specification
- [`docs/agents/README.md`](./docs/agents/README.md) - Agent system documentation
- [`docs/api/README.md`](./docs/api/README.md) - API reference

## 🤖 AI Agent System

Project Maestro's core feature is a team of AI agents:

### Agent Personas
- **👔 Producer** - Project management and user facilitation
- **🏗️ Architect** - System design and technology selection
- **⚡ Engineer** - Code implementation and generation
- **🔍 QA** - Testing, debugging, and quality assurance

### Agent Architecture
- **State Machine** controls valid transitions
- **Event Bus** coordinates agent communication
- **Memory System** provides context and learning
- **Tool System** enables agent capabilities

## 🐛 Troubleshooting

### Common Issues

**Build fails with module errors:**
- Check that no Node.js modules are imported in renderer
- Verify all imports use proper path aliases

**IPC communication fails:**
- Ensure handlers are registered in main process
- Check preload script exposes APIs correctly
- Verify security validation isn't blocking calls

**TypeScript errors:**
- Run `npm run type-check` to see all issues
- Check that domain contracts are properly implemented
- Verify shared types are exported correctly

**Agent state issues:**
- Ensure all status changes go through StateMachine
- Check event bus subscriptions are set up
- Verify agent orchestration follows patterns

### Getting Help

1. **Check the logs** - Both main and renderer process logs
2. **Review architecture docs** - Ensure following patterns
3. **Validate contracts** - Run contract tests
4. **Check task list** - See implementation guidance

## 🚀 Next Steps

### For New Developers

1. **Read the RFC** - [`docs/rfc_maestro.md`](./docs/rfc_maestro.md)
2. **Review architecture** - [`CLAUDE.md`](./CLAUDE.md)
3. **Pick a task** - [`tasks/tasks-rfc-maestro.md`](./tasks/tasks-rfc-maestro.md)
4. **Follow the rules** - Domain-specific `CLAUDE.md` files
5. **Test everything** - Write tests as you go

### For Implementation

Start with Phase 1 tasks:
1. **Core Application Foundation** - Get basic Electron app working
2. **Three-Panel UI Architecture** - Build the main interface
3. **AI Agent System** - Implement agent personas and state machine
4. **Project Management** - Add project and task management
5. **Memory System** - Implement vector storage and retrieval
6. **Version Control** - Add git integration and checkpoints

## 💡 Tips for Success

- **Follow the architecture** - Don't deviate from established patterns
- **Read domain rules** - Each directory has specific guidelines
- **Test incrementally** - Don't write large features without tests
- **Use the tools** - Leverage scaffolding scripts and validation
- **Ask questions** - Architecture docs are there to guide you

**Happy coding! 🎭**