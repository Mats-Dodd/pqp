import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function customTauriFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  console.log('customTauriFetch called with URL: ', url);
  console.log('customTauriFetch options: ', init);

  if (!init || !init.body) {
    console.error('Missing options or body in customTauriFetch');
    throw new Error('Request options with body are required for customTauriFetch');
  }

  // We need to extract the body from the options and send it to Tauri
  const payload = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
  console.log('customTauriFetch payload (first 200 chars): ', payload.substring(0, 200));

  // Create a ReadableStream that will be populated with events from Tauri
  const stream = new ReadableStream({
    start(controller) {
      // Listen for chunks from the Rust backend
      const chunkListener = listen('anthropic-stream-chunk', (event) => {
        // Get the chunk data from the event payload
        const chunk = event.payload as string;
        
        // We're now getting Vercel AI SDK formatted chunks from Rust
        // Just pass them through directly
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunk));
      });

      // Listen for errors
      const errorListener = listen('anthropic-stream-error', (event) => {
        const errorMessage = event.payload as string;
        console.error('Stream error from Tauri backend:', errorMessage);
        controller.error(new Error(errorMessage));
      });

      // Listen for end of stream
      const endListener = listen('anthropic-stream-end', () => {
        console.log('Stream ended by Tauri backend');
        controller.close();
        
        // Clean up listeners
        chunkListener.then(unlisten => unlisten());
        errorListener.then(unlisten => unlisten());
        endListener.then(unlisten => unlisten());
      });

      // Start the stream in the Rust backend
      invoke('stream_api_request', { payload })
        .catch((error: unknown) => {
          console.error('Error invoking Tauri command:', error);
          controller.error(new Error(`Failed to invoke Tauri command: ${error}`));
        });
    }
  });

  // Return a Response object
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'x-vercel-ai-data-stream': 'v1' // Important: Indicate this is a Vercel AI data stream
    }
  });
} 