import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function customTauriFetch(
  _url: string | URL | Request, // URL might be ignored or used as a hint
  options?: RequestInit
): Promise<Response> {
  console.log('customTauriFetch called with URL:', typeof _url === 'string' ? _url : _url.toString());
  console.log('customTauriFetch options:', options);
  
  if (!options || !options.body) {
    console.error('Missing options or body in customTauriFetch');
    throw new Error('Request options with body are required for customTauriFetch');
  }

  // The body is expected to be a stringified JSON payload for the Anthropic API
  const payload = typeof options.body === 'string' ? options.body : await (options.body as BodyInit).toString();
  console.log('customTauriFetch payload (first 200 chars):', payload.substring(0, 200));

  let streamController: ReadableStreamController<Uint8Array>;
  let unlistenChunk: (() => void) | null = null;
  let unlistenError: (() => void) | null = null;
  let unlistenEnd: (() => void) | null = null;

  const unlistenAll = () => {
    unlistenChunk?.();
    unlistenError?.();
    unlistenEnd?.();
  };

  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamController = controller;

      try {
        // Setup listeners *before* invoking the command
        unlistenChunk = await listen<string>('anthropic-stream-chunk', (event) => {
          // Assume event.payload is the string chunk from Rust
          streamController.enqueue(new TextEncoder().encode(event.payload));
        });

        unlistenError = await listen<string>('anthropic-stream-error', (event) => {
          console.error('Stream error from backend:', event.payload);
          streamController.error(new Error(event.payload));
          unlistenAll();
        });

        unlistenEnd = await listen<void>('anthropic-stream-end', () => {
          streamController.close();
          unlistenAll();
        });

        // Invoke the Tauri command that starts the backend stream
        await invoke('stream_api_request', { payload });
        // Note: If invoke itself errors immediately (e.g., command not found),
        // the listeners might not be properly cleaned up if the error isn't caught here.

      } catch (error) {
        console.error('Error invoking stream_api_request or setting up listeners:', error);
        // Ensure the stream is errored if setup fails
        streamController.error(error instanceof Error ? error : new Error(String(error)));
        unlistenAll(); // Clean up listeners if invocation fails
      }
    },
    cancel(reason) {
      console.log('Stream cancelled:', reason);
      // Optional: Send a cancellation signal to the backend if needed
      unlistenAll();
    },
  });

  // Return a Response object wrapping the readable stream
  return new Response(readableStream, {
    status: 200, // Assuming success until proven otherwise by stream events
    headers: {
      // Vercel AI SDK might expect 'text/event-stream' or similar, adjust if needed
      'Content-Type': 'application/octet-stream', // Or perhaps text/plain?
    },
  });
} 