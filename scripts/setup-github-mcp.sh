#!/bin/bash

# GitHub MCP Server Setup Script for Project Maestro
# This script helps set up the official GitHub MCP server

set -e

echo "🐙 Setting up GitHub MCP Server for Project Maestro"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running on supported platform
check_platform() {
    print_status "Checking platform compatibility..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        PLATFORM="linux"
        print_success "Linux detected"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
        print_success "macOS detected"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        PLATFORM="windows"
        print_success "Windows detected"
    else
        print_error "Unsupported platform: $OSTYPE"
        exit 1
    fi
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
        
        # Test if Docker daemon is running
        if docker info &> /dev/null; then
            print_success "Docker daemon is running"
        else
            print_warning "Docker is installed but daemon is not running"
            print_status "Please start Docker Desktop or Docker service"
            return 1
        fi
    else
        print_warning "Docker not found"
        return 1
    fi
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    case $PLATFORM in
        "linux")
            print_status "Installing Docker on Linux..."
            if command -v apt &> /dev/null; then
                # Ubuntu/Debian
                sudo apt update
                sudo apt install -y docker.io
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker $USER
                print_warning "Please log out and back in to use Docker without sudo"
            elif command -v yum &> /dev/null; then
                # RHEL/CentOS
                sudo yum install -y docker
                sudo systemctl start docker
                sudo systemctl enable docker
                sudo usermod -aG docker $USER
            else
                print_error "Unsupported Linux distribution"
                print_status "Please install Docker manually: https://docs.docker.com/engine/install/"
                return 1
            fi
            ;;
        "macos")
            print_status "Installing Docker on macOS..."
            if command -v brew &> /dev/null; then
                brew install --cask docker
                print_success "Docker Desktop installed"
                print_warning "Please start Docker Desktop manually"
            else
                print_error "Homebrew not found"
                print_status "Please install Docker Desktop: https://docs.docker.com/desktop/mac/install/"
                return 1
            fi
            ;;
        "windows")
            print_status "Installing Docker on Windows..."
            print_warning "Please install Docker Desktop manually:"
            print_status "https://docs.docker.com/desktop/windows/install/"
            print_status "Make sure to enable WSL 2 integration"
            return 1
            ;;
    esac
}

# Pull GitHub MCP Server image
pull_github_mcp() {
    print_status "Pulling GitHub MCP Server Docker image..."
    
    if docker pull ghcr.io/github/github-mcp-server:latest; then
        print_success "GitHub MCP Server image downloaded"
    else
        print_error "Failed to pull GitHub MCP Server image"
        return 1
    fi
}

# Test GitHub token
test_github_token() {
    print_status "Testing GitHub token..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_warning "GITHUB_TOKEN environment variable not set"
        print_status "Please set your GitHub token:"
        echo "export GITHUB_TOKEN=\"your_token_here\""
        return 1
    fi
    
    # Test API access
    if curl -s -f -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null; then
        USER_INFO=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | jq -r '.login // "unknown"')
        print_success "GitHub token valid for user: $USER_INFO"
    else
        print_error "GitHub token invalid or insufficient permissions"
        print_status "Please check your token at: https://github.com/settings/tokens"
        return 1
    fi
}

# Test GitHub MCP Server
test_github_mcp() {
    print_status "Testing GitHub MCP Server..."
    
    # Test basic connection
    if timeout 10 docker run --rm \
        -e GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
        ghcr.io/github/github-mcp-server \
        --help > /dev/null 2>&1; then
        print_success "GitHub MCP Server is working"
    else
        print_error "GitHub MCP Server test failed"
        return 1
    fi
}

# Setup environment file
setup_env_file() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please update .env with your actual token values"
    else
        print_success ".env file already exists"
    fi
}

# Update MCP configuration
update_mcp_config() {
    print_status "Verifying MCP configuration..."
    
    if [ -f "mcp.json" ]; then
        print_success "mcp.json configuration found"
        print_status "GitHub MCP server configured with toolsets:"
        print_status "  - context (repository navigation)"
        print_status "  - issues (issue management)" 
        print_status "  - pull_requests (PR management)"
        print_status "  - repository (repo operations)"
        print_status "  - search (code search)"
        print_status "  - actions (GitHub Actions)"
    else
        print_error "mcp.json not found"
        return 1
    fi
}

# Main setup function
main() {
    echo
    print_status "Starting GitHub MCP Server setup..."
    echo
    
    # Run checks and setup
    check_platform
    echo
    
    if ! check_docker; then
        print_status "Docker installation required"
        read -p "Install Docker? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_docker
        else
            print_warning "Docker installation skipped"
            print_status "Please install Docker manually and run this script again"
            exit 1
        fi
    fi
    echo
    
    pull_github_mcp
    echo
    
    test_github_token
    echo
    
    test_github_mcp
    echo
    
    setup_env_file
    echo
    
    update_mcp_config
    echo
    
    print_success "GitHub MCP Server setup complete!"
    echo
    print_status "Next steps:"
    print_status "1. Start Claude Code with MCP support"
    print_status "2. Verify GitHub MCP server connection"
    print_status "3. Test repository operations"
    echo
    print_status "To test the integration:"
    print_status "  npm run git:status"
    print_status "  npm run git:feature test-github-mcp"
    echo
}

# Run main function
main "$@"