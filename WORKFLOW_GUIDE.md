# 🔄 Automated GitHub Workflow Guide

This guide explains how to use the automated GitHub workflow system for extremely regular source control operations with Project Maestro.

## 🚀 Quick Start

The workflow system is now configured and ready to use. All operations can be performed through simple npm commands or direct script calls.

### Basic Operations

```bash
# Commit current changes
npm run git:commit "Your commit message" [type]

# Save progress and push to remote
npm run git:progress "Working on agent orchestrator"

# Check repository status
npm run git:status

# Push current branch
npm run git:push

# Daily checkpoint commit
npm run git:daily
```

### Feature Development Workflow

```bash
# 1. Create a new feature branch
npm run git:feature agent-memory-system

# 2. Work on your feature and save progress regularly
npm run git:progress "Implementing vector storage"
npm run git:progress "Adding memory retrieval system"
npm run git:progress "Testing memory persistence"

# 3. Complete the feature and create PR
npm run git:complete agent-memory-system "Core memory system with LanceDB integration"
```

### Bug Fix Workflow

```bash
# Create hotfix branch for urgent fixes
npm run git:hotfix "Fix chat panel typing indicators"

# Apply your fix, then commit
npm run git:fix "Fix typing indicator race condition"

# Push and create PR
npm run git:push
npm run git:pr "fix: Chat panel typing indicators" "Fixes race condition in typing state"
```

## 🎯 Commit Types and Conventions

The system uses conventional commit formats:

- **feat**: New features
- **fix**: Bug fixes  
- **docs**: Documentation updates
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test updates
- **chore**: Maintenance tasks

### Examples

```bash
npm run git:commit "Add agent state visualization" feat
npm run git:commit "Fix panel resize handle" fix
npm run git:commit "Update architecture documentation" docs
npm run git:commit "Refactor store patterns" refactor
```

## 📋 Regular Development Pattern

For Project Maestro development, I'll follow this pattern:

### Daily Operations
1. **Morning**: `npm run git:status` to check current state
2. **During development**: `npm run git:progress "description"` every 15-30 minutes
3. **Bug fixes**: `npm run git:fix "description"` immediately when fixed
4. **End of day**: `npm run git:daily` for checkpoint

### Feature Development
1. **Start**: `npm run git:feature feature-name`
2. **Progress**: Regular progress commits with descriptive messages
3. **Complete**: `npm run git:complete feature-name "description"`
4. **Review**: Create PR with comprehensive description

### Documentation Updates
```bash
npm run git:docs "Update component architecture guide"
npm run git:docs "Add API documentation for agent system"
npm run git:docs "Enhance README with usage examples"
```

## 🔧 Advanced Usage

### Direct Script Usage

```bash
# Full command syntax
node scripts/github-workflow.cjs <command> [arguments]

# Examples
node scripts/github-workflow.cjs commit "Message" feat
node scripts/github-workflow.cjs feature new-ui-component
node scripts/github-workflow.cjs complete agent-orchestrator "Core AI coordination"
```

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `commit` | Quick commit with message | `commit "Add feature" feat` |
| `progress` | Save progress and push | `progress "Working on UI"` |
| `feature` | Create feature branch | `feature agent-memory` |
| `complete` | Complete feature + PR | `complete agent-memory "Memory system"` |
| `fix` | Quick fix commit | `fix "Fix typing issue"` |
| `docs` | Documentation commit | `docs "Update README"` |
| `hotfix` | Create hotfix branch | `hotfix "Critical bug"` |
| `push` | Push current branch | `push` |
| `pr` | Create pull request | `pr "Title" "Body"` |
| `daily` | Daily checkpoint | `daily` |
| `status` | Repository status | `status` |

## 🎭 Project Maestro Specific Patterns

### Implementation Phases

**Phase 1 Commits** (UI Foundation):
```bash
npm run git:progress "Implementing three-panel layout"
npm run git:progress "Adding chat interface components"
npm run git:complete ui-foundation "Core three-panel architecture with resizable panels"
```

**Phase 2 Commits** (Agent System):
```bash
npm run git:feature agent-orchestrator
npm run git:progress "Building agent coordination service"
npm run git:progress "Adding state machine integration"
npm run git:complete agent-orchestrator "Core AI agent coordination and communication"
```

**Phase 3 Commits** (Memory & Workflow):
```bash
npm run git:feature memory-system
npm run git:progress "Implementing LanceDB vector storage"
npm run git:progress "Adding multi-tier memory architecture"
npm run git:complete memory-system "Complete memory system with context persistence"
```

### Bug Triage Pattern

```bash
# Immediate fixes
npm run git:fix "Fix panel resize handle dragging"
npm run git:fix "Correct agent status indicator colors"
npm run git:fix "Resolve chat scroll to bottom issue"

# Critical issues
npm run git:hotfix "Memory leak in agent state management"
# Apply fix...
npm run git:fix "Prevent memory leak in agent subscription cleanup"
npm run git:pr "hotfix: Memory leak in agent state management" "Critical fix for production stability"
```

### Documentation Maintenance

```bash
npm run git:docs "Update component architecture patterns"
npm run git:docs "Add agent persona documentation"
npm run git:docs "Enhance API reference with examples"
npm run git:docs "Document memory system design patterns"
```

## 🚨 Important Notes

### Before First Use

1. **GitHub Repository**: Create the repository first (see GITHUB_SETUP.md)
2. **Remote Setup**: `git remote add origin https://github.com/USERNAME/projectMaestro.git`
3. **GitHub CLI**: Install `gh` CLI for PR creation
4. **Authentication**: Set up GitHub token for MCP integration

### Best Practices

1. **Commit Early and Often**: Use progress commits every 15-30 minutes
2. **Descriptive Messages**: Be specific about what changed
3. **Feature Branches**: Always use feature branches for new work
4. **Test Before PR**: Ensure tests pass before creating pull requests
5. **Regular Pushes**: Don't let local work pile up

### MCP Integration

The GitHub MCP server enables:
- **Automated PR creation** with proper formatting
- **Issue management** for project tracking
- **Repository insights** and statistics
- **Automated code review** requests

## 🎯 Success Metrics

With this workflow system, we can achieve:

- **Commits**: 5-10 per day with meaningful messages
- **Feature PRs**: 1-2 per week with comprehensive descriptions
- **Bug Fixes**: Immediate commits when issues are resolved
- **Documentation**: Regular updates with feature development
- **Code Quality**: Consistent patterns and review processes

The automation reduces friction and enables focus on the actual development work while maintaining excellent source control hygiene.

---

**This workflow system enables the vision of Project Maestro: making software development accessible through better tooling and automation.**