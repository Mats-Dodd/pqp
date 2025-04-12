import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>{}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, ...props }, ref) => (
    <Textarea
      autoComplete="off"
      ref={ref}
      name="message"
      className={cn(
        "w-full px-2ch py-[calc(var(--line-height)/2)] bg-black text-white font-mono border-0",
        "placeholder:text-grid focus:outline-none resize-none",
        "caret-[var(--accent-color)] focus-visible:ring-0",
        className,
      )}
      style={{ lineHeight: "var(--line-height)" }}
      {...props}
    />
  ),
);
ChatInput.displayName = "ChatInput";

export { ChatInput };
