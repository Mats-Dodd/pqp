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
import ChatIcon from "./assets/chat.svg";
import { setupApiRoutes } from "./lib/api-routes";
import { defaultModel } from "./lib/ai-provider";

setupApiRoutes();

function App() {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [chatKey, setChatKey] = useState(0);
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
  } = useChat({
    api: '/api/chat',
    body: {
      model: selectedModel,
    },
    id: `chat-${chatKey}`,
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
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey) && event.key === '/') {
        event.preventDefault();
        setModelsOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const handleSelectModel = (modelId: string) => {
    console.log(`Selected model ID: ${modelId}`);
    setSelectedModel(modelId);
  };
  
  const handleSelectService = (service: string) => {
    console.log(`Selected service: ${service}`);
  };
  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e, {
      body: {
        model: selectedModel,
      },
    });
  };

  const resetChat = () => {
    setChatKey(prev => prev + 1);
  };
  
  const isChatLoading = status === 'submitted' || status === 'streaming';
  
  return (
    <SidebarProvider>
      <div className="fixed top-[var(--line-height)] left-[10px] z-20">
        <SidebarTrigger>
          <img src={LayoutIcon} alt="Toggle Sidebar" className="w-5 h-5" />
        </SidebarTrigger>
        <button onClick={resetChat} title="New Chat">
          <img src={ChatIcon} alt="New Chat" className="w-5 h-5" />
        </button>
      </div>
      
      <AppSidebar />
      
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
                isLoading={isChatLoading}
              />
              
              <ChatFooter
                isLoading={isChatLoading}
                serviceStarted={serviceStarted}
                services={services}
                modelsOpen={modelsOpen}
                setModelsOpen={setModelsOpen}
                mcpOpen={mcpOpen}
                setMcpOpen={setMcpOpen}
                onToggleGrid={toggleGrid}
                onSelectModel={handleSelectModel}
                selectedModelId={selectedModel}
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
