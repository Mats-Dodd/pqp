import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// Define interfaces for type safety
interface Tool {
  name: string;
  description: string;
}

interface ToolsResponse {
  success: boolean;
  tools: Tool[];
  message: string;
}

interface ToolCallResponse {
  success: boolean;
  result: string | null;
  message: string;
}

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [shellOutput, setShellOutput] = useState("");
  const [serviceStarted, setServiceStarted] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [toolArgs, setToolArgs] = useState("{}");
  const [toolResult, setToolResult] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  async function startService() {
    try {
      console.log("Starting MCP server...");
      setShellOutput("Starting MCP server...");
      const result = await invoke("start_service", {
        serviceName: "mcp-server",
        path: "/Users/matthewdodd/Documents",
      });
      console.log("Server result:", result);
      setShellOutput(JSON.stringify(result, null, 2));
      setServiceStarted(true);
    } catch (error) {
      console.error("Server error:", error);
      setShellOutput(`Error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async function listTools() {
    try {
      console.log("Listing tools...");
      const result = await invoke<ToolsResponse>("list_tools", {
        serviceName: "mcp-server",
      });
      console.log("Tools:", result);
      setTools(result.tools || []);
      setShellOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("List tools error:", error);
      setShellOutput(`Error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  async function callTool() {
    if (!selectedTool) {
      setToolResult("Please select a tool first");
      return;
    }

    try {
      console.log(`Calling tool ${selectedTool} with args:`, toolArgs);
      let args;
      try {
        args = JSON.parse(toolArgs);
      } catch (e) {
        setToolResult("Invalid JSON arguments");
        return;
      }

      const result = await invoke<ToolCallResponse>("call_tool", {
        serviceName: "mcp-server",
        toolName: selectedTool,
        arguments: args,
      });
      console.log("Tool call result:", result);
      setToolResult(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Tool call error:", error);
      setToolResult(`Error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  return (
    <main className="container">
      <h1>MCP Tool Explorer</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <div className="section">
        <h2>1. Start MCP Server</h2>
        <button onClick={startService} disabled={serviceStarted}>
          {serviceStarted ? "Server Started" : "Start MCP Server"}
        </button>
        {shellOutput && (
          <div className="output-container">
            <h3>Server Output:</h3>
            <pre>{shellOutput}</pre>
          </div>
        )}
      </div>

      <div className="section">
        <h2>2. List Available Tools</h2>
        <button onClick={listTools} disabled={!serviceStarted}>
          List Tools
        </button>
        {tools.length > 0 && (
          <div className="tools-list">
            <h3>Available Tools:</h3>
            <ul>
              {tools.map((tool) => (
                <li key={tool.name}>
                  <button onClick={() => setSelectedTool(tool.name)}>
                    {tool.name}
                  </button>
                  <p>{tool.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="section">
        <h2>3. Call a Tool</h2>
        <div className="tool-form">
          <div>
            <label>Selected Tool: </label>
            <strong>{selectedTool || "None"}</strong>
          </div>
          <div>
            <label>Arguments (JSON):</label>
            <textarea
              value={toolArgs}
              onChange={(e) => setToolArgs(e.target.value)}
              rows={5}
              placeholder='{"key": "value"}'
            />
          </div>
          <button onClick={callTool} disabled={!selectedTool}>
            Call Tool
          </button>
        </div>
        {toolResult && (
          <div className="output-container">
            <h3>Tool Result:</h3>
            <pre>{toolResult}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
