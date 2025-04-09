import { useChat } from "./hooks/useChat";
import { ChatMessageList } from "./components/ui/chat/chat-message-list";
import { ChatInput } from "./components/ui/chat/chat-input";
import { ChatBubble, ChatBubbleMessage } from "./components/ui/chat/chat-bubble";

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
    <main className="min-h-screen bg-black text-white p-4 ch show-grid">
      <header className="flex justify-between items-center mb-6 border border-grid p-2 ch">
        <h1 className="text-xl font-sans">AI Chat App</h1>
        <div className="font-mono text-xs">v0.1.0 | {timestamp}</div>
      </header>
      
      <div className="grid grid-cols-12-mono gap-2 ch mb-6 border border-grid">
        <div className="col-span-12 p-2 ch overflow-hidden">
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
      </div>

      <div className="grid grid-cols-12-mono gap-2 ch">
        <div className="col-span-10 border border-grid">
          <ChatInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="▮ Input Query"
            disabled={isLoading}
          />
        </div>
        <div className="col-span-2 font-mono">
          <button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
            className="w-full h-full px-2 ch py-1 border border-grid hover:border-accent-blue hover:text-accent-blue transition-colors duration-200 disabled:opacity-50 font-mono"
          >
            [ Analyze ]
          </button>
        </div>
      </div>
      
      <footer className="mt-6 font-mono text-xs flex justify-between">
        <div>{timestamp}</div>
        <div>Status: {isLoading ? 'Processing' : 'Online'}</div>
      </footer>
    </main>
  );
}

export default App;
