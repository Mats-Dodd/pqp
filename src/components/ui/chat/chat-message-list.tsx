import * as React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/components/ui/chat/hooks/useAutoScroll";

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
  smooth?: boolean;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ className, children, smooth = false, ...props }, _ref) => {
    const {
      scrollRef,
      isAtBottom,
      autoScrollEnabled,
      scrollToBottom,
      disableAutoScroll,
    } = useAutoScroll({
      smooth,
      content: children,
    });

    return (
      <div className="relative w-full h-full">
        <div
          className={`flex flex-col w-full h-full overflow-y-auto font-mono scrollbar-hide ${className}`}
          ref={scrollRef}
          onWheel={disableAutoScroll}
          onTouchMove={disableAutoScroll}
          {...props}
        >
          <div className="flex flex-col gap-[var(--line-height)]">
            {children}
          </div>
        </div>

        {!isAtBottom && (
          <div className="absolute bottom-[var(--line-height)] right-0 flex justify-end w-full">
            <Button
              onClick={() => {
                scrollToBottom();
              }}
              size="icon"
              variant="outline"
              className="border-grid hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] rounded-none mr-2ch"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";

export { ChatMessageList };
