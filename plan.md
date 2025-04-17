# Refactoring Plan: Vercel AI SDK Integration via Rust Proxy (Tauri + Vite + React)

This plan outlines integrating the Vercel AI SDK (`@ai-sdk/react`) into a Tauri/Vite/React application by proxying Anthropic API requests through the Rust backend to handle API keys securely and bypass CORS, while maintaining streaming functionality.

## 1. Dependencies

### Frontend (using pnpm)
```bash
pnpm add @ai-sdk/react ai @ai-sdk/anthropic @tauri-apps/api
```
*   `@ai-sdk/react`: Provides the `useChat` hook.
*   `ai`: Core Vercel AI SDK library for stream handling.
*   `@ai-sdk/anthropic`: (Used by `useChat` internally, but API calls are proxied).
*   `@tauri-apps/api`: For `invoke` and `listen` to communicate with the Rust backend.

### Backend (Rust - in `src-tauri/Cargo.toml`)
Ensure these dependencies are present:
```toml
[dependencies]
tauri = { version = "...", features = ["api-all"] } # Ensure 'api-all' or necessary event features are enabled
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
futures-util = "0.3" # For stream processing
dotenv = "0.15" # To load API key from .env
```

tokio and reqwest are already bundled

## 2. Tauri Rust Backend Proxy Setup

### Create Proxy Command Module
*   Create a new file: `src-tauri/src/commands/proxy_commands.rs`.
*   Declare the module in `src-tauri/src/commands/mod.rs`.

### Implement `stream_api_request` Command
*   In `proxy_commands.rs`, define structs for request/response if needed, although primary communication will be via events for streaming.
*   Define the command: `#[tauri::command] async fn stream_api_request(window: tauri::Window, payload: String) -> Result<(), String>`.
    *   **Parse Payload:** Deserialize the incoming `payload` (JSON string) containing the Anthropic request body (messages, model, max_tokens, stream=true).
    *   **Load API Key:** Use `dotenv::dotenv().ok();` and `std::env::var("ANTHROPIC_API_KEY")` to get the key securely. Handle missing key errors.
    *   **Make Request:** Use `reqwest::Client` to POST to `https://api.anthropic.com/v1/messages`.
        *   Set necessary headers: `Content-Type: application/json`, `anthropic-version`, and crucially `Authorization: Bearer YOUR_API_KEY`.
        *   Send the parsed payload as the JSON body, ensuring `stream: true` is set.
    *   **Process Stream:**
        *   Get the response stream using `response.bytes_stream()`.
        *   Use `futures_util::StreamExt::while_next` or a similar loop to process chunks.
        *   For each chunk (`bytes::Bytes`), convert it to a `String` or relevant format.
        *   **Emit Events:** Use `window.emit("anthropic-stream-chunk", &chunk_string)` to send data to the frontend. Handle potential UTF-8 errors if converting bytes.
        *   **Handle End/Error:** When the stream ends, emit `window.emit("anthropic-stream-end", ())`. If an error occurs during the request or stream processing, emit `window.emit("anthropic-stream-error", error_message_string)` and return `Err`.
    *   Return `Ok(())` on successful stream completion.

### Register Command
*   In `src-tauri/src/lib.rs` (or `main.rs`), add `stream_api_request` to the `tauri::generate_handler![]` macro.

### Capabilities
*   Review `src-tauri/capabilities/default.json`. Direct HTTP access to Anthropic might not be needed in `permissions` if all calls go through the proxy command. Ensure basic Tauri API permissions are present.

### Environment Variables
*   Create a `.env` file in the `src-tauri` directory (or project root, depending on where you run `cargo`) containing `ANTHROPIC_API_KEY=your_actual_key`. Ensure this file is in your `.gitignore`.

## 3. Frontend Custom Fetch Implementation

*   Create a utility function (e.g., in `src/lib/custom-fetch.ts`) named `customTauriFetch`.
*   This function should mimic the standard `fetch` signature: `async (url: string | URL | Request, options?: RequestInit): Promise<Response>`.
*   **Inside `customTauriFetch`:**
    *   **Extract Request Details:** Get method, headers, and body from the `options`. The `url` might be a placeholder passed from `useChat` (`/api/chat/proxy`). The important part is the `options.body`, which should contain the JSON payload for Anthropic.
    *   **Setup Stream:** Create a `ReadableStream` with a controller (`let streamController; const readableStream = new ReadableStream({ start(controller) { streamController = controller; } });`).
    *   **Setup Listeners:** Use Tauri's `listen` from `@tauri-apps/api/event` to subscribe to the events emitted by the Rust backend:
        *   `listen<string>('anthropic-stream-chunk', (event) => { streamController.enqueue(new TextEncoder().encode(event.payload)); });` (Encode string chunk back to `Uint8Array`).
        *   `listen<string>('anthropic-stream-error', (event) => { streamController.error(new Error(event.payload)); unlistenAll(); });`
        *   `listen<void>('anthropic-stream-end', () => { streamController.close(); unlistenAll(); });`
        *   Store the `unlisten` functions returned by `listen` to clean up later (`const unlistenChunk = await listen(...)`, etc., then `unlistenAll = () => { unlistenChunk(); ... }`).
    *   **Invoke Command:** Use `invoke` from `@tauri-apps/api/tauri` to call the Rust command: `invoke('stream_api_request', { payload: options.body })`. Handle potential errors from the initial `invoke` call itself (e.g., if the command fails before streaming starts) by calling `streamController.error(...)` and `unlistenAll()`.
    *   **Return Response:** Return `new Response(readableStream, { status: 200, headers: { 'Content-Type': 'application/octet-stream' /* Or appropriate type */ } });`. The Vercel SDK expects a stream, so this response structure should work.

## 4. Frontend `useChat` Integration

*   In your main chat component (e.g., `src/App.tsx`):
    *   Import `useChat` from `@ai-sdk/react`.
    *   Import your `customTauriFetch` function.
    *   Initialize the hook:
        ```typescript
        const { messages, input, handleInputChange, handleSubmit, isLoading, error, ... } = useChat({
          // The 'api' path is less critical now as fetch handles the destination,
          // but provide a placeholder if required by the hook.
          api: '/api/chat/proxy',
          // Provide the custom fetch implementation:
          fetch: customTauriFetch,
          // Specify initial model if desired (though Rust command might override)
          // initialMessages: [...],
          // body: { /* Add any extra data needed by Rust besides messages */ }
        });
        ```
    *   **State Mapping:** Connect the state and handlers from `useChat` to your UI components (`ChatMessageArea`, `ResizableChatInput`, etc.) as planned previously. Ensure your message display component handles the `Message` format from `ai` package.
    *   Handle UI updates based on `isLoading`, `error`, and the streaming `messages`.

## 5. Cleanup

*   Remove any old client-side Anthropic SDK (`@anthropic-ai/sdk`) usage or direct API call logic (e.g., `src/lib/anthropic.ts`).
*   Remove the old custom `useChat` hook file if it existed.
*   Remove `VITE_ANTHROPIC_API_KEY` usage from the frontend and `.env` files at the project root (it's only needed in `src-tauri/.env`).
*   Remove `tauri-plugin-http` if it was installed and is no longer needed.

This plan provides a detailed roadmap for integrating the Vercel AI SDK with streaming via a secure Rust proxy in your Tauri application.

    Lets make sure to use antrhopic for now and use the initial model
    