# Supported MCP Servers

This document lists the MCP servers we plan to support in our client application, along with their installation and launch requirements.

## Official Reference Servers

### Data and File Systems

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **Filesystem** | `@modelcontextprotocol/server-filesystem` | stdio | Node.js | Secure file operations with configurable access controls |
| **PostgreSQL** | `@modelcontextprotocol/server-postgres` | stdio | Node.js, PostgreSQL driver | Read-only database access with schema inspection |
| **SQLite** | `@modelcontextprotocol/server-sqlite` | stdio | Node.js, SQLite driver | Database interaction and business intelligence |
| **Google Drive** | `@modelcontextprotocol/server-gdrive` | stdio | Node.js, Google API credentials | File access and search for Google Drive |

### Development Tools

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **Git** | `mcp-server-git` | stdio | Python, git | Git repository operations and history |
| **GitHub** | `@modelcontextprotocol/server-github` | stdio | Node.js, GitHub API token | GitHub repository management |
| **GitLab** | `@modelcontextprotocol/server-gitlab` | stdio | Node.js, GitLab API token | GitLab project management |
| **Sentry** | `@modelcontextprotocol/server-sentry` | stdio | Node.js, Sentry API token | Error tracking and monitoring |

### Web and Browser Automation

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **Brave Search** | `@modelcontextprotocol/server-brave-search` | stdio | Node.js, Brave API key | Web search capabilities |
| **Fetch** | `@modelcontextprotocol/server-fetch` | stdio | Node.js | Web content fetching optimized for LLMs |
| **Puppeteer** | `@modelcontextprotocol/server-puppeteer` | stdio | Node.js, Chrome | Browser automation and web scraping |

### Productivity and Communication

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **Slack** | `@modelcontextprotocol/server-slack` | stdio | Node.js, Slack tokens | Channel management and messaging |
| **Google Maps** | `@modelcontextprotocol/server-google-maps` | stdio | Node.js, Google Maps API key | Location services and directions |
| **Memory** | `@modelcontextprotocol/server-memory` | stdio | Node.js | Knowledge graph-based persistent memory |

### AI and Specialized Tools

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **EverArt** | `@modelcontextprotocol/server-everart` | stdio | Node.js | AI image generation |
| **Sequential Thinking** | `@modelcontextprotocol/server-sequentialthinking` | stdio | Node.js | Dynamic problem-solving through thought sequences |
| **AWS KB Retrieval** | `@modelcontextprotocol/server-aws-kb-retrieval` | stdio | Node.js, AWS credentials | Retrieval from AWS Knowledge Base |

## Third-Party Servers

| Server | Package/Command | Transport | Dependencies | Description |
|--------|----------------|-----------|--------------|-------------|
| **Axiom** | `@axiomhq/mcp-server-axiom` | stdio | Node.js, Axiom API token | Query and analyze logs and traces |
| **Dockerized MCP** | `docker run mcp/server-name` | SSE | Docker | Containerized MCP servers |
| **Weaviate** | `mcp-server-weaviate` | stdio | Python, Weaviate connection | Vector database integration |
| **Stripe** | `stripe-agent-toolkit-mcp` | stdio | Node.js, Stripe API key | Stripe API integration |

## Installation Methods

We'll need to support multiple installation methods for these servers:

1. **NPM Packages**
   - Direct installation via `npx`
   - Package caching
   - Version management

2. **PyPI Packages**
   - Installation via `pip`/`uv`
   - Virtual environment management
   - Python version compatibility

3. **Docker Containers**
   - Docker image pulling
   - Container management
   - Port mapping for SSE servers

4. **Custom Binaries**
   - Download from source
   - Permission handling
   - Platform-specific binaries

## Launch Configuration Examples

Here are examples of how we'll configure and launch different server types:

### NPM Package Example

```json
{
  "id": "filesystem-server",
  "name": "Filesystem Server",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/root"],
  "env": {},
  "transport_type": "stdio",
  "autostart": false
}
```

### Python Package Example

```json
{
  "id": "git-server",
  "name": "Git Server",
  "command": "python",
  "args": ["-m", "mcp_server_git", "--repository", "/path/to/repo"],
  "env": {
    "PYTHONUNBUFFERED": "1"
  },
  "transport_type": "stdio",
  "autostart": false
}
```

### Docker Example

```json
{
  "id": "weaviate-server",
  "name": "Weaviate Server",
  "command": "docker",
  "args": ["run", "-p", "8080:8080", "mcp/server-weaviate"],
  "env": {
    "WEAVIATE_URL": "http://localhost:8080"
  },
  "transport_type": "sse",
  "sse_url": "http://localhost:8080/sse",
  "autostart": false
}
```

## Dependencies Management

To ensure proper operation, our client will need to:

1. **Detect system dependencies**
   - Check for Node.js/npm installation
   - Verify Python version and installation
   - Check for Docker availability

2. **Manage runtime dependencies**
   - Install missing npm/pip packages
   - Pull Docker images
   - Download required binary tools

3. **Provide user guidance**
   - Explain missing dependencies
   - Offer automatic installation when possible
   - Provide manual installation instructions when needed 