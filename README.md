# Project Maestro

A communication-centric code generation environment that empowers non-technical users to build software by managing a team of AI personas.

## Overview

Project Maestro reimagines software development as a management task rather than a coding task. Users guide a team of specialized AI agents (Producer, Architect, Engineer, QA) through natural conversation to transform ideas into working applications.

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build
```

## Architecture

The application follows Electron's process model with strict separation:

- **Main Process** (`src/main/`) - Backend with Node.js access
- **Renderer Process** (`src/renderer/`) - React UI (no Node.js!)
- **Preload Script** (`src/preload/`) - Secure bridge between processes

See [ARCHITECTURE.MD](./ARCHITECTURE.MD) for detailed architecture documentation.

## Development

### Key Commands

```bash
npm run dev          # Start development server
npm run lint         # Lint and fix code
npm run type-check   # Check TypeScript types
npm test            # Run tests
npm run build       # Build production app
```

### Documentation

- [Architecture](./ARCHITECTURE.MD) - System design and patterns
- [API Documentation](./docs/api/README.md) - IPC API reference
- [Component Guide](./docs/components/README.md) - React component patterns
- [Agent System](./docs/agents/README.md) - AI agent documentation
- [Quick Reference](./CLAUDE_CODE_QUICKREF.md) - Quick lookup for common tasks

### Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # React application
├── preload/        # Context bridge
└── shared/         # Shared types
```

## Features

- **AI Team Management** - Direct a team of specialized AI personas
- **Visual Project Management** - Trello-like task boards and Slack-like chat
- **Local-First** - All data stored locally using LanceDB
- **Git Integration** - Automatic version control with visual checkpoints
- **Extensible** - Bring your own AI provider keys

## Technology Stack

- **Framework**: Electron + React + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **AI Orchestration**: LangChain.js
- **Vector Database**: LanceDB
- **Build Tool**: Vite

## Contributing

1. Read the [Architecture Documentation](./ARCHITECTURE.MD)
2. Follow the coding standards in the blueprint
3. Make small, focused commits
4. Run `npm run lint` before committing
5. Ensure all tests pass with `npm test`

## License

MIT License - see LICENSE file for details