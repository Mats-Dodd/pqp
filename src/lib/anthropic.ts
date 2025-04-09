import { Anthropic } from "@anthropic-ai/sdk";
import { Message } from "../types/chat";

// Initialize Anthropic client
const initAnthropicClient = () => {
  const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return new Anthropic({
    apiKey: anthropicApiKey,
    dangerouslyAllowBrowser: true,
  });
};

// Create singleton instance
const anthropic = initAnthropicClient();

// Send message to Anthropic API
export const sendMessageToAnthropic = async (messages: Message[]) => {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return {
      role: "assistant" as const,
      content:
        response.content[0].type === "text"
          ? response.content[0].text
          : "Error: Received non-text response",
    };
  } catch (error) {
    console.error("Error sending message to Anthropic:", error);
    return {
      role: "assistant" as const,
      content: "Sorry, there was an error processing your request. Please try again.",
    };
  }
}; 