import { useMemo, RefObject } from "react";
import { ChatMessageList } from "../ui/chat/chat-message-list";
import { ChatBubble, ChatBubbleMessage } from "../ui/chat/chat-bubble";

export interface Message {
  role: string;
  content: string;
  id?: string;
  charOffset?: number;
}

interface ChatMessageAreaProps {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement>;
  onForkMessage?: (messageId: number) => void;
}

export function ChatMessageArea({ messages, messagesEndRef, onForkMessage }: ChatMessageAreaProps) {
  const messagesWithOffset = useMemo(() => {
    return messages.map(message => {
      const charOffset = 0;
      return { ...message, charOffset };
    });
  }, [messages]);
  
  const handleFork = (message: Message) => {
    if (onForkMessage && message.id) {
      onForkMessage(parseInt(message.id));
    }
  };
  
  return (
    <div className="flex-1 overflow-hidden max-w-[80ch] mx-auto w-full" style={{ width: "calc(round(down, 100%, 1ch))" }}>
      <ChatMessageList ref={messagesEndRef}>
        {messagesWithOffset.map((message, index) => (
          <div key={index} className="relative group">
            <ChatBubble 
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
            
            {onForkMessage && message.id && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleFork(message)}
                  className="text-xs bg-gray-800 text-gray-200 px-2 py-1 rounded hover:bg-gray-700"
                  title="Fork from this message"
                >
                  Fork
                </button>
              </div>
            )}
          </div>
        ))}
      </ChatMessageList>
    </div>
  );
} 