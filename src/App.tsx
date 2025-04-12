import { useChat } from "./hooks/useChat";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import { ChatInput } from "./components/ui/chat/chat-input";
import { ChatBubble, ChatBubbleMessage } from "./components/ui/chat/chat-bubble";
import { Button } from "./components/ui/button";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { invoke } from '@tauri-apps/api/core';

function App() {
  const [showGrid, setShowGrid] = useState(true);
  const [inputHeight, setInputHeight] = useState(4); // Increased default height from 1 to 3
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(0);
  const [modelsOpen, setModelsOpen] = useState(false); // Add state for dropdown menu
  const [services, setServices] = useState<string[]>([]);
  const [mcpOpen, setMcpOpen] = useState(false);
  
  const {
    messages,
    input,
    isLoading,
    setInput,
    handleSendMessage,
    messagesEndRef,
  } = useChat();

  // Fetch services when component mounts or when MCP dropdown opens
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesList = await invoke<string[]>('get_services');
        console.log(servicesList);
        setServices(servicesList);
      } catch (error) {
        console.error('Failed to fetch services:', error);
        // Set empty array or some default values if fetch fails
        setServices([]);
      }
    };

    if (mcpOpen) {
      fetchServices();
    }
  }, [mcpOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const toggleGrid = () => setShowGrid(prev => !prev);
  
  // Calculate grid alignment offsets for each message
  const messagesWithOffset = useMemo(() => {
    return messages.map(message => {
      // For perfect grid alignment, calculate a simple offset
      // that ensures text starts precisely at a grid line
      
      // Always use a consistent offset of 0 to align with grid lines
      // The component's padding will handle the correct positioning
      const charOffset = 0;
      
      return { ...message, charOffset };
    });
  }, [messages]);
  
  // Drag resize handlers for the chat input
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartYRef.current = e.clientY;
    startHeightRef.current = inputHeight;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  const handleDragMove = (e: MouseEvent) => {
    const lineHeightPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--line-height'));
    const deltaY = dragStartYRef.current - e.clientY;
    const deltaLines = Math.round(deltaY / lineHeightPx);
    
    // Calculate new height ensuring it's at least 1 line and max 10 lines
    const newHeight = Math.max(1, Math.min(10, startHeightRef.current + deltaLines));
    setInputHeight(newHeight);
  };
  
  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };
  
  return (
    <main className={`h-screen font-mono font-medium bg-black text-white px-2ch py-[var(--line-height)] ${showGrid ? 'show-grid' : ''} flex flex-col`}>
      <div className="flex-1 overflow-hidden max-w-[80ch] mx-auto w-full" style={{ width: "calc(round(down, 100%, 1ch))" }}>
        <ChatMessageList ref={messagesEndRef}>
          {messagesWithOffset.map((message, index) => (
            <ChatBubble 
              key={index} 
              variant={message.role === "user" ? "sent" : "received"}
            >
              <ChatBubbleMessage 
                className="whitespace-pre-wrap break-words"
                style={{ 
                  lineHeight: "var(--line-height)",
                }}
                charOffset={message.charOffset}
              >
                {message.content}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </div>

      <div className="flex-shrink-0 max-w-[80ch] mx-auto w-full mt-[var(--line-height)]" style={{ width: "calc(round(down, 100%, 1ch))" }}>
        <div className="relative">
          {/* Invisible drag handle */}
          <div 
            className="absolute top-0 left-0 w-full h-[var(--line-height)] -translate-y-full cursor-ns-resize"
            onMouseDown={handleDragStart}
          />
          
          <div className="border-2 border-[var(--text-color)] w-full flex overflow-hidden relative" style={{ 
            height: `calc(var(--line-height) * ${inputHeight})` 
          }}>
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="▮"
              disabled={isLoading}
              className="font-mono flex-grow border-0 px-2ch py-0 focus:ring-0 focus:outline-none bg-transparent resize-none"
              style={{ 
                lineHeight: 'var(--line-height)',
                height: `calc(var(--line-height) * ${inputHeight})`,
                width: "100%"
              }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              variant="outline"
              className="absolute bottom-0 right-0 px-2ch py-0 h-[var(--line-height)] border-0 hover:text-[var(--accent-color)] transition-colors duration-200 disabled:opacity-50 font-mono rounded-none shadow-none text-xs text-[#D6A97A]"
              style={{ 
                width: "11ch"
              }}
            >
              [Find out]
            </Button>
          </div>
        </div>
        
        <footer className="font-mono text-xs flex justify-between mt-[var(--line-height)]">
          <div>Status: {isLoading ? 'Processing' : 'Online'}</div>
          <div className="flex items-center gap-4">
            <DropdownMenu open={modelsOpen} onOpenChange={setModelsOpen}>
              <DropdownMenuTrigger 
                className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
              >
                {'<Models>'}
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="font-mono text-xs bg-black border-2 border-[var(--text-color)] rounded-none shadow-lg p-0 z-50"
                style={{ lineHeight: 'var(--line-height)' }}
              >
                <DropdownMenuItem className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer">
                  Claude 3 Opus
                </DropdownMenuItem>
                <DropdownMenuItem className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer">
                  Claude 3 Sonnet
                </DropdownMenuItem>
                <DropdownMenuItem className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer">
                  Claude 3 Haiku
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu open={mcpOpen} onOpenChange={setMcpOpen}>
              <DropdownMenuTrigger 
                className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
              >
                {'<MCP>'}
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="font-mono text-xs bg-black border-2 border-[var(--text-color)] rounded-none shadow-lg p-0 z-50"
                style={{ lineHeight: 'var(--line-height)' }}
              >
                {services.length > 0 ? (
                  services.map((service, index) => (
                    <DropdownMenuItem 
                      key={index}
                      className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer"
                    >
                      {service}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="px-2ch py-0 h-[var(--line-height)] text-white cursor-default">
                    No services found
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={toggleGrid} 
              variant="ghost"
              size="sm"
              className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs"
            >
              [Debug]
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default App;
