import { useMemo, RefObject } from "react";
import { ChatMessageList } from "../ui/chat/chat-message-list";
import { ChatBubble, ChatBubbleMessage } from "../ui/chat/chat-bubble";

export interface Message {
  role: string;
  content: string;
  charOffset?: number;
}

interface ChatMessageAreaProps {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatMessageArea({ messages, messagesEndRef }: ChatMessageAreaProps) {
  const messagesWithOffset = useMemo(() => {
    return messages.map(message => {

      const charOffset = 0;
      
      return { ...message, charOffset };
    });
  }, [messages]);
  
  return (
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
  );
} 