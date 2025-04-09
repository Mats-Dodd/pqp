// Define chat-related types
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatState {
  messages: Message[];
  input: string;
  isLoading: boolean;
} 