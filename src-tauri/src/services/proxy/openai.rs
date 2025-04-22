use crate::services::proxy::{ProxyProvider, ProxyResult, ProxyError};
use crate::services::proxy::{emit_chunk, emit_error, emit_end};
use async_trait::async_trait;
use futures_util::StreamExt;
use serde_json::{json, Value};
use serde::{Deserialize, Serialize};
use tauri::Window;
use tauri_plugin_http::reqwest::{self, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};

pub struct OpenAIProvider {
    api_key: String,
}

impl OpenAIProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
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
    logprobs: Option<Value>,
    finish_reason: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct OpenAIDelta {
    role: Option<String>,
    content: Option<String>,
}

#[async_trait]
impl ProxyProvider for OpenAIProvider {
    async fn stream(&self, window: Window, body: Value) -> ProxyResult<()> {
        println!("RUST: Handling OpenAI stream...");
        let client = reqwest::Client::new();
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", self.api_key))
            .map_err(|e| ProxyError::ApiKey(format!("Invalid OpenAI API key format: {}", e)))?);

        let response = client.post("https://api.openai.com/v1/chat/completions")
            .headers(headers)
            .json(&body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response.text().await
                .unwrap_or_else(|_| "Failed to read error body".to_string());
            let error_msg = format!("OpenAI API request failed with status {}: {}", status, error_body);
            emit_error(&window, &error_msg)?;
            return Err(ProxyError::Status(status.as_u16()));
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

                            while let Some(pos) = buffer.find("\n\n") {
                                let event_data = buffer[..pos].trim().to_string();
                                buffer = buffer[pos + 2..].to_string(); // Skip "\n\n"
                                println!("RUST: Processing OpenAI SSE event block: {:?}", event_data);

                                for line in event_data.lines() {
                                    println!("RUST: Processing OpenAI line: {:?}", line);
                                    if line.starts_with("data: ") {
                                        let json_str = &line[6..]; 
                                        println!("RUST: Extracted OpenAI data line: {:?}", json_str);

                                        if json_str.trim() == "[DONE]" {
                                            println!("RUST: OpenAI [DONE] signal received.");
                                            continue;
                                        }

                                        match serde_json::from_str::<OpenAIChatCompletionChunk>(json_str) {
                                            Ok(chunk_event) => {
                                                println!("RUST: Parsed OpenAI chunk event ID: {}", chunk_event.id);

                                                for choice in chunk_event.choices {
                                                    println!("RUST: Processing OpenAI choice index: {}", choice.index);
                                                    if let Some(content) = choice.delta.content {
                                                        if !content.is_empty() {
                                                    
                                                            let text_json = serde_json::to_string(&content)
                                                                .map_err(ProxyError::Parse)?;
                                                            emit_chunk(&window, format!("0:{}\n", text_json))?;
                                                        } else {
                                                            println!("RUST: OpenAI choice delta content was empty.");
                                                        }
                                                    }

                                                    if let Some(reason) = choice.finish_reason {
                                                        println!("RUST: OpenAI choice finished with reason: {}", reason);
                                                    }
                                                }
                                            },
                                            Err(e) => {
                                                println!("RUST: Failed to parse OpenAI chunk event: {}, json: {}", e, json_str);
                                                emit_error(&window, format!("Failed to parse OpenAI JSON: {}", e))?;
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        Err(e) => {
                            let error_msg = format!("Failed to decode OpenAI chunk as UTF-8: {}", e);
                            emit_error(&window, &error_msg)?;
                        }
                    }
                },
                Err(e) => {
                    let error_msg = format!("Error reading OpenAI stream chunk: {}", e);
                    emit_error(&window, &error_msg)?;
                    return Err(ProxyError::Http(e));
                }
            }
        }

        println!("RUST: OpenAI stream finished processing.");
        emit_end(&window)?;
        Ok(())
    }
} 