use serde::{Deserialize, Serialize};
use tauri::{Window, Emitter};
use futures_util::StreamExt;
use std::env;
use dotenv::dotenv;
use tauri_plugin_http::reqwest::{self, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};
use serde_json::{json, Value};

#[derive(Deserialize)]
struct StreamRequestArgs {
    provider: String,
    payload: String,
}

#[derive(Deserialize)]
struct AnthropicRequestPayload {
    #[serde(flatten)]
    anthropic_data: serde_json::Value,
}

#[derive(Deserialize, Debug)]
struct AnthropicEvent {
    #[serde(rename = "type")]
    event_type: String,
    delta: Option<AnthropicDelta>,
    message: Option<Value>,
    usage: Option<Value>,
    error: Option<AnthropicError>,
    index: Option<u32>,
}

#[derive(Deserialize, Debug)]
struct AnthropicDelta {
    #[serde(rename = "type")]
    delta_type: Option<String>,
    text: Option<String>,
}

#[derive(Deserialize, Debug)]
struct AnthropicError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

#[derive(Deserialize, Debug)]
struct OpenAIChatCompletionChunk {
    id: String,
    object: String,
    created: u64,
    model: String,
    system_fingerprint: Option<String>,
    choices: Vec<OpenAIChoice>,
}

#[derive(Deserialize, Debug)]
struct OpenAIChoice {
    index: u32,
    delta: OpenAIDelta,
    logprobs: Option<Value>, // Keep as Value or define structure if needed
    finish_reason: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)] // Clone needed for potential reuse
struct OpenAIDelta {
    role: Option<String>,
    content: Option<String>,
    // Potentially tool_calls etc. for function calling
}

// --- Generic Event Emission ---
const EVT_CHUNK: &str = "ai-stream-chunk";
const EVT_ERROR: &str = "ai-stream-error";
const EVT_END: &str = "ai-stream-end";

fn emit_error<S: Into<String>>(window: &Window, message: S) -> Result<(), String> {
    let msg = message.into();
    // Log before emitting
    println!("RUST -> FE: Emitting Error: {}", msg);
    window.emit(EVT_ERROR, &msg)
          .map_err(|e| format!("Failed to emit error event ({}): {}", msg, e))
}

fn emit_chunk<S: Into<String>>(window: &Window, data: S) -> Result<(), String> {
    let chunk_data = data.into();
    // Log before emitting - Use {:?} to see escape characters like \n clearly
    println!("RUST -> FE: Emitting Chunk: {:?}", chunk_data);
    window.emit(EVT_CHUNK, &chunk_data)
          .map_err(|e| format!("Failed to emit chunk event: {}", e))
}

fn emit_end(window: &Window) -> Result<(), String> {
    // Log before emitting
    println!("RUST -> FE: Emitting End");
    window.emit(EVT_END, ())
          .map_err(|e| format!("Failed to emit end event: {}", e))
}


// Helper to load API keys
fn load_api_key(provider: &str) -> Result<String, String> {
    dotenv().ok();
    let key_name = match provider {
        "anthropic" => "ANTHROPIC_API_KEY",
        "openai" => "OPENAI_API_KEY",
        _ => return Err(format!("Unsupported provider: {}", provider)),
    };
    println!("Attempting to load {} from environment/dotenv", key_name);
    match env::var(key_name) {
        Ok(key) => {
            // Redacted logging for security
            let key_len = key.len();
            let redacted_key = if key_len > 10 {
                format!("{}...{}", &key[..5], &key[key_len-5..])
            } else {
                "Key too short to redact safely".to_string()
            };
            println!("{} loaded successfully (redacted: {}).", key_name, redacted_key);
            Ok(key)
        },
        Err(e) => {
            let error_msg = format!("Failed to load {}: {}", key_name, e);
            println!("{}", error_msg);
            Err(error_msg)
        }
    }
}


#[tauri::command]
pub async fn stream_api_request(window: Window, provider: String, payload: String) -> Result<(), String> {
    println!("RUST: Received stream request for provider: {}", provider);
    // println!("RUST: Payload received: {}", payload); // Careful logging sensitive payload data

    let api_key = match load_api_key(&provider) {
        Ok(key) => key,
        Err(e) => {
            // Error emitted within emit_error function now
            emit_error(&window, &e)?;
            return Err(e);
        }
    };

    let body_json: serde_json::Value = match serde_json::from_str(&payload) {
         Ok(json) => json,
         Err(e) => {
              let err_msg = format!("RUST: Failed to parse payload into JSON Value: {}", e);
              emit_error(&window, &err_msg)?;
              return Err(err_msg);
         }
    };


    // Dispatch based on provider
    println!("RUST: Dispatching to {} handler", provider);
    let result = match provider.as_str() {
        "anthropic" => handle_anthropic_stream(window.clone(), api_key, body_json).await,
        "openai" => handle_openai_stream(window.clone(), api_key, body_json).await,
        _ => {
            let err_msg = format!("RUST: Unsupported provider: {}", provider);
            emit_error(&window, &err_msg)?; // Emit error to frontend
            Err(err_msg) // Return error to backend caller
        }
    };

    if let Err(e) = &result {
         println!("RUST: Stream handler for {} finished with error: {}", provider, e);
         // Emit error already handled within the handler or above, but log completion
    } else {
         println!("RUST: Stream handler for {} finished successfully.", provider);
    }
    // We emit end *within* the handlers now on success.

    result // Return the result from the handler
}

// --- Anthropic Stream Handler ---
async fn handle_anthropic_stream(window: Window, api_key: String, body: Value) -> Result<(), String> {
    println!("RUST: Handling Anthropic stream...");
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    headers.insert("x-api-key", HeaderValue::from_str(&api_key).map_err(|e| format!("Invalid Anthropic API key format: {}", e))?);

    let response = client.post("https://api.anthropic.com/v1/messages")
        .headers(headers)
        .json(&body)
        .send()
        .await;

    let response = match response {
          Ok(res) => res,
          Err(e) => {
               let err_msg = format!("RUST: Anthropic request failed (network/connection): {}", e);
               emit_error(&window, &err_msg)?;
               return Err(err_msg);
          }
     };

    let status = response.status();
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
        let error_msg = format!("RUST: Anthropic API request failed with status {}: {}", status, error_body);
        emit_error(&window, &error_msg)?;
        return Err(error_msg);
    }
    println!("RUST: Anthropic API request successful (status: {})", status);

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    println!("RUST: Starting to process Anthropic stream...");
    while let Some(item) = stream.next().await {
        match item {
            Ok(chunk) => {
                 println!("RUST: Received raw bytes chunk from Anthropic: {} bytes", chunk.len());
                match String::from_utf8(chunk.to_vec()) {
                    Ok(chunk_string) => {
                         println!("RUST: Decoded Anthropic chunk: {:?}", chunk_string);
                        buffer.push_str(&chunk_string);

                        while let Some(pos) = buffer.find("\n\n") {
                            let event_data = buffer[..pos].trim().to_string();
                            buffer = buffer[pos + 2..].to_string(); // Skip "\n\n"
                            println!("RUST: Processing Anthropic SSE event block: {:?}", event_data);

                            let mut data_line = "";
                             for line in event_data.lines() {
                                if line.starts_with("data: ") {
                                     data_line = &line[6..]; // Skip "data: "
                                     println!("RUST: Extracted Anthropic data line: {:?}", data_line);
                                } else if line.starts_with("event:") {
                                     println!("RUST: Found Anthropic event type line: {:?}", line);
                                } else if !line.trim().is_empty() {
                                     println!("RUST: Found other Anthropic line: {:?}", line);
                                }
                            }

                            if data_line.is_empty() {
                                 println!("RUST: Skipping Anthropic event block - no data line found.");
                                 continue;
                            }

                            match serde_json::from_str::<AnthropicEvent>(data_line) {
                                Ok(event) => {
                                     println!("RUST: Parsed Anthropic event type: {}", event.event_type);
                                    match event.event_type.as_str() {
                                        "message_start" => {
                                             // Store ID internally if needed, but don't emit 'm:'
                                            // if let Some(message) = &event.message { if let Some(id_val) = message.get("id") { if let Some(id_str) = id_val.as_str() { current_message_id = Some(id_str.to_string()); println!("RUST: Stored Anthropic message ID: {}", id_str); } } }
                                            println!("RUST: Processing Anthropic message_start event.");
                                        },
                                        "content_block_delta" => {
                                            if let Some(delta) = event.delta {
                                                 if delta.delta_type.as_deref() == Some("text_delta") {
                                                    if let Some(text) = delta.text {
                                                         // Vercel AI SDK: text delta -> '0:"<json_escaped_text>"\n'
                                                         let text_json = serde_json::to_string(&text)
                                                             .unwrap_or_else(|_| "\"\"".to_string());
                                                         // Log added in emit_chunk
                                                         emit_chunk(&window, format!("0:{}\n", text_json))?;
                                                    } else {
                                                         println!("RUST: Anthropic content_block_delta (text_delta) had no text field.");
                                                    }
                                                 } else {
                                                     println!("RUST: Anthropic content_block_delta was not text_delta: {:?}", delta.delta_type);
                                                 }
                                            } else {
                                                 println!("RUST: Anthropic content_block_delta event had no delta field.");
                                            }
                                        },
                                        "message_delta" => {
                                             // Contains usage updates, Vercel SDK doesn't have a standard prefix for this mid-stream. Log it.
                                             if let Some(usage) = event.usage {
                                                  println!("RUST: Anthropic message_delta with usage: {:?}", usage);
                                             } else {
                                                  println!("RUST: Anthropic message_delta event had no usage field.");
                                             }
                                        },
                                        "message_stop" => {
                                             println!("RUST: Anthropic message_stop event received.");
                                             // Don't emit 'e:'. Stream end will be signaled by emit_end() later.
                                             // Log finish reason and usage if needed.
                                             if let Some(msg) = event.message { println!("RUST: Anthropic stop message details: {:?}", msg); }
                                             if let Some(usage) = event.usage { println!("RUST: Anthropic final usage: {:?}", usage); }
                                        },
                                         "error" => {
                                            if let Some(error_details) = event.error {
                                                let err_msg = format!("RUST: Anthropic API Error Event: [{}] {}", error_details.error_type, error_details.message);
                                                emit_error(&window, &err_msg)?; // Emit error to frontend
                                                // Don't return here, let stream potentially continue unless fatal? Anthropic might send this for non-fatal issues.
                                            } else {
                                                 println!("RUST: Anthropic error event had no error field.");
                                            }
                                        },
                                        // "ping", "content_block_start", "content_block_stop" -> just log or ignore
                                        "ping" => { println!("RUST: Anthropic ping event ignored."); },
                                        "content_block_start" => { println!("RUST: Anthropic content_block_start event ignored for emission."); },
                                        "content_block_stop" => { println!("RUST: Anthropic content_block_stop event ignored for emission."); },
                                        _ => println!("RUST: Unknown Anthropic event type received: {}", event.event_type),
                                    }
                                },
                                Err(e) => {
                                    // Log parsing failure
                                    println!("RUST: Failed to parse Anthropic data line as JSON event: {}, data: '{}'", e, data_line);
                                     // Maybe emit a specific error? For now, just log.
                                     // emit_error(&window, format!("RUST: Failed to parse Anthropic JSON: {}", e))?;
                                }
                            }
                        } // end while let Some(pos)
                    } // end Ok(chunk_string)
                    Err(e) => {
                         let error_msg = format!("RUST: Failed to decode Anthropic chunk as UTF-8: {}", e);
                         emit_error(&window, &error_msg)?;
                         // Don't return error here, maybe the stream can recover? Log it.
                         // return Err(error_msg);
                    }
                } // end match String::from_utf8
            } // end Ok(chunk)
            Err(e) => {
                 let error_msg = format!("RUST: Error reading Anthropic stream chunk: {}", e);
                 emit_error(&window, &error_msg)?;
                 return Err(error_msg); // Return error on stream read failure
            }
        } // end match item
    } // end while let Some(item)

    println!("RUST: Anthropic stream finished processing.");
    emit_end(&window)?; // Signal end of stream *after* processing loop finishes
    Ok(())
}


// --- OpenAI Stream Handler ---
async fn handle_openai_stream(window: Window, api_key: String, body: Value) -> Result<(), String> {
    println!("RUST: Handling OpenAI stream...");
    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| format!("Invalid OpenAI API key format: {}", e))?);

    let response = client.post("https://api.openai.com/v1/chat/completions")
        .headers(headers)
        .json(&body)
        .send()
        .await;

     let response = match response {
          Ok(res) => res,
          Err(e) => {
               let err_msg = format!("RUST: OpenAI request failed (network/connection): {}", e);
               emit_error(&window, &err_msg)?;
               return Err(err_msg);
          }
     };

    let status = response.status();
    if !status.is_success() {
        let error_body = response.text().await.unwrap_or_else(|_| "Failed to read error body".to_string());
        let error_msg = format!("RUST: OpenAI API request failed with status {}: {}", status, error_body);
        emit_error(&window, &error_msg)?;
        return Err(error_msg);
    }
     println!("RUST: OpenAI API request successful (status: {})", status);

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    println!("RUST: Starting to process OpenAI stream...");
    while let Some(item) = stream.next().await {
        match item {
            Ok(chunk) => {
                println!("RUST: Received raw bytes chunk from OpenAI: {} bytes", chunk.len());
                match String::from_utf8(chunk.to_vec()) {
                    Ok(chunk_string) => {
                        println!("RUST: Decoded OpenAI chunk: {:?}", chunk_string);
                        buffer.push_str(&chunk_string);

                        // OpenAI uses Server-Sent Events format: "data: {json}\n\n"
                        while let Some(pos) = buffer.find("\n\n") {
                            let event_data = buffer[..pos].trim().to_string();
                            buffer = buffer[pos + 2..].to_string(); // Skip "\n\n"
                             println!("RUST: Processing OpenAI SSE event block: {:?}", event_data);

                            // Process each line (usually just one "data: " line per event)
                            for line in event_data.lines() {
                                 println!("RUST: Processing OpenAI line: {:?}", line);
                                if line.starts_with("data: ") {
                                    let json_str = &line[6..]; // Skip "data: "
                                     println!("RUST: Extracted OpenAI data line: {:?}", json_str);

                                    if json_str.trim() == "[DONE]" {
                                         println!("RUST: OpenAI [DONE] signal received.");
                                        // Stream end will be signaled by emit_end() later.
                                        continue;
                                    }

                                    match serde_json::from_str::<OpenAIChatCompletionChunk>(json_str) {
                                        Ok(chunk_event) => {
                                             println!("RUST: Parsed OpenAI chunk event ID: {}", chunk_event.id);
                                            // Store message ID internally if needed
                                            // if current_message_id.is_none() { current_message_id = Some(chunk_event.id.clone()); println!("RUST: Stored OpenAI message ID: {}", chunk_event.id); }

                                            for choice in chunk_event.choices {
                                                 println!("RUST: Processing OpenAI choice index: {}", choice.index);
                                                // Handle content delta
                                                if let Some(content) = choice.delta.content {
                                                    if !content.is_empty() {
                                                         // Vercel AI SDK: Text delta -> '0:"<json_escaped_text>"\n'
                                                         let text_json = serde_json::to_string(&content)
                                                             .unwrap_or_else(|_| "\"\"".to_string());
                                                         // Log added in emit_chunk
                                                         emit_chunk(&window, format!("0:{}\n", text_json))?;
                                                    } else {
                                                         println!("RUST: OpenAI choice delta content was empty.");
                                                    }
                                                } else {
                                                     println!("RUST: OpenAI choice delta had no content field.");
                                                }

                                                // Handle finish reason
                                                if let Some(reason) = choice.finish_reason {
                                                    println!("RUST: OpenAI choice finished with reason: {}", reason);
                                                    // Don't emit 'e:'. Stream end will be signaled later.
                                                }
                                                // Log other delta parts if needed
                                                // if let Some(role) = choice.delta.role { println!("RUST: OpenAI delta role: {}", role); }
                                            } // end for choice
                                        }, // end Ok(chunk_event)
                                        Err(e) => {
                                            println!("RUST: Failed to parse OpenAI chunk event: {}, json: {}", e, json_str);
                                            // Potentially emit an error or log more verbosely
                                            emit_error(&window, format!("RUST: Failed to parse OpenAI JSON: {}", e))?;
                                        }
                                    } // end match serde_json
                                } else if !line.trim().is_empty() {
                                     println!("RUST: Unexpected non-data line in OpenAI stream: {}", line);
                                } // end if line.starts_with
                            } // end for line
                        } // end while let Some(pos)
                    }, // end Ok(chunk_string)
                    Err(e) => {
                         let error_msg = format!("RUST: Failed to decode OpenAI chunk as UTF-8: {}", e);
                         emit_error(&window, &error_msg)?;
                          // return Err(error_msg); // Maybe log and continue?
                    }
                } // end match String::from_utf8
            } // end Ok(chunk)
            Err(e) => {
                 let error_msg = format!("RUST: Error reading OpenAI stream chunk: {}", e);
                 emit_error(&window, &error_msg)?;
                 return Err(error_msg); // Return error on stream read failure
            }
        } // end match item
    } // end while let Some(item)

    println!("RUST: OpenAI stream finished processing.");
    emit_end(&window)?; // Signal end of stream *after* processing loop finishes
    Ok(())
} 