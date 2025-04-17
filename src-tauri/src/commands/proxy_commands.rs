use serde::Deserialize;
use tauri::{Window, Emitter};
use futures_util::StreamExt;
use std::env;
use dotenv::dotenv;
use tauri_plugin_http::reqwest;
use serde_json::{json, Value};

#[derive(Deserialize)]
struct AnthropicRequestPayload {
    // Define fields expected from the frontend payload if necessary
    // For now, assume the payload is the direct body for Anthropic
    // We might need to refine this based on what useChat actually sends.
    #[serde(flatten)]
    anthropic_data: serde_json::Value,
}

// Anthropic's event data structure for streaming
#[derive(Deserialize, Debug)]
struct AnthropicEvent {
    #[serde(rename = "type")]
    event_type: String,
    delta: Option<AnthropicDelta>,
    message: Option<Value>,
    usage: Option<Value>,
}

#[derive(Deserialize, Debug)]
struct AnthropicDelta {
    text: Option<String>,
}

#[tauri::command]
pub async fn stream_api_request(window: Window, payload: String) -> Result<(), String> {
    dotenv().ok(); 
    println!("Attempting to load ANTHROPIC_API_KEY from .env"); 

    let api_key_result = env::var("ANTHROPIC_API_KEY");

    let api_key = match api_key_result {
        Ok(key) => {
            println!("ANTHROPIC_API_KEY loaded successfully."); 
            key
        }
        Err(e) => {
            let error_msg = format!("Failed to load ANTHROPIC_API_KEY: {}", e);
            println!("{}", error_msg); 
            window.emit("anthropic-stream-error", &error_msg).map_err(|e_emit| format!("Failed to emit API key error event: {}", e_emit))?;
            return Err(error_msg);
        }
    };

    // --- TEMPORARY LOGGING --- 
    let key_len = api_key.len();
    let redacted_key = if key_len > 10 {
        format!("{}...{}", &api_key[..5], &api_key[key_len-5..])
    } else {
        "Key too short to redact safely".to_string()
    };
    println!("Using API Key (redacted): {}", redacted_key);
    // --- END TEMPORARY LOGGING ---

    println!("hello from rust");

    let body_json: serde_json::Value = serde_json::from_str(&payload)
         .map_err(|e| format!("Failed to parse payload into JSON Value: {}", e))?;

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
    let mut buffer = String::new();
    
    // Track whether we've sent a start event
    let mut started = false;

    while let Some(item) = stream.next().await {
        match item {
            Ok(chunk) => {
                // Convert bytes to string - handle potential UTF-8 errors
                match String::from_utf8(chunk.to_vec()) {
                    Ok(chunk_string) => {
                        // Anthropic uses Server-Sent Events format with "data: {json}" lines
                        buffer.push_str(&chunk_string);
                        
                        // Process complete SSE events
                        while let Some(pos) = buffer.find("\n\n") {
                            let event_data = buffer[..pos].to_string();
                            buffer = buffer[pos + 2..].to_string();
                            
                            // Process each line in the event
                            for line in event_data.lines() {
                                if line.starts_with("data: ") {
                                    let json_str = &line[6..]; // Skip "data: "
                                    
                                    if json_str == "[DONE]" {
                                        // End of stream
                                        continue;
                                    }
                                    
                                    // Parse Anthropic's JSON
                                    match serde_json::from_str::<AnthropicEvent>(json_str) {
                                        Ok(event) => {
                                            // Transform to Vercel AI SDK format
                                            match event.event_type.as_str() {
                                                "content_block_delta" => {
                                                    if let Some(delta) = event.delta {
                                                        if let Some(text) = delta.text {
                                                            // Text part: 0:"example"\n
                                                            let vercel_format = format!("0:{}\n", 
                                                                serde_json::to_string(&text)
                                                                .unwrap_or_else(|_| "\"\"".to_string()));
                                                            
                                                            window.emit("anthropic-stream-chunk", &vercel_format)
                                                                .map_err(|e| format!("Failed to emit chunk event: {}", e))?;
                                                        }
                                                    }
                                                },
                                                "message_start" => {
                                                    // Mark that we've started processing
                                                    started = true;
                                                    
                                                    // Start step part: f:{"messageId":"step_123"}\n
                                                    if let Some(message) = &event.message {
                                                        if let Some(message_id) = message.get("id") {
                                                            let start_step = format!("f:{}\n", 
                                                                serde_json::to_string(&json!({
                                                                    "messageId": message_id
                                                                })).unwrap_or_else(|_| "{}".to_string()));
                                                            
                                                            window.emit("anthropic-stream-chunk", &start_step)
                                                                .map_err(|e| format!("Failed to emit start step event: {}", e))?;
                                                        }
                                                    }
                                                },
                                                "message_delta" => {
                                                    // Content deltas are handled in content_block_delta
                                                },
                                                "message_stop" => {
                                                    // Finish step part
                                                    let finish_step = format!("e:{}\n", 
                                                        serde_json::to_string(&json!({
                                                            "finishReason": "stop",
                                                            "usage": event.usage.clone().unwrap_or(json!({})),
                                                            "isContinued": false
                                                        })).unwrap_or_else(|_| "{}".to_string()));
                                                    
                                                    window.emit("anthropic-stream-chunk", &finish_step)
                                                        .map_err(|e| format!("Failed to emit finish step event: {}", e))?;
                                                    
                                                    // Finish message part
                                                    let finish_message = format!("d:{}\n", 
                                                        serde_json::to_string(&json!({
                                                            "finishReason": "stop",
                                                            "usage": event.usage.unwrap_or(json!({}))
                                                        })).unwrap_or_else(|_| "{}".to_string()));
                                                    
                                                    window.emit("anthropic-stream-chunk", &finish_message)
                                                        .map_err(|e| format!("Failed to emit finish message event: {}", e))?;
                                                },
                                                _ => {
                                                    // Unknown event type, log for debugging
                                                    println!("Unknown event type: {}", event.event_type);
                                                }
                                            }
                                        },
                                        Err(e) => {
                                            println!("Failed to parse Anthropic event: {}, json: {}", e, json_str);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to decode chunk as UTF-8: {}", e);
                        window.emit("anthropic-stream-error", &error_msg).map_err(|e| format!("Failed to emit UTF-8 error event: {}", e))?;
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