import { handleChatRequest } from './ai-provider';

const originalFetch = window.fetch;

const API_ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  '/api/chat': handleChatRequest,
};

export function setupApiRoutes() {
  if (window.fetch !== originalFetch) return;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = input instanceof Request ? new URL(input.url) : new URL(input.toString(), window.location.origin);
    const path = url.pathname;
    
    const handler = API_ROUTES[path];
    
    if (handler) {
      console.log(`Intercepting request to API route: ${path}`);
      const request = input instanceof Request 
        ? input 
        : new Request(input.toString(), init);
        
      return handler(request);
    }
    
    return originalFetch(input, init);
  };
  
  console.log('API routes setup complete - intercepting requests to:', Object.keys(API_ROUTES));
} 