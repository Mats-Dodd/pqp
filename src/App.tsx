import { useChat } from "./hooks/useChat";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import { ChatInput } from "./components/ui/chat/chat-input";
import { ChatBubble, ChatBubbleMessage } from "./components/ui/chat/chat-bubble";
import { Button } from "./components/ui/button";

function App() {
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

  // Get current timestamp in the format YYYY.MM.DD HH:MM UTC
  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, ' UTC');
  
  return (
    <main className="h-screen bg-black text-white px-6 ch py-6 show-grid flex flex-col">
      <header className="flex-shrink-0 max-w-[80ch] mx-auto w-full pb-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-baseline">
            <h1 className="text-xl font-sans leading-normal tracking-tight">Nilla</h1>
            <div className="font-mono text-xs tabular-nums">v0.0.1</div>
          </div>
          <div className="font-mono text-xs flex justify-between items-baseline">
            <div>Yours to discover</div>
            <div className="tabular-nums">{timestamp}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden max-w-[80ch] mx-auto w-full pt-6">
        <ChatMessageList ref={messagesEndRef}>
          {messages.map((message, index) => (
            <ChatBubble 
              key={index} 
              variant={message.role === "user" ? "sent" : "received"}
            >
              <ChatBubbleMessage>{message.content}</ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </div>

      <div className="flex-shrink-0 max-w-[80ch] mx-auto w-full pt-3">
        <div className="relative">
          <div className="border border-grid w-full">
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="▮"
              disabled={isLoading}
            />
          </div>
          <div className="absolute bottom-2 right-2 font-mono">
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              variant="outline"
              className="px-1.5 ch py-0.5 border border-grid hover:border-accent-blue hover:text-accent-blue transition-colors duration-200 disabled:opacity-50 font-mono rounded-none shadow-none text-xs"
            >
              [Analyze]
            </Button>
          </div>
        </div>
        
        <footer className="font-mono text-xs flex justify-between mt-3">
          <div>Status: {isLoading ? 'Processing' : 'Online'}</div>
        </footer>
      </div>
    </main>
  );
}

export default App;
