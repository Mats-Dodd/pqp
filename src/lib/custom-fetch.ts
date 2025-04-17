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

  const payload = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
  console.log('customTauriFetch payload (first 200 chars): ', payload.substring(0, 200));

  const stream = new ReadableStream({
    start(controller) {
      const chunkListener = listen('anthropic-stream-chunk', (event) => {
        const chunk = event.payload as string;
        
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunk));
      });

      const errorListener = listen('anthropic-stream-error', (event) => {
        const errorMessage = event.payload as string;
        console.error('Stream error from Tauri backend:', errorMessage);
        controller.error(new Error(errorMessage));
      });

      const endListener = listen('anthropic-stream-end', () => {
        console.log('Stream ended by Tauri backend');
        controller.close();
        
        chunkListener.then(unlisten => unlisten());
        errorListener.then(unlisten => unlisten());
        endListener.then(unlisten => unlisten());
      });

      invoke('stream_api_request', { payload })
        .catch((error: unknown) => {
          console.error('Error invoking Tauri command:', error);
          controller.error(new Error(`Failed to invoke Tauri command: ${error}`));
        });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'x-vercel-ai-data-stream': 'v1'
    }
  });
} 