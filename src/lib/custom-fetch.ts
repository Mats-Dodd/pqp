import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function customTauriFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  console.log('FE: customTauriFetch called');
  console.log('FE: customTauriFetch options: ', init);

  if (!init || !init.body) {
    console.error('FE: Missing options or body in customTauriFetch');
    throw new Error('Request options with body are required for customTauriFetch');
  }

  let provider: string;
  let apiPayload: string;

  try {
    const parsedBody = JSON.parse(init.body as string);
    provider = parsedBody.provider;
    apiPayload = parsedBody.payload;
    if (!provider || !apiPayload) {
        throw new Error('Body must contain provider and payload');
    }
    console.log(`FE: customTauriFetch: Provider: ${provider}`);
    console.log('FE: customTauriFetch: API Payload (first 200 chars): ', apiPayload.substring(0, 200));

  } catch (e) {
      console.error('FE: Failed to parse body or extract provider/payload:', e);
      throw new Error('Invalid body structure for customTauriFetch');
  }

  const stream = new ReadableStream({
    start(controller) {
      console.log('FE: ReadableStream started. Setting up listeners...');
      const chunkListener = listen('ai-stream-chunk', (event) => {
        const chunk = event.payload as string;
        console.log('FE: Raw Chunk Received from Rust:', JSON.stringify(chunk));
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunk));
      });

      const errorListener = listen('ai-stream-error', (event) => {
        const errorMessage = event.payload as string;
        console.error('FE: Stream Error Received from Rust:', errorMessage);
        controller.error(new Error(errorMessage));
      });

      const endListener = listen('ai-stream-end', () => {
        console.log('FE: Stream End Received from Rust.');
        controller.close();

        chunkListener.then(unlisten => { console.log("FE: Unlistening from ai-stream-chunk"); unlisten(); });
        errorListener.then(unlisten => { console.log("FE: Unlistening from ai-stream-error"); unlisten(); });
        endListener.then(unlisten => { console.log("FE: Unlistening from ai-stream-end"); unlisten(); });
      });

      Promise.all([chunkListener, errorListener, endListener]).then(() => {
        console.log('FE: Listeners ready. Invoking Rust command stream_api_request...');
        invoke('stream_api_request', { provider: provider, payload: apiPayload })
          .then(() => {
            console.log('FE: Rust command stream_api_request invoked successfully.');
          })
          .catch((error: unknown) => {
            console.error('FE: Error invoking Rust command stream_api_request:', error);
            chunkListener.then(unlisten => unlisten());
            errorListener.then(unlisten => unlisten());
            endListener.then(unlisten => unlisten());
            controller.error(new Error(`Failed to invoke Tauri command: ${error}`));
          });
      }).catch(error => {
        console.error("FE: Failed to set up listeners:", error);
        controller.error(new Error(`Failed to set up listeners: ${error}`));
      });

    },
    cancel(reason) {
      console.log("FE: ReadableStream cancelled. Reason:", reason);
    }
  });

  console.log('FE: Returning Response object with ReadableStream.');
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
      'X-Vercel-AI-Data-Stream': 'v1'
    }
  });
} 