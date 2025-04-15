import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useMCPServices } from "./hooks/useMCPServices";
import { useDebugGrid } from "./hooks/useDebugGrid";
import { ChatMessageArea } from "./components/chat/chat-message-area";
import { ResizableChatInput } from "./components/chat/resizable-chat-input";
import { ChatFooter } from "./components/chat/chat-footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import LayoutIcon from "./assets/layout.svg";
import { setupApiRoutes } from "./lib/api-routes";

// Set up API route interception (replaces the need for Next.js API routes)
setupApiRoutes();

function App() {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  
  // Standard useChat configuration that works with our intercepted /api/chat endpoint
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    // No need for special model/fetch overrides anymore, as they're handled by our API route
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const {
    services,
    serviceStarted,
    fetchServices
  } = useMCPServices();
  
  const { showGrid, toggleGrid } = useDebugGrid();
  
  useEffect(() => {
    if (mcpOpen) {
      fetchServices();
    }
  }, [mcpOpen, fetchServices]);
  
  const handleSelectModel = (modelId: string) => {
    console.log(`Selected model: ${modelId}`);
    // TODO: Implement logic to update the model - this would now need to be handled
    // at the API route level by updating the defaultModel in ai-provider.ts
  };
  
  const handleSelectService = (service: string) => {
    console.log(`Selected service: ${service}`);
  };
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e);
  };
  
  return (
    <SidebarProvider>
      {/* Fixed position SidebarTrigger */}
      <div className="fixed top-[var(--line-height)] left-[10px] z-20">
        <SidebarTrigger>
          <img src={LayoutIcon} alt="Toggle Sidebar" className="w-5 h-5" />
        </SidebarTrigger>
      </div>
      
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main content area takes remaining space */}
      <main className="flex-1 flex flex-col h-screen">
        <div className={`flex-1 flex flex-col font-mono font-medium text-white px-2ch py-[var(--line-height)] ${showGrid ? 'show-grid' : ''} overflow-hidden`}>
          <div className="flex-1 overflow-y-auto">
            {error && <div className="text-red-500 p-2">Error: {error.message}</div>}
            <ChatMessageArea
              messages={messages}
              messagesEndRef={messagesEndRef}
            />
          </div>

          <div className="flex-shrink-0 max-w-[80ch] mx-auto w-full mt-[var(--line-height)]" style={{ width: "calc(round(down, 100%, 1ch))" }}>
            <form onSubmit={handleFormSubmit}>
              <ResizableChatInput
                input={input}
                handleInputChange={handleInputChange}
                isLoading={isLoading}
              />
              
              <ChatFooter
                isLoading={isLoading}
                serviceStarted={serviceStarted}
                services={services}
                modelsOpen={modelsOpen}
                setModelsOpen={setModelsOpen}
                mcpOpen={mcpOpen}
                setMcpOpen={setMcpOpen}
                onToggleGrid={toggleGrid}
                onSelectModel={handleSelectModel}
                onSelectService={handleSelectService}
              />
            </form>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

export default App;
