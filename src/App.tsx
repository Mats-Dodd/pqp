import { useChat } from "./hooks/useChat";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import { ChatInput } from "./components/ui/chat/chat-input";
import { ChatBubble, ChatBubbleMessage } from "./components/ui/chat/chat-bubble";
import { Button } from "./components/ui/button";
import { useState, useMemo, useRef } from "react";

function App() {
  const [showGrid, setShowGrid] = useState(true);
  const [inputHeight, setInputHeight] = useState(1); // Height in line-height units
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(0);
  
  const {
    messages,
    input,
    isLoading,
    setInput,
    handleSendMessage,
    messagesEndRef,
  } = useChat();

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
          
          <div className="border-grid w-full flex">
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="▮"
              disabled={isLoading}
              className="font-mono flex-grow"
              style={{ 
                lineHeight: 'var(--line-height)',
                height: `calc(var(--line-height) * ${inputHeight})` 
              }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              variant="outline"
              className="px-1ch py-0 h-auto border-0 border-l border-l-[var(--text-color)] border-solid hover:border-l-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors duration-200 disabled:opacity-50 font-mono rounded-none shadow-none text-xs"
              style={{ height: `calc(var(--line-height) * ${inputHeight})` }}
            >
              [Find out]
            </Button>
          </div>
        </div>
        
        <footer className="font-mono text-xs flex justify-between mt-[var(--line-height)]">
          <div>Status: {isLoading ? 'Processing' : 'Online'}</div>
          <Button 
            onClick={toggleGrid} 
            variant="ghost"
            size="sm"
            className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs"
          >
            [Debug]
          </Button>
        </footer>
      </div>
    </main>
  );
}

export default App;
