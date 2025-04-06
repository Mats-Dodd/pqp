import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";

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

  const [shellOutput, setShellOutput] = useState("");
  const [serviceStarted, setServiceStarted] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [toolArgs, setToolArgs] = useState("{}");
  const [toolResult, setToolResult] = useState("");

  async function startService() {
    try {
      console.log("Starting MCP server...");
      setShellOutput("Starting MCP server...");
      const result = await invoke("start_service", {
        serviceName: "mcp-server",
        executable: "npx",
        args: [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "/Users/matthewdodd/Documents"
        ]
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
    <main className="container mx-auto p-8 text-center max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-primary">MCP Tool Explorer</h1>

      <div className="flex justify-center mb-8 space-x-4">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="h-24 p-6 transition-[filter] duration-750 hover:drop-shadow-[0_0_2em_#747bff]" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="h-24 p-6 transition-[filter] duration-750 hover:drop-shadow-[0_0_2em_#24c8db]" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="h-24 p-6 transition-[filter] duration-750 hover:drop-shadow-[0_0_2em_#61dafb]" alt="React logo" />
        </a>
      </div>

      <div className="border border-border rounded-lg p-5 mb-5 bg-card text-card-foreground shadow-md text-left">
        <h2 className="text-xl font-semibold text-primary mb-4">1. Start MCP Server</h2>
        <Button onClick={startService} disabled={serviceStarted}>
          {serviceStarted ? "Server Started" : "Start MCP Server"}
        </Button>
        {shellOutput && (
          <div className="bg-muted/90 text-muted-foreground p-4 rounded-lg mt-4 text-left overflow-x-auto">
            <h3 className="font-semibold mb-2">Server Output:</h3>
            <pre className="m-0 whitespace-pre-wrap text-sm">{shellOutput}</pre>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-5 mb-5 bg-card text-card-foreground shadow-md text-left">
        <h2 className="text-xl font-semibold text-primary mb-4">2. List Available Tools</h2>
        <Button onClick={listTools} disabled={!serviceStarted}>
          List Tools
        </Button>
        {tools.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Available Tools:</h3>
            <ul className="list-none p-0 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {tools.map((tool) => (
                <li key={tool.name} className="bg-background border border-border rounded-lg p-4 flex flex-col items-center text-center">
                  <Button variant="link" onClick={() => setSelectedTool(tool.name)} className="text-lg font-medium p-0 h-auto">
                    {tool.name}
                  </Button>
                  <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg p-5 mb-5 bg-card text-card-foreground shadow-md text-left">
        <h2 className="text-xl font-semibold text-primary mb-4">3. Call a Tool</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-1.5">
            <label className="font-bold">Selected Tool: </label>
            <strong className="font-mono text-primary">{selectedTool || "None"}</strong>
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <label htmlFor="toolArgsTextarea" className="font-bold">Arguments (JSON):</label>
            <textarea
              id="toolArgsTextarea"
              value={toolArgs}
              onChange={(e) => setToolArgs(e.target.value)}
              rows={5}
              placeholder='{"key": "value"}'
              className="w-full p-2.5 rounded border border-input bg-background font-mono text-sm"
            />
          </div>
          <Button onClick={callTool} disabled={!selectedTool}>
            Call Tool
          </Button>
        </div>
        {toolResult && (
          <div className="bg-muted/90 text-muted-foreground p-4 rounded-lg mt-4 text-left overflow-x-auto">
            <h3 className="font-semibold mb-2">Tool Result:</h3>
            <pre className="m-0 whitespace-pre-wrap text-sm">{toolResult}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
