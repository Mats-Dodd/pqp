# MCP Server Spawning Implementation Plan

## Overview

The server spawning component is a critical part of our MCP client application, enabling users to launch and manage MCP servers directly from within the application. This document outlines the detailed technical approach for implementing this functionality.

## Core Requirements

1. **Process Creation**: Ability to spawn child processes for MCP servers
2. **Process Management**: Monitor and control the lifecycle of spawned processes
3. **Configuration**: Store and manage server configurations
4. **Transport Binding**: Connect to spawned servers via appropriate transport
5. **Error Handling**: Gracefully handle process failures and errors
6. **Security**: Ensure secure execution of third-party code

## Technical Design

### 1. Rust Backend Components

#### Server Registry

The server registry will maintain a catalog of available servers and their configurations:

```rust
pub struct ServerConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub working_dir: Option<String>,
    pub transport_type: TransportType,
    pub autostart: bool,
    pub metadata: ServerMetadata,
}

pub struct ServerMetadata {
    pub version: Option<String>,
    pub source: Option<String>,
    pub capabilities: Vec<String>,
}

pub struct ServerRegistry {
    servers: HashMap<String, ServerConfig>,
    // Methods for CRUD operations on server configs
}
```

#### Process Manager

The process manager will handle spawning and monitoring server processes:

```rust
pub struct ProcessHandle {
    pub id: String,
    pub server_id: String,
    pub pid: u32,
    pub status: ProcessStatus,
    pub stdin: Option<ChildStdin>,
    pub stdout: Option<ChildStdout>,
    pub stderr: Option<ChildStderr>,
    pub exit_code: Option<i32>,
    pub started_at: SystemTime,
}

pub enum ProcessStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Failed,
}

pub struct ProcessManager {
    processes: HashMap<String, ProcessHandle>,
    // Methods for process lifecycle management
}
```

#### Connection Manager

The connection manager will establish and maintain connections to spawned servers:

```rust
pub struct ConnectionManager {
    connections: HashMap<String, McpConnection>,
    // Methods for connection management
}

pub struct McpConnection {
    pub id: String,
    pub server_id: String,
    pub transport: Box<dyn Transport>,
    pub capabilities: NegotiatedCapabilities,
    pub status: ConnectionStatus,
}
```

### 2. Tauri Commands API

We'll expose the following commands to the frontend:

```rust
#[tauri::command]
async fn list_server_configs() -> Result<Vec<ServerConfig>, String> {
    // Return list of configured servers
}

#[tauri::command]
async fn save_server_config(config: ServerConfig) -> Result<(), String> {
    // Save server configuration
}

#[tauri::command]
async fn start_server(server_id: String) -> Result<ProcessHandle, String> {
    // Start server process
}

#[tauri::command]
async fn stop_server(process_id: String) -> Result<(), String> {
    // Stop server process
}

#[tauri::command]
async fn get_server_status(process_id: String) -> Result<ProcessStatus, String> {
    // Get current server status
}

#[tauri::command]
async fn get_server_logs(process_id: String, limit: Option<usize>) -> Result<Vec<LogEntry>, String> {
    // Get server logs
}
```

### 3. Process Spawning Implementation

The core process spawning functionality will be implemented as follows:

```rust
async fn spawn_server_process(config: &ServerConfig) -> Result<ProcessHandle, Error> {
    // 1. Prepare environment
    let mut command = Command::new(&config.command);
    command.args(&config.args);
    
    // 2. Set environment variables
    for (key, value) in &config.env {
        command.env(key, value);
    }
    
    // 3. Set working directory if specified
    if let Some(dir) = &config.working_dir {
        command.current_dir(dir);
    }
    
    // 4. Configure stdio handling based on transport type
    match config.transport_type {
        TransportType::Stdio => {
            command.stdin(Stdio::piped());
            command.stdout(Stdio::piped());
        },
        TransportType::SSE => {
            // For SSE, we don't need to pipe stdio
            command.stdin(Stdio::null());
        }
    }
    
    // Always capture stderr for logging
    command.stderr(Stdio::piped());
    
    // 5. Spawn the process
    let mut child = command.spawn()?;
    
    // 6. Create process handle
    let handle = ProcessHandle {
        id: generate_id(),
        server_id: config.id.clone(),
        pid: child.id(),
        status: ProcessStatus::Starting,
        stdin: child.stdin.take(),
        stdout: child.stdout.take(),
        stderr: child.stderr.take(),
        exit_code: None,
        started_at: SystemTime::now(),
    };
    
    // 7. Start monitoring the process
    spawn_process_monitor(handle.clone(), child);
    
    Ok(handle)
}

fn spawn_process_monitor(handle: ProcessHandle, mut child: Child) {
    // This would be a separate task that monitors the process
    tokio::spawn(async move {
        // Monitor process and update status
        let exit_status = child.wait().await;
        
        // Update process status based on exit result
        match exit_status {
            Ok(status) => {
                // Process exited, update handle
                update_process_status(handle.id.clone(), 
                                      ProcessStatus::Stopped, 
                                      Some(status.code().unwrap_or(-1)));
            },
            Err(e) => {
                // Process failed, update handle
                update_process_status(handle.id.clone(), 
                                      ProcessStatus::Failed, 
                                      None);
                log_error!("Process monitoring error: {}", e);
            }
        }
    });
}
```

### 4. Connection Establishment

After spawning a server, we need to establish an MCP connection:

```rust
async fn connect_to_server(handle: &ProcessHandle, config: &ServerConfig) -> Result<McpConnection, Error> {
    // Create appropriate transport based on config
    let transport: Box<dyn Transport> = match config.transport_type {
        TransportType::Stdio => {
            if let (Some(stdin), Some(stdout)) = (&handle.stdin, &handle.stdout) {
                Box::new(StdioTransport::new(stdin.clone(), stdout.clone()))
            } else {
                return Err(Error::TransportError("Missing stdio handles".to_string()));
            }
        },
        TransportType::SSE => {
            // For SSE, construct using server URL (derived from config/process info)
            let url = format!("http://localhost:{}/sse", get_server_port(handle)?);
            Box::new(SSETransport::new(url))
        }
    };
    
    // Create client with appropriate configuration
    let client = McpClient::new(ClientConfig {
        name: "tauri-mcp-client".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        capabilities: ClientCapabilities {
            resources: Some(ResourcesCapabilities {}),
            tools: Some(ToolsCapabilities {}),
            prompts: Some(PromptsCapabilities {}),
            sampling: None, // Not supporting sampling initially
        },
    });
    
    // Connect client to transport
    let connection = client.connect(transport).await?;
    
    // Store connection
    let mcp_connection = McpConnection {
        id: generate_id(),
        server_id: config.id.clone(),
        transport: connection.transport,
        capabilities: connection.capabilities,
        status: ConnectionStatus::Connected,
    };
    
    Ok(mcp_connection)
}
```

### 5. Log Management

We'll capture and manage server logs:

```rust
async fn capture_process_logs(handle: &ProcessHandle) {
    if let Some(stderr) = &handle.stderr {
        // Create a buffered reader
        let mut reader = BufReader::new(stderr.clone());
        let mut line = String::new();
        
        // Read lines as they become available
        while let Ok(bytes_read) = reader.read_line(&mut line).await {
            if bytes_read == 0 {
                break; // End of stream
            }
            
            // Store log entry
            add_log_entry(handle.id.clone(), LogLevel::Stderr, line.clone());
            line.clear();
        }
    }
}

async fn add_log_entry(process_id: String, level: LogLevel, message: String) {
    // Store log in database or memory
    let entry = LogEntry {
        process_id,
        timestamp: SystemTime::now(),
        level,
        message,
    };
    
    // Store in log storage
    log_storage().insert(entry);
    
    // Notify frontend of new log entry
    notify_frontend_of_log();
}
```

## Frontend Components

### 1. Server Configuration UI

```tsx
// ServerConfigForm.tsx
const ServerConfigForm: React.FC<{
  initialConfig?: ServerConfig;
  onSave: (config: ServerConfig) => void;
}> = ({ initialConfig, onSave }) => {
  const [config, setConfig] = useState<ServerConfig>(
    initialConfig || {
      id: generateId(),
      name: '',
      command: '',
      args: [],
      env: {},
      transport_type: 'stdio',
      autostart: false,
    }
  );
  
  // Form rendering and handling
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields for server configuration */}
    </form>
  );
};
```

### 2. Server Management UI

```tsx
// ServerManager.tsx
const ServerManager: React.FC = () => {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [processes, setProcesses] = useState<ProcessHandle[]>([]);
  
  // Load servers on component mount
  useEffect(() => {
    const loadServers = async () => {
      const configs = await invoke<ServerConfig[]>('list_server_configs');
      setServers(configs);
    };
    
    loadServers();
  }, []);
  
  // Start server function
  const startServer = async (serverId: string) => {
    try {
      const process = await invoke<ProcessHandle>('start_server', { serverId });
      setProcesses(prev => [...prev, process]);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };
  
  // Stop server function
  const stopServer = async (processId: string) => {
    try {
      await invoke('stop_server', { processId });
      // Update process status
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };
  
  return (
    <div>
      <h1>Server Management</h1>
      
      <div className="server-list">
        {servers.map(server => (
          <ServerItem 
            key={server.id}
            server={server}
            process={processes.find(p => p.server_id === server.id)}
            onStart={() => startServer(server.id)}
            onStop={() => stopServer(server.id)}
          />
        ))}
      </div>
      
      <button onClick={() => setShowAddServer(true)}>
        Add Server
      </button>
      
      {showAddServer && (
        <ServerConfigForm 
          onSave={handleSaveServer}
          onCancel={() => setShowAddServer(false)}
        />
      )}
    </div>
  );
};
```

### 3. Server Status and Logs

```tsx
// ServerDetail.tsx
const ServerDetail: React.FC<{
  serverId: string;
}> = ({ serverId }) => {
  const [server, setServer] = useState<ServerConfig | null>(null);
  const [process, setProcess] = useState<ProcessHandle | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Load server details
  useEffect(() => {
    const loadServerDetails = async () => {
      const config = await invoke<ServerConfig>('get_server_config', { serverId });
      setServer(config);
      
      // Check if server is running
      const processes = await invoke<ProcessHandle[]>('list_processes');
      const serverProcess = processes.find(p => p.server_id === serverId);
      if (serverProcess) {
        setProcess(serverProcess);
      }
    };
    
    loadServerDetails();
  }, [serverId]);
  
  // Subscribe to logs
  useEffect(() => {
    if (process) {
      const unsubscribe = subscribeToLogs(process.id, (newLogs) => {
        setLogs(prev => [...prev, ...newLogs]);
      });
      
      return () => unsubscribe();
    }
  }, [process]);
  
  return (
    <div className="server-detail">
      {server && (
        <>
          <h2>{server.name}</h2>
          <div className="server-info">
            {/* Server information */}
          </div>
          
          <div className="server-controls">
            {process ? (
              <button onClick={() => stopServer(process.id)}>
                Stop Server
              </button>
            ) : (
              <button onClick={() => startServer(server.id)}>
                Start Server
              </button>
            )}
          </div>
          
          <div className="server-logs">
            <h3>Logs</h3>
            <div className="log-viewer">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry ${log.level}`}>
                  <span className="timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

## Implementation Steps

### Phase 1: Core Process Management

1. **Set up process spawning infrastructure**
   - Implement basic Command execution in Rust
   - Set up process monitoring
   - Add stderr capture for logs

2. **Create server configuration storage**
   - Design configuration schema
   - Implement persistence (JSON file)
   - Add configuration validation

3. **Build basic Tauri commands**
   - Expose core process management commands
   - Add server configuration commands
   - Implement log retrieval

### Phase 2: Transport Integration

1. **Implement stdio transport**
   - Set up piped stdio handling
   - Create transport abstraction
   - Connect to stdin/stdout of process

2. **Add SSE transport support**
   - Implement SSE client
   - Add HTTP POST support
   - Handle SSE-specific connection issues

3. **Build unified connection manager**
   - Create connection abstraction
   - Implement capability negotiation
   - Add connection monitoring

### Phase 3: Frontend Integration

1. **Build server configuration UI**
   - Create form components
   - Implement validation
   - Add configuration saving

2. **Implement server management UI**
   - Create server list view
   - Add server control buttons
   - Implement status monitoring

3. **Build log viewer**
   - Create log display component
   - Implement log subscription
   - Add filtering and search

### Phase 4: Registry and Discovery

1. **Implement server registry**
   - Create built-in server catalog
   - Add server metadata handling
   - Implement version tracking

2. **Add package management**
   - Support npm/pip package resolution
   - Implement dependency checking
   - Add package installation

3. **Build server marketplace UI**
   - Create discovery interface
   - Add installation flow
   - Implement update checking

## Security Considerations

1. **Process Isolation**
   - Run server processes with minimal permissions
   - Consider sandboxing options for each platform
   - Validate and sanitize all user inputs

2. **Resource Control**
   - Implement resource limits for spawned processes
   - Monitor CPU and memory usage
   - Provide graceful shutdown for misbehaving processes

3. **Configuration Validation**
   - Validate all server configurations
   - Sanitize command paths
   - Check for potential security issues

4. **Secure Storage**
   - Store sensitive configuration securely
   - Encrypt credentials when needed
   - Implement proper access controls

## Testing Strategy

1. **Unit Tests**
   - Test process spawning logic
   - Validate configuration handling
   - Verify log capture

2. **Integration Tests**
   - Test end-to-end process lifecycle
   - Verify connection establishment
   - Test transport implementations

3. **Security Tests**
   - Test permission boundaries
   - Validate sanitization
   - Check for resource leaks

4. **Platform-Specific Tests**
   - Test on Windows, macOS, and Linux
   - Verify platform-specific behaviors
   - Test with different server types 