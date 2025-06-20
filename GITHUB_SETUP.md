# GitHub Setup for Project Maestro

## Repository Creation

To set up the GitHub repository and enable MCP integration, follow these steps:

### 1. Create GitHub Repository

```bash
# Option A: Using GitHub CLI (if installed)
gh repo create projectMaestro --private --description "A communication-centric code generation environment powered by AI personas"

# Option B: Manual creation
# 1. Go to https://github.com/new
# 2. Repository name: projectMaestro
# 3. Description: A communication-centric code generation environment powered by AI personas
# 4. Set to Private (recommended for development)
# 5. Don't initialize with README (we already have one)
# 6. Click "Create repository"
```

### 2. Add Remote and Push

```bash
# For jamandtea organization
git remote add origin https://github.com/jamandtea/projectMaestro.git
git push -u origin main
```

### 3. GitHub Personal Access Token

For the GitHub MCP to work, you need a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
   - `write:packages` (Upload packages to GitHub Package Registry)
4. Copy the token and set it as an environment variable:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GITHUB_TOKEN="your_token_here"

# Or create a .env file (don't commit this!)
echo "GITHUB_TOKEN=your_token_here" >> .env
```

### 4. Configure Git for Regular Commits

The setup includes automatic commit patterns for regular source control:

```bash
# Configure git to use your GitHub credentials
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Enable automatic commit signing (optional but recommended)
git config commit.gpgsign true
```

### 5. Branch Protection (Recommended)

After pushing, set up branch protection on GitHub:

1. Go to Settings > Branches
2. Add rule for `main` branch
3. Enable:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators

### 6. Automated Workflow Pattern

With GitHub MCP enabled, I can now:

- Create feature branches automatically
- Make regular commits with descriptive messages
- Create pull requests for major features
- Manage issues and project planning

### 7. MCP Configuration

The `mcp.json` file has been configured with:
- **Filesystem MCP**: For file operations
- **Git MCP**: For local git operations
- **GitHub MCP**: For GitHub API interactions

Make sure the `GITHUB_TOKEN` environment variable is available when running Claude Code.

## Commit Strategy

I'll follow this pattern for regular commits:

1. **Feature commits**: Small, focused changes with clear descriptions
2. **Progress commits**: Regular saves during development (every 15-30 minutes)
3. **Milestone commits**: Major feature completions
4. **Documentation commits**: Updates to docs and README files

## Pull Request Strategy

1. **Feature branches**: `feature/agent-orchestrator`, `feature/memory-system`, etc.
2. **Bug fix branches**: `fix/chat-panel-typing`, `fix/ui-layout-responsive`, etc.
3. **Documentation branches**: `docs/api-reference`, `docs/architecture-update`, etc.

Each PR will include:
- Clear description of changes
- Testing notes
- Screenshots for UI changes
- Link to related issues

## Issues and Project Management

I'll create GitHub issues for:
- Feature requests from the RFC
- Bug reports
- Technical debt items
- Documentation improvements

And use GitHub Projects to track:
- Current sprint progress
- Backlog management
- Release planning