# Proxy Commands Refactor Plan

## 1. SCOPE & PRINCIPLES
- **Goal**: Remove duplication, shorten functions, introduce typed errors, but **do not over‑engineer**
- Keep public API of the Tauri command unchanged (`stream_api_request`)
- One new top‑level service directory (`services/proxy/`) with **three small rust files** only; no deeper tree unless proven useful

```
src-tauri/src/services/proxy/
 ├── mod.rs          // trait + factory + small helpers
 ├── anthropic.rs    // provider impl
 └── openai.rs       // provider impl
```

## 2. STEP‑BY‑STEP PLAN

### PHASE 0 (safety net – 1 commit)
- Add `log` and `thiserror` crates to Cargo.toml (needed later)
- Add unit‑test placeholder verifying that current command still streams

### PHASE 1 (typed error + minimal trait – 1 commit)
File: `services/proxy/mod.rs`
1. Define lightweight error enum `ProxyError` with `thiserror` (4 variants only: `ApiKey`, `Http`, `Status(u16)`, `Parse`)
2. Expose `type ProxyResult<T> = Result<T, ProxyError>`
3. Define tiny trait:

```rust
#[async_trait]
pub trait ProxyProvider {
    async fn stream(&self, window: Window, body: Value) -> ProxyResult<()>;
}
```

4. Add `impl From<reqwest::Error>` and `serde_json::Error` for automatic conversion

### PHASE 2 (factory & key loader – 1 commit)
Still inside `mod.rs`:
- Move `load_api_key` out of command file; return `ProxyResult<String>`
- Add `get_provider(provider: &str) -> ProxyResult<Box<dyn ProxyProvider + Send + Sync>>`

### PHASE 3 (move common emit helpers – 1 commit)
- Copy `emit_chunk`, `emit_error`, `emit_end` into `mod.rs`; change return type to `ProxyResult<()>`
- Mark helpers `pub(crate)` so providers reuse them

### PHASE 4 (Anthropic provider extraction – 1‑2 commits)
File: `anthropic.rs`
- Cut‑paste current `handle_anthropic_stream` body, adjust to implement trait
- Replace string errors with `ProxyError`, remove dead comments / duplicate logs
- After compile passes, delete old code from `proxy_commands.rs`

### PHASE 5 (OpenAI provider extraction – 1‑2 commits)
Same as Phase 4 for `openai.rs`

### PHASE 6 (command layer slimming – 1 commit)
In `proxy_commands.rs`:
- Keep only: argument parsing, provider lookup, provider.stream call, map `ProxyError` → string for Tauri return
- Delete now‑unused helpers

### PHASE 7 (cleanup & polish – 1 commit)
- Downgrade println! to `log::{info,debug,error}`
- Trim verbose logs (keep bytes count, event type, but remove per‑line noise)
- Ensure no `.unwrap()` or needless `.clone()`
- Run `cargo clippy -- -D warnings`

## 3. DECISIONS EXPLICITLY NOT TAKEN
- No generic SSE parser abstraction yet – premature
- No config file for endpoints; constants stay inline in provider modules
- No async channel refactor; window emit is fine
- No macro‑based event emitter; three helpers are sufficient

## 4. SUCCESS CRITERIA
- ✓ All existing frontend behaviour unchanged
- ✓ `proxy_commands.rs` ≤ ~80 lines, each provider file ≤ ~200 lines
- ✓ Duplication of stream‑loop logic reduced but readability preserved
- ✓ `cargo test` & manual UI test pass after every phase 