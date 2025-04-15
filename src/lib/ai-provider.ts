import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { customTauriFetch } from './custom-fetch';

/**
 * Creates an Anthropic provider instance configured to route requests
 * through our custom Tauri fetch function (which invokes the Rust backend).
 * 
 * API keys and base URLs are handled by the Rust backend, so they are not
 * configured here.
 */
export const anthropicProvider = createAnthropic({
  fetch: customTauriFetch,
});

// Default model to use
export const defaultModel = 'claude-3-haiku-20240307';

/**
 * Simulates a server API route handler for /api/chat
 * This is designed to be used with monkeyPatchFetch to intercept fetch requests
 * Processes AI chat messages using the Anthropic provider
 */
export async function handleChatRequest(request: Request): Promise<Response> {
  try {
    console.log('handleChatRequest: Processing request', request.method);
    
    // Parse the incoming request body - this is coming from useChat
    const body = await request.json();
    console.log('handleChatRequest: Request body parsed', body);
    
    // Extract messages from the body
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array is required');
    }
    
    console.log('handleChatRequest: Messages extracted', messages);
    
    // Transform messages to a format compatible with Anthropic API
    // - Remove 'parts' field which causes the "Extra inputs are not permitted" error
    // - Keep 'role' and 'content' only
    const transformedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log('handleChatRequest: Transformed messages', transformedMessages);
    
    // Create a raw request directly to the Anthropic API but routed through our custom fetch
    const anthropicPayload = JSON.stringify({
      model: defaultModel,
      messages: transformedMessages,
      stream: true,
      max_tokens: 1000
    });
    
    console.log('handleChatRequest: Prepared direct Anthropic payload');
    
    // Call our customTauriFetch with a payload formatted exactly as the Rust backend expects
    return customTauriFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: anthropicPayload,
    });
  } catch (error) {
    console.error('Error processing chat request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Example of how to use it (similar to App.tsx):
// import { anthropicProvider } from './ai-provider';
// const model = anthropicProvider('claude-3-haiku-20240307'); 