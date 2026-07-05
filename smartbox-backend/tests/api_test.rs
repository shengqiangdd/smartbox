/// Integration tests for SmartBox backend API.
use std::sync::Arc;
use std::path::PathBuf;

use smartbox_backend::app_state::AppState;
use smartbox_backend::config::AppConfig;
use smartbox_backend::utils::jwt::{Claims, JwtService};

// ─── Test configuration ───

fn test_config() -> AppConfig {
    AppConfig {
        host: "127.0.0.1".to_string(),
        port: 0,
        frontend_dist: PathBuf::from("/nonexistent"),
        plugins_dir: PathBuf::from("/nonexistent/plugins"),
        cors_origins: vec![],
        openrouter_api_key: None,
        jwt_secret: "test-secret-not-for-production".to_string(),
        vault_key: None,
        database_url: None,
        log_level: "error".to_string(),
    }
}

async fn build_test_state() -> Arc<AppState> {
    Arc::new(
        AppState::new(test_config())
            .await
            .expect("Failed to create AppState"),
    )
}

// ─── Unit tests (no HTTP server) ───

#[test]
fn test_app_state_creation() {
    let config = test_config();
    tokio::runtime::Runtime::new()
        .unwrap()
        .block_on(async {
            let state = AppState::new(config).await.expect("AppState creation");
            assert!(state.connections.is_empty());
            assert!(state.docker_clients.is_empty());
            assert!(state.ws_tokens.is_empty());
        });
}

#[test]
fn test_jwt_roundtrip() {
    let jwt = JwtService::from_secret("test-secret").expect("JwtService::from_secret");
    let claims = Claims::new("test-subject".into(), "api+ws", 3600);
    let token = jwt.sign(&claims).expect("sign");
    let decoded = jwt.verify(&token).expect("verify");
    assert_eq!(decoded.claims.sub, "test-subject");
    assert_eq!(decoded.claims.scope, "api+ws");
}

#[tokio::test]
async fn test_build_app_creates_router() {
    let state = build_test_state().await;
    let _app = smartbox_backend::build_app(state).await;
}

// ─── HTTP server integration tests ───

/// Spawn the app on a random port and return the base URL.
/// Uses `axum::serve` to run the server in a background task.
async fn spawn_test_app() -> String {
    let state = build_test_state().await;
    let app = smartbox_backend::build_app(state).await;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind");
    let addr = listener.local_addr().unwrap();
    let base = format!("http://{}", addr);

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap_or_else(|e| {
            panic!("server error: {:?}", e);
        });
    });

    // Brief wait for server startup
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    base
}

#[tokio::test]
async fn health_check_returns_200() {
    let base = spawn_test_app().await;
    let resp = reqwest::get(format!("{}/api/health", base))
        .await
        .expect("GET /api/health");
    assert_eq!(resp.status(), 200);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert_eq!(body["status"], "ok");
}

#[tokio::test]
async fn unknown_route_returns_404() {
    let base = spawn_test_app().await;
    let resp = reqwest::get(format!("{}/api/nonexistent", base))
        .await
        .expect("GET /api/nonexistent");
    assert_eq!(resp.status(), 404);
}

#[tokio::test]
async fn plugin_endpoint_requires_auth() {
    let base = spawn_test_app().await;
    let resp = reqwest::get(format!("{}/api/plugins", base))
        .await
        .expect("GET /api/plugins");
    assert_eq!(resp.status(), 401);
}

#[tokio::test]
async fn vault_endpoint_requires_auth() {
    let base = spawn_test_app().await;
    let resp = reqwest::get(format!("{}/api/vault", base))
        .await
        .expect("GET /api/vault");
    assert_eq!(resp.status(), 401);
}

#[tokio::test]
async fn ws_token_endpoint_is_public() {
    let base = spawn_test_app().await;
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/ws-token", base))
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await
        .expect("POST /api/ws-token");
    assert!(resp.status() != 404 && resp.status() != 401, "expected 2xx, got {}", resp.status());
}
