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

  return (
    <main className="container mx-auto p-4 h-screen flex flex-col">
      <h1 className="text-2xl font-bold text-center mb-4">Chat with Claude</h1>
      
      <div className="flex-1 flex flex-col overflow-hidden mb-4 border border-gray-200 rounded-lg shadow-sm">
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

      <div className="flex space-x-2">
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </main>
  );
}

export default App;
