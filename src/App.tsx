import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [shellOutput, setShellOutput] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  async function runShellCommand() {
    try {
      console.log("Starting MCP server...");
      setShellOutput("Starting MCP server...");
      const result = await invoke("run_shell_command");
      console.log("Server result:", result);
      setShellOutput(String(result));
    } catch (error) {
      console.error("Server error:", error);
      setShellOutput(`Error: ${JSON.stringify(error, null, 2)}`);
    }
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

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
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

      <div className="row">
        <button onClick={runShellCommand}>Start MCP Server</button>
        {shellOutput && (
          <div className="output-container">
            <h3>Server Output:</h3>
            <pre>{shellOutput}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
