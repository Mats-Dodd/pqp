import { ChatInput } from "../ui/chat/chat-input";
import { Button } from "../ui/button";
import { useResizableInput } from "../../hooks/useResizableInput";

interface ResizableChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  handleSendMessage: () => void;
}

export function ResizableChatInput({
  input,
  setInput,
  isLoading,
  handleSendMessage
}: ResizableChatInputProps) {
  const { inputHeight, handleDragStart } = useResizableInput();
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="relative">
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
  );
} 