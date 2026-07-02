use axum::{extract::State, extract::Query};
use serde::Deserialize;
use std::sync::Arc;

use crate::app_state::AppState;
use crate::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ModelQuery {
    pub provider: Option<String>,
}

/// Get AI config (GET /api/ai/config)
pub async fn get_ai_config(State(state): State<Arc<AppState>>) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(serde_json::json!({
        "apiKey": state.config.openrouter_api_key.as_deref().unwrap_or("")
    }))
}

/// Fetch free models from OpenRouter (GET /api/ai/fetch-free-models)
pub async fn fetch_free_models(State(state): State<Arc<AppState>>) -> ApiResponse<serde_json::Value> {
    let api_key = match &state.config.openrouter_api_key {
        Some(k) => k.clone(),
        None => {
            return ApiResponse::error(503, "OpenRouter API Key 未配置");
        }
    };

    let client = reqwest::Client::new();
    match client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                let data: serde_json::Value = resp.json().await.unwrap_or_default();
                let models = data.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default();
                let free_models: Vec<serde_json::Value> = models
                    .into_iter()
                    .filter(|m| {
                        m.get("pricing")
                            .and_then(|p| p.get("request"))
                            .and_then(|r| r.as_f64())
                            .map(|v| v <= 0.0)
                            .unwrap_or(false)
                    })
                    .map(|m| {
                        serde_json::json!({
                            "value": m.get("id"),
                            "label": m.get("name").or(m.get("id")),
                            "free": true,
                            "description": m.get("description").unwrap_or(&serde_json::Value::Null),
                        })
                    })
                    .collect();

                ApiResponse::success(serde_json::json!({ "models": free_models }))
            } else {
                ApiResponse::error(502, "Failed to fetch models from OpenRouter")
            }
        }
        Err(e) => {
            ApiResponse::success(serde_json::json!({
                "models": [],
                "error": e.to_string()
            }))
        }
    }
}

/// Fetch models for any provider (GET /api/ai/fetch-all-models?provider=openrouter)
/// Routes to the correct API based on provider ID.
pub async fn fetch_all_models(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ModelQuery>,
) -> ApiResponse<serde_json::Value> {
    let provider = params.provider.as_deref().unwrap_or("openrouter");

    match provider {
        "openrouter" => fetch_openrouter_models(&state).await,
        "openai" => fetch_openai_models().await,
        "siliconflow" => fetch_siliconflow_models().await,
        // Providers without public /models endpoint: return empty list
        // Frontend falls back to static model definitions
        "agnes" | "opencode" | "anthropic" | "google" | "deepseek" | "custom" => {
            ApiResponse::success(serde_json::json!({ "models": [] }))
        }
        _ => {
            // Unknown provider: try OpenRouter as fallback
            fetch_openrouter_models(&state).await
        }
    }
}

/// Fetch models from OpenRouter API
async fn fetch_openrouter_models(state: &AppState) -> ApiResponse<serde_json::Value> {
    let api_key = match &state.config.openrouter_api_key {
        Some(k) => k.clone(),
        None => {
            return ApiResponse::success(serde_json::json!({ "models": [], "error": "API Key 未配置" }));
        }
    };

    let client = reqwest::Client::new();
    match client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                let data: serde_json::Value = resp.json().await.unwrap_or_default();
                let models = data.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default();
                let result: Vec<serde_json::Value> = models
                    .into_iter()
                    .map(|m| {
                        let is_free = m.get("pricing")
                            .and_then(|p| p.get("request"))
                            .and_then(|r| r.as_f64())
                            .map(|v| v <= 0.0)
                            .unwrap_or(false);
                        serde_json::json!({
                            "value": m.get("id"),
                            "label": m.get("name").or(m.get("id")),
                            "free": is_free,
                            "description": m.get("description").and_then(|d| d.as_str()).unwrap_or(""),
                        })
                    })
                    .collect();
                ApiResponse::success(serde_json::json!({ "models": result }))
            } else {
                ApiResponse::success(serde_json::json!({ "models": [], "error": format!("HTTP {}", resp.status()) }))
            }
        }
        Err(e) => {
            ApiResponse::success(serde_json::json!({ "models": [], "error": e.to_string() }))
        }
    }
}

/// Fetch models from OpenAI API (GET /v1/models)
async fn fetch_openai_models() -> ApiResponse<serde_json::Value> {
    // OpenAI requires an API key in the request header
    // We don't store OpenAI keys in the backend config, so return empty list
    // The frontend will use its static model definitions
    ApiResponse::success(serde_json::json!({ "models": [] }))
}

/// Fetch models from SiliconFlow API
async fn fetch_siliconflow_models() -> ApiResponse<serde_json::Value> {
    // SiliconFlow requires an API key; frontend has static definitions
    ApiResponse::success(serde_json::json!({ "models": [] }))
}
