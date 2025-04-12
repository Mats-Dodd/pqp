import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface MCPServiceConfig {
  serviceName: string;
  executable: string;
  args: string[];
}

const DEFAULT_SERVICE: MCPServiceConfig = {
  serviceName: "filesystem",
  executable: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/Users/matthewdodd/Documents"
  ]
};

export function useMCPServices() {
  const [services, setServices] = useState<string[]>([]);
  const [serviceStarted, setServiceStarted] = useState(false);
  const [shellOutput, setShellOutput] = useState<string>("");
  const initializationRef = useRef(false);
  
  useEffect(() => {
    // Only start the service if it hasn't been started and we haven't attempted to start it yet
    if (!serviceStarted && !initializationRef.current) {
      initializationRef.current = true;
      startService();
    }
  }, [serviceStarted]);
  
  async function startService(config: MCPServiceConfig = DEFAULT_SERVICE) {
    try {
      console.log(`Starting MCP service: ${config.serviceName}...`);
      setShellOutput(`Starting MCP service: ${config.serviceName}...`);
      
      const result = await invoke("start_service", {
        serviceName: config.serviceName,
        executable: config.executable,
        args: config.args
      });
      
      setShellOutput(JSON.stringify(result, null, 2));
      setServiceStarted(true);
      return result;
    } catch (error) {
      console.error("Service error:", error);
      setShellOutput(`Error: ${JSON.stringify(error, null, 2)}`);
      throw error;
    }
  }
  
  async function fetchServices() {
    try {
      const servicesList = await invoke<string[]>('get_services');
      setServices(servicesList);
      return servicesList;
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
      return [];
    }
  }
  
  return {
    services,
    serviceStarted,
    shellOutput,
    startService,
    fetchServices
  };
} 