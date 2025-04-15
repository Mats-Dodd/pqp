import { useState, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { useMCPServices } from "./hooks/useMCPServices";
import { useDebugGrid } from "./hooks/useDebugGrid";
import { ChatMessageArea } from "./components/chat/chat-message-area";
import { ResizableChatInput } from "./components/chat/resizable-chat-input";
import { ChatFooter } from "./components/chat/chat-footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import LayoutIcon from "./assets/layout.svg";

function App() {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const {
    messages,
    input,
    isLoading,
    setInput,
    handleSendMessage,
    messagesEndRef,
  } = useChat();
  
  const {
    services,
    serviceStarted,
    startService,
    fetchServices
  } = useMCPServices();
  
  const { showGrid, toggleGrid } = useDebugGrid();
  
  useEffect(() => {
    if (mcpOpen) {
      fetchServices();
    }
  }, [mcpOpen]);
  
  const handleSelectModel = (model: string) => {
    console.log(`Selected model: ${model}`);
  };
  
  const handleSelectService = (service: string) => {
    console.log(`Selected service: ${service}`);
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
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className={`flex-1 flex flex-col font-mono font-medium bg-black text-white px-2ch py-[var(--line-height)] ${showGrid ? 'show-grid' : ''}`}>
          <ChatMessageArea 
            messages={messages}
            messagesEndRef={messagesEndRef}
          />

          <div className="flex-shrink-0 max-w-[80ch] mx-auto w-full mt-[var(--line-height)]" style={{ width: "calc(round(down, 100%, 1ch))" }}>
            <ResizableChatInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
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
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

export default App;
