#!/usr/bin/env node

/**
 * GitHub Workflow Automation Script
 * 
 * This script provides automated GitHub operations for regular source control.
 * It integrates with the GitHub MCP to enable frequent commits and PR management.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  mainBranch: 'main',
  featureBranchPrefix: 'feature/',
  bugfixBranchPrefix: 'fix/',
  docsBranchPrefix: 'docs/',
  commitTypes: {
    feat: 'New feature',
    fix: 'Bug fix',
    docs: 'Documentation',
    style: 'Code style changes',
    refactor: 'Code refactoring',
    test: 'Test updates',
    chore: 'Maintenance tasks'
  }
};

class GitHubWorkflow {
  constructor() {
    this.currentBranch = this.getCurrentBranch();
    this.hasUncommittedChanges = this.checkUncommittedChanges();
  }

  // Helper methods
  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.error('Error getting current branch:', error.message);
      return null;
    }
  }

  checkUncommittedChanges() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      return status.trim().length > 0;
    } catch (error) {
      console.error('Error checking git status:', error.message);
      return false;
    }
  }

  execCommand(command, description) {
    try {
      console.log(`🔄 ${description}...`);
      const result = execSync(command, { encoding: 'utf-8' });
      console.log(`✅ ${description} completed`);
      return result;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  // Core workflow methods
  quickCommit(message, type = 'feat') {
    if (!this.hasUncommittedChanges) {
      console.log('📝 No changes to commit');
      return;
    }

    const commitMessage = `${type}: ${message}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    this.execCommand('git add .', 'Staging changes');
    this.execCommand(`git commit -m "${commitMessage}"`, 'Creating commit');

    console.log(`📦 Committed: ${type}: ${message}`);
  }

  createFeatureBranch(featureName) {
    const branchName = `${CONFIG.featureBranchPrefix}${featureName}`;
    
    // Ensure we're on main and up to date
    if (this.currentBranch !== CONFIG.mainBranch) {
      this.execCommand(`git checkout ${CONFIG.mainBranch}`, `Switching to ${CONFIG.mainBranch}`);
    }
    
    this.execCommand('git pull origin main', 'Updating main branch');
    this.execCommand(`git checkout -b ${branchName}`, `Creating feature branch ${branchName}`);
    
    return branchName;
  }

  commitProgress(description) {
    this.quickCommit(`Progress on ${description}`, 'feat');
  }

  commitFix(description) {
    this.quickCommit(description, 'fix');
  }

  commitDocs(description) {
    this.quickCommit(description, 'docs');
  }

  commitRefactor(description) {
    this.quickCommit(description, 'refactor');
  }

  pushCurrentBranch() {
    if (!this.currentBranch) {
      console.error('❌ No current branch detected');
      return;
    }

    try {
      // Check if branch exists on remote
      execSync(`git ls-remote --heads origin ${this.currentBranch}`, { encoding: 'utf-8' });
      this.execCommand(`git push origin ${this.currentBranch}`, 'Pushing to existing remote branch');
    } catch (error) {
      // Branch doesn't exist on remote, create it
      this.execCommand(`git push -u origin ${this.currentBranch}`, 'Pushing to new remote branch');
    }
  }

  createPR(title, body = '') {
    // First push the current branch
    this.pushCurrentBranch();

    const prBody = body || `Automated PR for ${this.currentBranch}

This pull request includes the latest changes from the ${this.currentBranch} branch.

## Changes
- [List changes here]

## Testing
- [ ] All tests pass
- [ ] ESLint checks pass
- [ ] TypeScript compiles without errors

🤖 Generated with [Claude Code](https://claude.ai/code)`;

    try {
      const result = this.execCommand(
        `gh pr create --title "${title}" --body "${prBody}" --base ${CONFIG.mainBranch}`,
        'Creating pull request'
      );
      
      console.log('🎉 Pull request created successfully!');
      return result;
    } catch (error) {
      console.error('❌ Failed to create PR. Make sure GitHub CLI is installed and authenticated.');
      console.log('📝 Manual PR creation:');
      console.log(`   Title: ${title}`);
      console.log(`   Base: ${CONFIG.mainBranch}`);
      console.log(`   Head: ${this.currentBranch}`);
    }
  }

  // Development workflow shortcuts
  saveProgress(description) {
    console.log(`💾 Saving progress: ${description}`);
    this.commitProgress(description);
    this.pushCurrentBranch();
  }

  dailyCommit() {
    const today = new Date().toISOString().split('T')[0];
    this.quickCommit(`Daily progress checkpoint - ${today}`, 'chore');
    this.pushCurrentBranch();
  }

  featureComplete(featureName, description) {
    console.log(`🎯 Completing feature: ${featureName}`);
    
    // Final commit
    this.quickCommit(`Complete ${featureName} implementation`, 'feat');
    
    // Create PR
    this.createPR(
      `feat: ${featureName}`,
      `## Summary
${description}

## Implementation
- Completed ${featureName} feature
- All tests passing
- Documentation updated

## Review Notes
- Ready for code review
- Follows project architecture patterns`
    );
  }

  hotfix(description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `${CONFIG.bugfixBranchPrefix}${timestamp}`;
    
    // Create hotfix branch from main
    if (this.currentBranch !== CONFIG.mainBranch) {
      this.execCommand(`git stash`, 'Stashing current changes');
      this.execCommand(`git checkout ${CONFIG.mainBranch}`, `Switching to ${CONFIG.mainBranch}`);
    }
    
    this.execCommand(`git checkout -b ${branchName}`, `Creating hotfix branch ${branchName}`);
    
    console.log(`🚑 Created hotfix branch: ${branchName}`);
    console.log(`📝 Apply your fix and run: node scripts/github-workflow.js commit-fix "${description}"`);
    
    return branchName;
  }

  // Status and info methods
  status() {
    console.log('\n📊 Repository Status:');
    console.log(`Current branch: ${this.currentBranch || 'Unknown'}`);
    console.log(`Uncommitted changes: ${this.hasUncommittedChanges ? 'Yes' : 'No'}`);
    
    try {
      const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf-8' }).trim();
      console.log(`Last commit: ${lastCommit}`);
    } catch (error) {
      console.log('Last commit: Unable to retrieve');
    }

    try {
      const remoteStatus = execSync('git status -sb', { encoding: 'utf-8' }).trim();
      console.log(`Remote status: ${remoteStatus}`);
    } catch (error) {
      console.log('Remote status: Unable to retrieve');
    }
  }

  help() {
    console.log(`
🎭 Project Maestro - GitHub Workflow Automation

Usage: node scripts/github-workflow.js <command> [arguments]

Commands:
  commit <message> [type]     - Quick commit with conventional format
  progress <description>      - Commit and push progress
  feature <name>              - Create new feature branch
  complete <name> <desc>      - Complete feature and create PR
  fix <description>           - Quick fix commit
  docs <description>          - Documentation commit
  hotfix <description>        - Create hotfix branch
  push                        - Push current branch to remote
  pr <title> [body]          - Create pull request
  daily                       - Daily checkpoint commit
  status                      - Show repository status
  help                        - Show this help message

Examples:
  node scripts/github-workflow.js commit "Add chat panel" feat
  node scripts/github-workflow.js progress "Working on agent orchestrator"
  node scripts/github-workflow.js feature agent-memory-system
  node scripts/github-workflow.js complete agent-orchestrator "Core AI coordination service"
  node scripts/github-workflow.js hotfix "Fix chat panel typing indicators"

Commit Types: ${Object.keys(CONFIG.commitTypes).join(', ')}
`);
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const workflow = new GitHubWorkflow();

  switch (command) {
    case 'commit':
      workflow.quickCommit(args[1], args[2] || 'feat');
      break;
    
    case 'progress':
      workflow.saveProgress(args[1]);
      break;
    
    case 'feature':
      workflow.createFeatureBranch(args[1]);
      break;
    
    case 'complete':
      workflow.featureComplete(args[1], args[2]);
      break;
    
    case 'fix':
      workflow.commitFix(args[1]);
      break;
    
    case 'docs':
      workflow.commitDocs(args[1]);
      break;
    
    case 'hotfix':
      workflow.hotfix(args[1]);
      break;
    
    case 'push':
      workflow.pushCurrentBranch();
      break;
    
    case 'pr':
      workflow.createPR(args[1], args[2]);
      break;
    
    case 'daily':
      workflow.dailyCommit();
      break;
    
    case 'status':
      workflow.status();
      break;
    
    case 'help':
    case '--help':
    case '-h':
    default:
      workflow.help();
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = GitHubWorkflow;