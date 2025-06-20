# 🐙 GitHub MCP Server Setup Guide

This guide explains how to set up the official GitHub MCP server for enhanced GitHub integration with Project Maestro.

## 🚀 Overview

The GitHub MCP server provides direct API access to GitHub with these capabilities:

### 🛠️ **Available Toolsets**
- **`context`**: Repository context and navigation (recommended)
- **`issues`**: Create, update, and manage GitHub issues
- **`pull_requests`**: Create, review, and manage pull requests
- **`repository`**: Repository management and file operations
- **`search`**: Search across GitHub repositories and code
- **`actions`**: GitHub Actions workflow management
- **`code_security`**: Security analysis and vulnerability management

### 📋 **Prerequisites**
- Docker installed and running
- GitHub Personal Access Token with appropriate scopes
- Claude Code with MCP support

## 🔧 Installation Options

### Option 1: Docker (Recommended)

**Install Docker** if not already installed:

```bash
# Ubuntu/WSL
sudo apt update
sudo apt install docker.io
sudo systemctl start docker
sudo usermod -aG docker $USER

# macOS
brew install --cask docker

# Windows
# Download Docker Desktop from docker.com
```

**Configure the MCP server**:
```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_TOKEN}",
        "--toolsets", "context,issues,pull_requests,repository,search,actions",
        "ghcr.io/github/github-mcp-server"
      ]
    }
  }
}
```

### Option 2: Local Binary (Alternative)

If Docker isn't available, check for pre-built binaries:

```bash
# Check GitHub releases for native binaries
curl -s https://api.github.com/repos/github/github-mcp-server/releases/latest
```

### Option 3: Remote Server (Cloud)

For VS Code with Claude Code extension:
```json
{
  "mcp": {
    "servers": {
      "github": {
        "url": "https://api.githubcopilot.com/mcp/",
        "auth": {
          "type": "oauth"
        }
      }
    }
  }
}
```

## 🔑 Authentication Setup

### GitHub Personal Access Token

**Create token with these scopes**:
- [x] `repo` - Full repository access
- [x] `workflow` - GitHub Actions access
- [x] `write:packages` - Package registry access
- [x] `read:org` - Organization membership
- [x] `project` - GitHub Projects access
- [x] `security_events` - Security events (for code_security toolset)
- [x] `admin:repo_hook` - Repository webhooks
- [x] `read:discussion` - Discussions access

**Set environment variable**:
```bash
export GITHUB_TOKEN="your_github_token_here"

# Or add to your shell profile
echo 'export GITHUB_TOKEN="your_token"' >> ~/.bashrc
```

## 🎯 Configuration for Project Maestro

### Current Configuration

The `mcp.json` is configured with optimal toolsets for our workflow:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "./.git"]
    },
    "github": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "GITHUB_PERSONAL_ACCESS_TOKEN=${GITHUB_TOKEN}",
        "--toolsets", "context,issues,pull_requests,repository,search,actions",
        "ghcr.io/github/github-mcp-server"
      ]
    }
  }
}
```

### Toolset Customization

**For Development Focus**:
```bash
--toolsets context,issues,pull_requests,repository
```

**For Full DevOps**:
```bash
--toolsets context,issues,pull_requests,repository,search,actions,code_security
```

**For Read-Only Access**:
```bash
--toolsets context,search --read-only
```

## 🧪 Testing the Setup

### 1. Verify Docker and Pull Image

```bash
# Test Docker
docker --version

# Pull GitHub MCP server image
docker pull ghcr.io/github/github-mcp-server:latest
```

### 2. Test Authentication

```bash
# Test GitHub API access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Should return your GitHub user information
```

### 3. Test MCP Server

```bash
# Test the server directly
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN \
  --toolsets context,repository \
  ghcr.io/github/github-mcp-server
```

### 4. Test with Claude Code

Once configured, test these operations:
- **Repository Context**: Ask about repository structure
- **Issue Management**: Create and update issues
- **Pull Request**: Create PRs with proper descriptions
- **Code Search**: Search across repository code

## 🎭 Project Maestro Integration

### Enhanced Capabilities

With the GitHub MCP server, I can now:

**📋 Project Management**:
- Create GitHub issues for RFC tasks automatically
- Update project boards and milestones
- Link commits to issues and PRs

**🔄 Advanced Workflows**:
- Create draft PRs during development
- Request specific reviewers based on code changes
- Auto-assign labels and milestones

**🔍 Code Intelligence**:
- Search across the entire repository
- Analyze dependencies and references
- Review security vulnerabilities

**📊 Analytics & Insights**:
- Track development velocity
- Monitor code quality metrics
- Generate development reports

### Automated Workflow Examples

**Feature Development**:
```bash
# 1. Create feature issue
# GitHub MCP: Create issue with proper labels and milestone

# 2. Create feature branch
npm run git:feature agent-memory-system

# 3. Regular development with auto-PR updates
npm run git:progress "Implementing vector storage"
# GitHub MCP: Update linked PR draft with progress

# 4. Complete with comprehensive PR
npm run git:complete agent-memory-system "LanceDB integration"
# GitHub MCP: Create final PR with reviewers, labels, and project links
```

**Bug Triage Workflow**:
```bash
# 1. Auto-detect and create bug issues from errors
# GitHub MCP: Create bug issue with labels and priority

# 2. Hotfix branch with issue linking
npm run git:hotfix "memory-leak-agent-state"
# GitHub MCP: Create hotfix PR linked to bug issue

# 3. Auto-close issues when fixed
npm run git:fix "Prevent memory leak in agent cleanup"
# GitHub MCP: Update issue status and close when merged
```

## 🚨 Troubleshooting

### Common Issues

**Docker not found**:
```bash
# Install Docker Desktop or Docker Engine
# Enable WSL 2 integration if on Windows
```

**Authentication failures**:
```bash
# Verify token scopes at https://github.com/settings/tokens
# Ensure token has 'repo' and 'workflow' permissions
# Check token hasn't expired
```

**MCP connection issues**:
```bash
# Verify environment variable is set
echo $GITHUB_TOKEN

# Test Docker image can run
docker run --rm ghcr.io/github/github-mcp-server --help
```

**Performance issues**:
```bash
# Use fewer toolsets for better performance
--toolsets context,repository

# Enable read-only mode if not making changes
--read-only
```

## 🎯 Next Steps

1. **Complete Docker Setup**: Install Docker Desktop/Engine
2. **Verify Token Permissions**: Ensure all required scopes are enabled
3. **Test MCP Integration**: Verify Claude Code can access GitHub MCP
4. **Create Test Repository**: Use jamandtea/projectMaestro for testing
5. **Enable Advanced Workflows**: Start using automated issue and PR management

## 📚 Advanced Configuration

### Enterprise GitHub

For GitHub Enterprise:
```bash
--github-api-url https://your-github-enterprise.com/api/v3
```

### Custom Toolsets

Create focused configurations:
```json
{
  "github-readonly": {
    "command": "docker",
    "args": [..., "--toolsets", "context,search", "--read-only"]
  },
  "github-admin": {
    "command": "docker", 
    "args": [..., "--toolsets", "context,repository,actions,code_security"]
  }
}
```

### Performance Optimization

```bash
# Cache Docker image locally
docker pull ghcr.io/github/github-mcp-server:latest

# Use specific tags for consistency
ghcr.io/github/github-mcp-server:v1.0.0
```

---

**Once Docker is set up and the GitHub token is verified, the GitHub MCP server will provide powerful automation capabilities for Project Maestro development!**