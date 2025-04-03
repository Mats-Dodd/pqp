# Directory Structure Plan

This document outlines the planned directory structure for our MCP client application, showing how the codebase will be organized.

## Top-Level Structure

```
/
├── src/                     # React frontend code
├── src-tauri/               # Tauri/Rust backend code
├── public/                  # Static assets
├── plan/                    # Project planning and documentation
└── node_modules/            # NPM packages (git-ignored)
```

## Frontend Structure (React)

```
src/
├── assets/                  # Images, icons, etc.
├── components/              # Reusable UI components
│   ├── common/              # Generic UI components
│   ├── server/              # Server management components
│   ├── mcp/                 # MCP-specific components
│   └── layout/              # Layout components
├── pages/                   # Top-level page components
│   ├── ServerManager/       # Server management page
│   ├── ResourceBrowser/     # Resource browser page
│   ├── ToolExplorer/        # Tool exploration page
│   ├── PromptLibrary/       # Prompt template page
│   └── Chat/                # LLM chat interface
├── hooks/                   # Custom React hooks
│   ├── useTauriCommands.ts  # Hook for Tauri command invocation
│   ├── useServerManager.ts  # Hook for server management
│   └── useMcpClient.ts      # Hook for MCP client functionality
├── contexts/                # React context providers
│   ├── ServerContext.tsx    # Server state context
│   └── McpContext.tsx       # MCP connection context
├── types/                   # TypeScript type definitions
│   ├── server.ts            # Server types
│   ├── mcp.ts               # MCP protocol types
│   └── ui.ts                # UI-specific types
├── utils/                   # Utility functions
│   ├── format.ts            # Formatting utilities
│   └── validation.ts        # Validation utilities
├── App.tsx                  # Main application component
└── main.tsx                 # Application entry point
```

## Backend Structure (Tauri/Rust)

```
src-tauri/
├── src/                     # Rust code
│   ├── main.rs              # Entry point
│   ├── lib.rs               # Library exports
│   ├── commands/            # Tauri command implementations
│   │   ├── server_mgmt.rs   # Server management commands
│   │   └── mcp_client.rs    # MCP client commands
│   ├── server/              # Server management
│   │   ├── config.rs        # Server configuration
│   │   ├── process.rs       # Process management
│   │   ├── registry.rs      # Server registry
│   │   └── logs.rs          # Log handling
│   ├── mcp/                 # MCP client implementation
│   │   ├── client.rs        # Client implementation
│   │   ├── protocol.rs      # Protocol handling
│   │   ├── transport/       # Transport implementations
│   │   │   ├── stdio.rs     # Stdio transport
│   │   │   └── sse.rs       # SSE transport
│   │   └── types.rs         # MCP type definitions
│   └── utils/               # Utility functions
│       ├── fs.rs            # File system utilities
│       └── process.rs       # Process utilities
├── Cargo.toml               # Rust dependencies
├── Cargo.lock               # Locked dependencies
├── tauri.conf.json          # Tauri configuration
├── build.rs                 # Build script
└── capabilities/            # Tauri capabilities
    └── main.json            # Main capabilities file
```

## Storage Structure

Data will be stored in standard OS-specific application directories:

```
{APP_DATA_DIR}/
├── config/                  # Configuration
│   ├── servers.json         # Server configurations
│   └── settings.json        # Application settings
├── logs/                    # Log files
│   └── {server_id}/         # Server-specific logs
├── cache/                   # Cached data
│   └── {server_id}/         # Server-specific cache
└── state/                   # Application state
    └── connections.json     # Connection state
```

## Module Dependencies

The dependency flow between major components will be:

```
React UI → Tauri Commands API → Rust Backend Services → OS Services
   ↑               ↓                     ↓
   └───────────────┴─────────────────────┘
           (Events & Callbacks)
```

## Key Files and Their Responsibilities

### Frontend (React)

- **src/contexts/ServerContext.tsx**: Manages server state and operations
- **src/contexts/McpContext.tsx**: Manages MCP connections and protocol
- **src/hooks/useTauriCommands.ts**: Wraps Tauri command invocations
- **src/components/server/ServerList.tsx**: UI for server listing and management
- **src/components/server/ServerConfig.tsx**: UI for server configuration
- **src/components/mcp/ResourceBrowser.tsx**: UI for browsing resources
- **src/components/mcp/ToolExplorer.tsx**: UI for exploring and using tools
- **src/components/mcp/PromptLibrary.tsx**: UI for prompt templates

### Backend (Rust)

- **src-tauri/src/server/config.rs**: Server configuration handling
- **src-tauri/src/server/process.rs**: Process spawning and management
- **src-tauri/src/server/registry.rs**: Server registry and discovery
- **src-tauri/src/mcp/client.rs**: MCP client implementation
- **src-tauri/src/mcp/transport/stdio.rs**: Stdio transport implementation
- **src-tauri/src/mcp/transport/sse.rs**: SSE transport implementation
- **src-tauri/src/commands/server_mgmt.rs**: Server management Tauri commands

## Development Workflow

Code changes will typically flow through:

1. **src-tauri/src/**: Implement backend functionality
2. **src-tauri/src/commands/**: Expose functionality to frontend
3. **src/hooks/**: Create React hooks for the commands
4. **src/contexts/**: Implement state management
5. **src/components/**: Build UI components
6. **src/pages/**: Assemble pages from components

This structure emphasizes separation of concerns while maintaining clear pathways for data flow and component interaction. 