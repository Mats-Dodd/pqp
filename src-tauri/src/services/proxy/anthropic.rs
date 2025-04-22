use crate::services::proxy::{ProxyProvider, ProxyResult, ProxyError};
use crate::services::proxy::{emit_chunk, emit_error, emit_end};
use async_trait::async_trait;
use futures_util::StreamExt;
use serde_json::{json, Value};
use serde::{Deserialize, Serialize};
use tauri::Window;
use tauri_plugin_http::reqwest::{self, header::{HeaderMap, HeaderValue, CONTENT_TYPE}};

pub struct AnthropicProvider {
    api_key: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
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

#[async_trait]
impl ProxyProvider for AnthropicProvider {
    async fn stream(&self, window: Window, body: Value) -> ProxyResult<()> {
        println!("RUST: Handling Anthropic stream...");
        let client = reqwest::Client::new();
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
        headers.insert("x-api-key", HeaderValue::from_str(&self.api_key)
            .map_err(|e| ProxyError::ApiKey(format!("Invalid Anthropic API key format: {}", e)))?);

        let response = client.post("https://api.anthropic.com/v1/messages")
            .headers(headers)
            .json(&body)
            .send()
            .await?; 
        
        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            let error_msg = format!("Anthropic API request failed with status {}: {}", status, error_body);
            emit_error(&window, &error_msg)?;
            return Err(ProxyError::Status(status.as_u16()));
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
                                                println!("RUST: Processing Anthropic message_start event.");
                                            },
                                            "content_block_delta" => {
                                                if let Some(delta) = event.delta {
                                                    if delta.delta_type.as_deref() == Some("text_delta") {
                                                        if let Some(text) = delta.text {
                                                            // Vercel AI SDK: text delta -> '0:"<json_escaped_text>"\n'
                                                            let text_json = serde_json::to_string(&text)
                                                                .map_err(ProxyError::Parse)?;
                                                            emit_chunk(&window, format!("0:{}\n", text_json))?;
                                                        }
                                                    }
                                                }
                                            },
                                            "message_delta" => {
                                                if let Some(usage) = event.usage {
                                                    println!("RUST: Anthropic message_delta with usage: {:?}", usage);
                                                }
                                            },
                                            "message_stop" => {
                                                println!("RUST: Anthropic message_stop event received.");
                                                if let Some(usage) = event.usage {
                                                    println!("RUST: Anthropic final usage: {:?}", usage);
                                                }
                                            },
                                            "error" => {
                                                if let Some(error_details) = event.error {
                                                    let err_msg = format!("Anthropic API Error Event: [{}] {}", 
                                                        error_details.error_type, error_details.message);
                                                    emit_error(&window, &err_msg)?;
                                                }
                                            },
                                            "ping" => {
                                                println!("RUST: Anthropic ping event ignored.");
                                            },
                                            _ => println!("RUST: Unknown Anthropic event type received: {}", event.event_type),
                                        }
                                    },
                                    Err(e) => {
                                        println!("RUST: Failed to parse Anthropic data line as JSON event: {}, data: '{}'", e, data_line);
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            let error_msg = format!("Failed to decode Anthropic chunk as UTF-8: {}", e);
                            emit_error(&window, &error_msg)?;
                        }
                    }
                },
                Err(e) => {
                    let error_msg = format!("Error reading Anthropic stream chunk: {}", e);
                    emit_error(&window, &error_msg)?;
                    return Err(ProxyError::Http(e));
                }
            }
        }

        println!("RUST: Anthropic stream finished processing.");
        emit_end(&window)?;
        Ok(())
    }
} 