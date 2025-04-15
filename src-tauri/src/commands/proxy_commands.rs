use serde::Deserialize;
use tauri::{Window, Emitter};
use futures_util::StreamExt;
use std::env;
use dotenv::dotenv;
use tauri_plugin_http::reqwest;

#[derive(Deserialize)]
struct AnthropicRequestPayload {
    // Define fields expected from the frontend payload if necessary
    // For now, assume the payload is the direct body for Anthropic
    // We might need to refine this based on what useChat actually sends.
    #[serde(flatten)]
    anthropic_data: serde_json::Value,
}

#[tauri::command]
pub async fn stream_api_request(window: Window, payload: String) -> Result<(), String> {
    dotenv().ok(); // Load .env file
    println!("Attempting to load ANTHROPIC_API_KEY from .env"); // Added log

    let api_key_result = env::var("ANTHROPIC_API_KEY");

    let api_key = match api_key_result {
        Ok(key) => {
            println!("ANTHROPIC_API_KEY loaded successfully."); // Added log
            // Avoid logging the actual key for security:
            // println!("Loaded key (partial): {}...", &key[..std::cmp::min(key.len(), 5)]);
            key
        }
        Err(e) => {
            let error_msg = format!("Failed to load ANTHROPIC_API_KEY: {}", e);
            println!("{}", error_msg); // Added log
            // Emit error back to frontend if key not found
            window.emit("anthropic-stream-error", &error_msg).map_err(|e_emit| format!("Failed to emit API key error event: {}", e_emit))?;
            return Err(error_msg);
        }
    };

    // --- TEMPORARY LOGGING --- 
    // Log redacted key just before use to be 100% sure
    let key_len = api_key.len();
    let redacted_key = if key_len > 10 {
        format!("{}...{}", &api_key[..5], &api_key[key_len-5..])
    } else {
        "Key too short to redact safely".to_string()
    };
    println!("Using API Key (redacted): {}", redacted_key);
    // --- END TEMPORARY LOGGING ---

    println!("hello from rust");

    // Deserialize the payload received from the frontend
    // For now, let's assume the payload string is the direct JSON body needed by Anthropic
    // This might need adjustment if useChat wraps it.
    // let request_payload: AnthropicRequestPayload = serde_json::from_str(&payload)
    //     .map_err(|e| format!("Failed to parse payload: {}", e))?;

    // Directly use the payload string for now, assuming it's the correct JSON format.
    // Ensure 'stream: true' is set by the frontend or add it here if needed.
    let body_json: serde_json::Value = serde_json::from_str(&payload)
         .map_err(|e| format!("Failed to parse payload into JSON Value: {}", e))?;

    // TODO: Add logic here to ensure stream: true is set in body_json if not already present.


    let client = reqwest::Client::new();
    let response = client.post("https://api.anthropic.com/v1/messages")
        .header("Content-Type", "application/json")
        .header("anthropic-version", "2023-06-01") // Use the required version
        .header("x-api-key", &api_key) // Use x-api-key header instead
        .json(&body_json) // Send the parsed JSON value
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status(); // Store status before consuming response
    if !status.is_success() {
        // Now consume the response to get the error body
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
        let error_msg = format!("API request failed with status {}: {}", status, error_body); // Use stored status
         window.emit("anthropic-stream-error", &error_msg).map_err(|e| format!("Failed to emit error event: {}", e))?;
        return Err(error_msg);
    }

    let mut stream = response.bytes_stream();

    while let Some(item) = stream.next().await {
        match item {
            Ok(chunk) => {
                // Convert bytes to string - handle potential UTF-8 errors
                match String::from_utf8(chunk.to_vec()) {
                     Ok(chunk_string) => {
                        window.emit("anthropic-stream-chunk", &chunk_string)
                              .map_err(|e| format!("Failed to emit chunk event: {}", e))?;
                     }
                    Err(e) => {
                         let error_msg = format!("Failed to decode chunk as UTF-8: {}", e);
                         window.emit("anthropic-stream-error", &error_msg).map_err(|e| format!("Failed to emit UTF-8 error event: {}", e))?;
                         // Decide whether to continue or break here based on error severity
                    }
                }
            }
            Err(e) => {
                let error_msg = format!("Error reading stream chunk: {}", e);
                 window.emit("anthropic-stream-error", &error_msg).map_err(|e| format!("Failed to emit stream read error event: {}", e))?;
                return Err(error_msg); // Stop processing on stream error
            }
        }
    }

    // Signal end of stream
    window.emit("anthropic-stream-end", ()).map_err(|e| format!("Failed to emit end event: {}", e))?;

    Ok(())
} 