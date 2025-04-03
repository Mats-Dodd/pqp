# Step One: Basic MCP Client with Filesystem Server

This document outlines the specific steps to implement the first phase of our MCP client application, focusing on core functionality that works with the filesystem MCP server.

## Objective

Create a minimal but functional MCP client application that can:
1. Spawn and manage the filesystem MCP server
2. Connect to the server via stdio transport
3. Browse and view files through the MCP Resources API
4. Display a basic UI for server management and file browsing

## Implementation Steps

### 1. Project Setup (2 days)

1. **Configure Tauri with necessary capabilities**
   - Enable process spawning with the `shell` capability
   - Add command APIs for process management
   - Configure file system access permissions
   - Set up child process API support

2. **Set up project directory structure**
   - Create backend folders for server management, MCP client
   - Set up frontend folders for components and pages
   - Add type definitions for server configuration

3. **Install required dependencies**
   - Add Tauri v2 dependencies
   - Install React dependencies
   - Add TypeScript types for MCP protocol

### 2. Backend Implementation (5 days)

1. **Implement server configuration storage**
   ```rust
   // In src-tauri/src/server/config.rs
   pub struct ServerConfig {
       pub id: String,
       pub name: String,
       pub command: String,
       pub args: Vec<String>, 
       pub working_dir: Option<String>,
       pub transport_type: TransportType,
   }
   
   // Functions for loading/saving configurations
   pub fn load_server_configs() -> Result<Vec<ServerConfig>, Error> {...}
   pub fn save_server_config(config: ServerConfig) -> Result<(), Error> {...}
   ```

2. **Create process management module**
   ```rust
   // In src-tauri/src/server/process.rs
   pub struct ProcessHandle {
       pub id: String,
       pub server_id: String,
       pub pid: u32,
       pub status: ProcessStatus,
       pub stdin: Option<ChildStdin>,
       pub stdout: Option<ChildStdout>,
       pub stderr: Option<ChildStderr>,
   }
   
   pub async fn spawn_server_process(config: &ServerConfig) -> Result<ProcessHandle, Error> {...}
   pub async fn stop_server_process(handle: &ProcessHandle) -> Result<(), Error> {...}
   ```

3. **Implement stdio transport for MCP**
   ```rust
   // In src-tauri/src/mcp/transport/stdio.rs
   pub struct StdioTransport {
       stdin: ChildStdin,
       stdout: ChildStdout,
       reader: BufReader<ChildStdout>,
   }
   
   impl Transport for StdioTransport {
       async fn send(&mut self, message: String) -> Result<(), Error> {...}
       async fn receive(&mut self) -> Result<String, Error> {...}
       async fn close(&mut self) -> Result<(), Error> {...}
   }
   ```

4. **Create basic MCP client**
   ```rust
   // In src-tauri/src/mcp/client.rs
   pub struct McpClient {
       transport: Box<dyn Transport>,
       capabilities: NegotiatedCapabilities,
   }
   
   impl McpClient {
       pub async fn connect(transport: Box<dyn Transport>) -> Result<Self, Error> {...}
       pub async fn list_resources(&self) -> Result<Vec<Resource>, Error> {...}
       pub async fn read_resource(&self, uri: &str) -> Result<ResourceContent, Error> {...}
   }
   ```

5. **Expose Tauri commands**
   ```rust
   // In src-tauri/src/commands/server_mgmt.rs
   #[tauri::command]
   pub async fn list_server_configs() -> Result<Vec<ServerConfig>, String> {...}
   
   #[tauri::command]
   pub async fn save_server_config(config: ServerConfig) -> Result<(), String> {...}
   
   #[tauri::command]
   pub async fn start_server(server_id: String) -> Result<ProcessHandle, String> {...}
   
   #[tauri::command]
   pub async fn stop_server(process_id: String) -> Result<(), String> {...}
   ```
   
   ```rust
   // In src-tauri/src/commands/mcp_client.rs
   #[tauri::command]
   pub async fn list_resources(process_id: String) -> Result<Vec<Resource>, String> {...}
   
   #[tauri::command]
   pub async fn read_resource(process_id: String, uri: String) -> Result<ResourceContent, String> {...}
   ```

### 3. Frontend Implementation (5 days)

1. **Create server configuration type definitions**
   ```typescript
   // In src/types/server.ts
   export interface ServerConfig {
     id: string;
     name: string;
     command: string;
     args: string[];
     workingDirectory?: string;
     transportType: 'stdio' | 'sse';
   }
   
   export interface ProcessHandle {
     id: string;
     serverId: string;
     pid: number;
     status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
   }
   ```

2. **Implement hooks for Tauri commands**
   ```typescript
   // In src/hooks/useServerManager.ts
   export function useServerManager() {
     const [servers, setServers] = useState<ServerConfig[]>([]);
     const [processes, setProcesses] = useState<ProcessHandle[]>([]);
     
     const listServers = async () => {
       const configs = await invoke<ServerConfig[]>('list_server_configs');
       setServers(configs);
     };
     
     const startServer = async (serverId: string) => {
       const process = await invoke<ProcessHandle>('start_server', { serverId });
       setProcesses(prev => [...prev, process]);
       return process;
     };
     
     // Additional functions...
     
     return { servers, processes, listServers, startServer, /* ... */ };
   }
   ```

3. **Create server management components**
   ```tsx
   // In src/components/server/ServerList.tsx
   const ServerList: React.FC = () => {
     const { servers, processes, startServer, stopServer } = useServerManager();
     
     useEffect(() => {
       // Load servers on mount
     }, []);
     
     return (
       <div className="server-list">
         {servers.map(server => (
           <ServerItem 
             key={server.id}
             server={server}
             process={processes.find(p => p.serverId === server.id)}
             onStart={() => startServer(server.id)}
             onStop={() => stopServer(/* ... */)}
           />
         ))}
       </div>
     );
   };
   ```

4. **Build file browser components**
   ```tsx
   // In src/components/mcp/ResourceBrowser.tsx
   const ResourceBrowser: React.FC<{ processId: string }> = ({ processId }) => {
     const [resources, setResources] = useState<Resource[]>([]);
     const [selectedResource, setSelectedResource] = useState<string | null>(null);
     const [content, setContent] = useState<ResourceContent | null>(null);
     
     useEffect(() => {
       // Load resources for the given process
       const loadResources = async () => {
         const res = await invoke<Resource[]>('list_resources', { processId });
         setResources(res);
       };
       
       loadResources();
     }, [processId]);
     
     const handleResourceSelect = async (uri: string) => {
       setSelectedResource(uri);
       const content = await invoke<ResourceContent>('read_resource', { 
         processId, 
         uri 
       });
       setContent(content);
     };
     
     return (
       <div className="resource-browser">
         <div className="resource-list">
           {resources.map(resource => (
             <div 
               key={resource.uri} 
               className={`resource-item ${selectedResource === resource.uri ? 'selected' : ''}`}
               onClick={() => handleResourceSelect(resource.uri)}
             >
               {resource.name}
             </div>
           ))}
         </div>
         {content && (
           <div className="resource-content">
             {/* Render content based on type */}
             {content.type === 'text' && <pre>{content.text}</pre>}
             {/* Handle other content types */}
           </div>
         )}
       </div>
     );
   };
   ```

5. **Implement main application page**
   ```tsx
   // In src/pages/ServerManager/index.tsx
   const ServerManagerPage: React.FC = () => {
     const { servers, processes } = useServerManager();
     const [selectedServer, setSelectedServer] = useState<string | null>(null);
     const [activeProcess, setActiveProcess] = useState<ProcessHandle | null>(null);
     
     // Logic to handle server selection and activation
     
     return (
       <div className="server-manager-page">
         <div className="sidebar">
           <ServerList 
             onSelectServer={setSelectedServer}
             onServerStarted={process => setActiveProcess(process)}
           />
         </div>
         <div className="main-content">
           {activeProcess ? (
             <ResourceBrowser processId={activeProcess.id} />
           ) : (
             <div className="empty-state">
               Select and start a server to browse resources
             </div>
           )}
         </div>
       </div>
     );
   };
   ```

### 4. Filesystem Server Integration (3 days)

1. **Create predefined filesystem server configuration**
   ```typescript
   const FILESYSTEM_SERVER_CONFIG: ServerConfig = {
     id: 'filesystem-server',
     name: 'Filesystem Server',
     command: 'npx',
     args: ['-y', '@modelcontextprotocol/server-filesystem', '/'], // Root directory
     transportType: 'stdio',
   };
   ```

2. **Implement server discovery for filesystem server**
   ```typescript
   // Function to check if filesystem server exists in config
   const ensureFilesystemServer = async () => {
     const configs = await invoke<ServerConfig[]>('list_server_configs');
     
     if (!configs.find(config => config.id === 'filesystem-server')) {
       // Add the filesystem server to configurations
       await invoke('save_server_config', { config: FILESYSTEM_SERVER_CONFIG });
     }
   };
   ```

3. **Add filesystem-specific UI elements**
   - File/directory picker for changing root directory
   - File type icons based on extensions
   - Preview for common file types

### 5. Testing and Debugging (3 days)

1. **Set up test cases**
   - Test server configuration saving/loading
   - Test server process spawning
   - Test MCP communication
   - Test file listing and content viewing

2. **Implement error handling**
   - Display meaningful error messages
   - Add error boundaries in React
   - Create fallback mechanisms

3. **Add debugging tools**
   - Log viewer for server process output
   - Connection status monitoring
   - Manual server restart option

### 6. Polish and Refinement (2 days)

1. **Improve UI/UX**
   - Add loading states
   - Implement error states
   - Create a more intuitive file browser
   - Add dark/light mode support

2. **Performance optimizations**
   - Implement resource caching
   - Add pagination for large directories
   - Optimize re-renders

3. **Final testing**
   - Cross-platform testing
   - Edge case handling
   - User flow validation

## File Structure for Step One

```
/
├── src/
│   ├── components/
│   │   ├── server/
│   │   │   ├── ServerList.tsx         # Server listing component
│   │   │   └── ServerItem.tsx         # Individual server component
│   │   └── mcp/
│   │       ├── ResourceBrowser.tsx    # File browser component
│   │       └── ResourceViewer.tsx     # File content viewer
│   ├── hooks/
│   │   ├── useServerManager.ts        # Server management hook
│   │   └── useMcpResources.ts         # MCP resources hook
│   ├── pages/
│   │   └── ServerManager/
│   │       └── index.tsx              # Main page component
│   ├── types/
│   │   ├── server.ts                  # Server type definitions
│   │   └── mcp.ts                     # MCP type definitions
│   └── App.tsx                        # Main app component
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── server_mgmt.rs         # Server management commands
│   │   │   └── mcp_client.rs          # MCP client commands
│   │   ├── server/
│   │   │   ├── config.rs              # Server configuration
│   │   │   └── process.rs             # Process management
│   │   ├── mcp/
│   │   │   ├── client.rs              # MCP client implementation
│   │   │   ├── transport/
│   │   │   │   └── stdio.rs           # Stdio transport
│   │   │   └── types.rs               # MCP type definitions
│   │   ├── main.rs                    # Entry point
│   │   └── lib.rs                     # Library exports
│   └── Cargo.toml                     # Rust dependencies
└── package.json                       # NPM dependencies
```

## Next Steps After Completion

Upon completing the Step One implementation, we'll have a basic but functional MCP client that can spawn, connect to, and interact with the filesystem MCP server. From here, we can:

1. Expand to support additional server types
2. Implement more MCP features (tools, prompts)
3. Enhance the UI with more sophisticated components
4. Add server marketplace functionality 