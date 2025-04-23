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
import { 
  getDb, 
  createConversation, 
  addMessage, 
  getConversation, 
  getMessages, 
  Message as DbMessage,
  Conversation,
  forkConversation
} from "./lib/db";
import { EventEmitter } from '@/lib/event-emitter';

setupApiRoutes();

// Create a global event emitter for sidebar reload events
export const sidebarEvents = new EventEmitter();

function App() {
  const [modelsOpen, setModelsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);
  const [chatKey, setChatKey] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [conversationName, setConversationName] = useState<string>("New Chat");
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    setMessages
  } = useChat({
    api: '/api/chat',
    body: {
      model: selectedModel,
    },
    id: `chat-${chatKey}`,
    onFinish: () => {
      // Trigger sidebar reload when chat finishes
      if (currentConversationId) {
        sidebarEvents.emit('reload');
      }
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize database
  useEffect(() => {
    const initDb = async () => {
      try {
        await getDb();
        setDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };
    
    initDb();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Save messages to database when they change
  useEffect(() => {
    const saveMessagesToDb = async () => {
      if (!dbInitialized || messages.length === 0) return;
      
      // Don't save messages while streaming is in progress
      if (status === 'streaming') return;
      
      console.log('Saving messages to database. Status:', status);
      
      try {
        // If no conversation exists yet, create one
        if (!currentConversationId) {
          // Use first few characters of the first user message as the name
          if (messages.length > 0 && messages[0].role === 'user' && messages[0].content.trim() !== '') {
            const firstUserMessage = messages[0].content;
            const truncatedContent = firstUserMessage.slice(0, 30) + (firstUserMessage.length > 30 ? '...' : '');
            setConversationName(truncatedContent);
            const id = await createConversation(truncatedContent);
            setCurrentConversationId(id);
            
            // Save all messages for this new conversation
            for (const message of messages) {
              await addMessage(id, message.content, message.role);
            }
            
            // Trigger sidebar reload
            sidebarEvents.emit('reload');
          }
        } else {
          // If conversation exists, just add the new message
          const lastMessage = messages[messages.length - 1];
          
          // Skip empty messages
          if (lastMessage.content.trim() === '') return;
          
          // Check if this message has already been saved (simple heuristic)
          const existingMessages = await getMessages(currentConversationId);
          const messageExists = existingMessages.some(
            m => m.content === lastMessage.content && m.sender === lastMessage.role
          );
          
          if (!messageExists) {
            await addMessage(currentConversationId, lastMessage.content, lastMessage.role);
            // Trigger sidebar reload
            sidebarEvents.emit('reload');
          }
        }
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    };
    
    saveMessagesToDb();
  }, [messages, currentConversationId, dbInitialized, status]);
  
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
      if (event.metaKey) {
        if (event.key === '/') {
          event.preventDefault();
          setModelsOpen(prev => !prev);
        } else if (event.key === 'n') {
          event.preventDefault();
          resetChat();
        }
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
    setCurrentConversationId(null);
    setConversationName("New Chat");
  };
  
  const handleSelectConversation = async (id: number) => {
    try {
      // Load conversation and its messages
      const conversation = await getConversation(id);
      if (!conversation) {
        console.error("Conversation not found");
        return;
      }
      
      const messages = await getMessages(id);
      
      // Update state
      setCurrentConversationId(id);
      setConversationName(conversation.name);
      
      // Map database messages to chat format
      const chatMessages = messages.map(message => ({
        role: message.sender as "user" | "assistant",
        content: message.content,
        id: message.id?.toString() || undefined
      }));
      
      // Create a new chat session with the loaded messages
      setChatKey(prev => prev + 1);
      // Wait for new chat to initialize before setting messages
      setTimeout(() => {
        setMessages(chatMessages as any);
      }, 100);
      
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };
  
  const isChatLoading = status === 'submitted' || status === 'streaming';
  
  // Create a new empty chat
  const handleNewChat = async () => {
    try {
      // Don't create conversation in database until first message is sent
      setCurrentConversationId(null);
      setConversationName(`New Chat ${new Date().toLocaleString()}`);
      setChatKey(prev => prev + 1);
      setMessages([]);
      
      // No need to trigger sidebar reload since no database change
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Add a function to handle forking a conversation
  const handleForkConversation = async (messageId: number) => {
    try {
      if (!currentConversationId) return;
      
      // Get the original conversation to get its name
      const originalConvo = await getConversation(currentConversationId);
      if (!originalConvo) return;
      
      // Create a forked name with timestamp
      const forkedName = `${originalConvo.name} (fork ${new Date().toLocaleTimeString()})`;
      
      // Create the fork
      const newId = await forkConversation(
        currentConversationId,
        messageId,
        forkedName
      );
      
      // Switch to the new conversation
      setCurrentConversationId(newId);
      setConversationName(forkedName);
      
      // Load the forked messages
      const messages = await getMessages(newId);
      const chatMessages = messages.map(message => ({
        role: message.sender as "user" | "assistant",
        content: message.content,
        id: message.id?.toString() || undefined
      }));
      
      // Reset the chat with forked messages
      setChatKey(prev => prev + 1);
      setTimeout(() => {
        setMessages(chatMessages as any);
      }, 100);
      
      // Trigger sidebar reload
      sidebarEvents.emit('reload');
    } catch (error) {
      console.error("Failed to fork conversation:", error);
    }
  };
  
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
      
      <AppSidebar 
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        currentConversationId={currentConversationId || undefined}
      />
      
      <main className="flex-1 flex flex-col h-screen">
        <div className={`flex-1 flex flex-col font-mono font-medium text-white px-2ch py-[var(--line-height)] ${showGrid ? 'show-grid' : ''} overflow-hidden`}>
          <div className="flex-1 overflow-y-auto">
            {error && <div className="text-red-500 p-2">Error: {error.message}</div>}
            <ChatMessageArea
              messages={messages}
              messagesEndRef={messagesEndRef}
              onForkMessage={handleForkConversation}
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
