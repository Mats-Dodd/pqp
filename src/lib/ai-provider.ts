import { createAnthropic } from '@ai-sdk/anthropic';
import { customTauriFetch } from './custom-fetch';


export const anthropicProvider = createAnthropic({
  fetch: customTauriFetch as typeof fetch,
});

export const defaultModel = 'claude-3-haiku-20240307';

export async function handleChatRequest(request: Request): Promise<Response> {
  try {
    console.log('handleChatRequest: Processing request', request.method);
    
    const body = await request.json();
    console.log('handleChatRequest: Request body parsed', body);
    
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request: messages array is required');
    }
    
    console.log('handleChatRequest: Messages extracted', messages);
    
    const transformedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log('handleChatRequest: Transformed messages', transformedMessages);
    
    const anthropicPayload = JSON.stringify({
      model: defaultModel,
      messages: transformedMessages,
      stream: true,
      max_tokens: 1000
    });
    
    console.log('handleChatRequest: Prepared direct Anthropic payload');
    
    const response = await customTauriFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: anthropicPayload,
    });
    
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain', 
        'Transfer-Encoding': 'chunked',
        'x-vercel-ai-data-stream': 'v1'
      }
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
