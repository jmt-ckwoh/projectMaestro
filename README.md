# 🎭 Project Maestro

> A communication-centric code generation environment powered by AI personas

Project Maestro transforms software development from a coding task into a management and collaboration experience. Instead of writing code directly, you guide a specialized team of AI agents through a intuitive "Slack + Trello + Team" interface.

## ✨ Vision

**Traditional AI coding tools** require a developer's mindset and technical expertise. **Project Maestro** empowers non-technical users with strong communication and management skills to build software by leading an AI team.

- **User-as-Manager**: You lead, delegate, and coordinate rather than code
- **Communication-First**: Chat-based interaction with personified AI agents  
- **Best Practices Built-In**: Structured workflows ensure quality without technical overhead
- **Progressive Disclosure**: Simple by default, customizable for power users

## 🏗️ Three-Panel Architecture

### 📱 Left Panel: "The Slack"
Chat interface for real-time communication with your AI team:
- Group conversations and direct messaging to specific agents
- Message history and context preservation
- Typing indicators and agent status awareness
- Voice input support for natural "brain dumps"

### 📋 Center Panel: "The Trello" 
Project workspace with context-dependent views:
- **Project Board**: Kanban-style task management (Epics → Stories → Tasks)
- **Architecture**: Visual system design and technical planning
- **Files**: Code browser and file management interface
- **Chat Focus**: Expanded conversation view for detailed discussions

### 👥 Right Panel: "The Team"
AI agent roster with live activity monitoring:
- **Producer** 👔: Project manager and facilitator
- **Architect** 🏗️: System designer and technical strategist  
- **Engineer** ⚡: Code generator and implementer
- **QA** 🔍: Quality assurance and testing specialist

## 🤖 AI Agent System

Each agent has specialized capabilities and distinct personalities:

- **Autonomous Coordination**: Agents collaborate without micromanagement
- **State Machine Behavior**: Predictable transitions (Idle → Thinking → Working → Review)
- **Real-Time Status**: Visual indicators show what each agent is doing
- **Memory System**: Multi-tier context (Global, Project, Task levels)
- **BYOK Support**: Bring your own API keys for OpenAI, Anthropic, etc.

## 🚀 Current Implementation Status

### ✅ Completed (Phase 1)
- [x] **Three-Panel UI Layout** with resizable/collapsible panels
- [x] **Chat Interface** with agent attribution and typing indicators
- [x] **Agent State Management** with visual status indicators
- [x] **Workspace Panel** with context switching between views
- [x] **Team Panel** with agent cards and statistics
- [x] **Modern Tech Stack** (TypeScript, React, Electron, Vitest, Tailwind)
- [x] **Architecture Foundation** (Domain-driven design, event patterns)

### 🚧 In Progress (Phase 2)
- [ ] **Agent Orchestrator** - Core AI coordination service
- [ ] **Memory System** - LanceDB vector storage for context
- [ ] **Project Workflow** - Guided initialization and task management
- [ ] **File Operations** - Secure file system integration
- [ ] **Version Control** - Git integration with checkpoint system

### 📋 Planned (Phase 3+)
- [ ] **AI Provider Integration** (OpenAI, Anthropic, AWS Bedrock)
- [ ] **Advanced Workflows** (Bug triage, code review, testing)
- [ ] **Plugin System** - Extensible agent capabilities
- [ ] **Multi-Project Support** - Portfolio management
- [ ] **Collaboration Features** - Team workspaces and sharing

## 🛠️ Technology Stack

### Frontend (Renderer Process)
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling system
- **Zustand** - Lightweight state management
- **Vitest** - Fast unit testing framework

### Backend (Main Process)  
- **Electron** - Cross-platform desktop application
- **Node.js** - JavaScript runtime for backend services
- **Express.js** - Web server for API endpoints
- **LanceDB** - Vector database for AI memory
- **LangChain.js** - AI orchestration and tool integration

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESLint** - Code linting and formatting
- **Storybook** - Component development and testing
- **GitHub Actions** - CI/CD automation

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git for version control
- GitHub account (for MCP integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/projectMaestro.git
cd projectMaestro

# Install dependencies
npm install

# Run development environment
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development with hot reload
npm run build        # Build for production
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run lint         # Check code style
npm run type-check   # TypeScript type checking
npm run storybook    # Component development environment
```

## 📚 Documentation

- [**RFC Document**](docs/rfc_maestro.md) - Original design specification
- [**Architecture Guide**](CLAUDE.md) - Technical implementation details
- [**Component Guide**](src/renderer/components/CLAUDE.md) - UI development patterns
- [**Agent System**](src/main/services/agents/CLAUDE.md) - AI agent implementation
- [**GitHub Setup**](GITHUB_SETUP.md) - Repository and MCP configuration

## 🎯 Design Goals

1. **Accessibility First**: Designed for non-technical users with management skills
2. **Communication-Centric**: Natural language interaction over code syntax
3. **Quality by Default**: Best practices embedded in workflows
4. **Scalable Architecture**: Clean separation of concerns and domain boundaries
5. **Extensible Platform**: Plugin system for custom agents and capabilities

## 🤝 Contributing

Project Maestro follows a structured development approach:

1. **Domain-Driven Design** - Clear service boundaries and contracts
2. **Test-Driven Development** - Comprehensive test coverage
3. **Component-First UI** - Reusable, accessible interface elements
4. **Documentation-First** - Every feature documented before implementation

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Claude Code** - AI-powered development environment by Anthropic
- **Model Context Protocol (MCP)** - Enabling AI-tool integration
- **Electron Community** - Cross-platform desktop framework
- **React Community** - Modern UI development patterns

---

**Built with ❤️ by AI and Human collaboration**

*Project Maestro represents a new paradigm in software development - where communication skills matter more than coding syntax, and AI agents handle the technical complexity while you focus on the vision.*