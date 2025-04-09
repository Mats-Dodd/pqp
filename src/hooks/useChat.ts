import { useState, useRef, useEffect } from "react";
import { Message, ChatState } from "../types/chat";
import { sendMessageToAnthropic } from "../lib/anthropic";

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    input: "",
    isLoading: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const setInput = (input: string) => {
    setState((prev) => ({ ...prev, input }));
  };

  const handleSendMessage = async () => {
    if (!state.input.trim() || state.isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: state.input,
    };

    // Update state with user message and reset input
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      input: "",
      isLoading: true,
    }));

    // Send message to API
    const assistantMessage = await sendMessageToAnthropic([
      ...state.messages,
      userMessage,
    ]);

    // Update state with assistant response
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      isLoading: false,
    }));
  };

  return {
    messages: state.messages,
    input: state.input,
    isLoading: state.isLoading,
    setInput,
    handleSendMessage,
    messagesEndRef,
  };
}; 