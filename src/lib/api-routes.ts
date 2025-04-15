import { handleChatRequest } from './ai-provider';

// Store the original fetch
const originalFetch = window.fetch;

/**
 * Route mapping table for API endpoints
 * Add new routes here as needed
 */
const API_ROUTES: Record<string, (req: Request) => Promise<Response>> = {
  '/api/chat': handleChatRequest,
};

/**
 * Monkey-patches the global fetch function to intercept requests to our API endpoints
 * This allows us to simulate server-side API routes in a client-side only app
 */
export function setupApiRoutes() {
  // Only patch once
  if (window.fetch !== originalFetch) return;
  
  // Replace the global fetch with our version
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Convert input to a string URL
    const url = input instanceof Request ? new URL(input.url) : new URL(input.toString(), window.location.origin);
    const path = url.pathname;
    
    // Check if this is one of our API routes
    const handler = API_ROUTES[path];
    
    if (handler) {
      console.log(`Intercepting request to API route: ${path}`);
      // Create a proper Request object
      const request = input instanceof Request 
        ? input 
        : new Request(input.toString(), init);
        
      // Pass to our handler
      return handler(request);
    }
    
    // Not our route, pass through to original fetch
    return originalFetch(input, init);
  };
  
  console.log('API routes setup complete - intercepting requests to:', Object.keys(API_ROUTES));
} 