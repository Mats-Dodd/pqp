import { useChat } from "./hooks/useChat";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import { ChatInput } from "./components/ui/chat/chat-input";
import { ChatBubble, ChatBubbleMessage } from "./components/ui/chat/chat-bubble";
import { Button } from "./components/ui/button";
import { useState, useMemo } from "react";

function App() {
  const [showGrid, setShowGrid] = useState(true);
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
          <div className="border-grid w-full flex">
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="▮"
              disabled={isLoading}
              className="font-mono flex-grow"
              style={{ lineHeight: 'var(--line-height)' }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              variant="outline"
              className="px-1ch py-0 h-auto border-0 border-l border-l-[var(--text-color)] border-solid hover:border-l-[var(--accent-color)] hover:text-[var(--accent-color)] transition-colors duration-200 disabled:opacity-50 font-mono rounded-none shadow-none text-xs"
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
