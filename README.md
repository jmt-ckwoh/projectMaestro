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

### ✅ **Epic 1: Core Chat Interface - COMPLETED** (June 2025)
**18 Story Points Delivered** | **Foundation Ready for Epic 2**

- ✅ **Multi-agent chat interface** with team communication patterns
- ✅ **@mention system** for direct agent targeting with autocomplete  
- ✅ **Message persistence** with infinite scroll and auto-save
- ✅ **Agent personalities** with emoji-based avatars and distinct voices
- ✅ **Thread management** for conversation organization
- ✅ **Runtime error detection framework** (critical infrastructure)
- ✅ **Comprehensive IPC architecture** with type-safe communication
- ✅ **ES module compatibility** for modern Electron development

**Validation**: Non-technical users can successfully manage AI agents through familiar chat patterns. Professional UX comparable to Slack/Discord.

### ✅ **Completed Infrastructure** (Phases 1-3.5)
- ✅ **Three-Panel Architecture** - Chat + Workspace + Agent panels
- ✅ **Memory System** - LanceDB vector storage with AWS Bedrock embeddings
- ✅ **Agent Framework** - Producer, Architect, Engineer, QA with state machines
- ✅ **Testing Framework** - Runtime error prevention with comprehensive validation
- ✅ **TypeScript Architecture** - Clean compilation with domain contracts
- ✅ **Development Tooling** - Modern stack with quality automation

### 🎯 **Next Priority: Epic 2 - Visual Workspace (Tree View)**
**Target**: Project management interface using familiar PM tools

**Ready to Build**: Epic 1 provides proven foundation for visual workspace integration

### 📋 **Future Epics**
- **Epic 3**: Project Infrastructure (session persistence, data models)
- **Epic 4**: Agent Management System (status panels, configuration)  
- **Epic 5**: Advanced Visualization (Kanban boards, workflow management)
- **Epic 6**: Live AI Integration (real AI responses, streaming)
- **Epic 7**: Code Generation Environment (working software output)

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
- **Playwright** - End-to-end testing framework
- **Vitest** - Unit testing framework
- **Claude Test Generator** - AI-driven test generation
- **GitHub Actions** - CI/CD automation

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git for version control
- GitHub account (for MCP integration)

### Installation

```bash
# Clone the repository
git clone https://github.com/jamandtea/projectMaestro.git
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
npm run test:e2e     # Run E2E tests with Playwright
npm run test:all     # Run all tests (unit + E2E)
npm run lint         # Check code style
npm run type-check   # TypeScript type checking
npm run storybook    # Component development environment
```

## 📚 Documentation

### 🎯 **Planning & Progress**
- [**Primary Task Tracking**](maestro_agile_tasks.md) - Epic → Story → Task structure with story points
- [**Epic 1 Completion**](docs/epics/EPIC_1_COMPLETION_SUMMARY.md) - Complete achievement summary
- [**Project Vision**](docs/PROJECT_VISION.md) - Product definition and user journey

### 🏗️ **Architecture & Development**
- [**Architecture Guide**](CLAUDE.md) - Technical implementation details and critical rules
- [**Component Guide**](src/renderer/components/CLAUDE.md) - UI development patterns
- [**Store Architecture**](src/renderer/stores/STORE_ARCHITECTURE.md) - State management patterns
- [**Agent System**](src/main/services/agents/CLAUDE.md) - AI agent implementation

### 📖 **Complete Documentation Index**
- [**Documentation Hub**](docs/README.md) - Organized documentation index with navigation

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