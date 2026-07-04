use std::sync::Arc;
use std::path::PathBuf;
use axum::body::Body;
use axum::http::Request;

use smartbox_backend::app_state::AppState;
use smartbox_backend::config::AppConfig;

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

/// Spawn the app on a random port and return the base URL.
async fn spawn_test_app() -> String {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state)).await;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("Failed to bind to random port");
    let addr = listener.local_addr().unwrap();
    let url = format!("http://{}", addr);

    tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });

    url
}

#[tokio::test]
async fn test_health_endpoint_returns_200() {
    let base_url = spawn_test_app().await;

    let response = reqwest::get(format!("{}/api/health", base_url))
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 200);
}

#[tokio::test]
async fn test_404_for_nonexistent_api() {
    let base_url = spawn_test_app().await;

    let response = reqwest::get(format!("{}/api/nonexistent", base_url))
        .await
        .expect("Failed to send request");

    assert_eq!(response.status(), 404);
}

#[tokio::test]
async fn test_auth_middleware_blocks_unauthenticated() {
    let base_url = spawn_test_app().await;

    let response = reqwest::get(format!("{}/api/plugins", base_url))
        .await
        .expect("Failed to send request");

    assert_eq!(
        response.status(),
        401,
        "Protected routes should return 401 without auth token"
    );
}

#[tokio::test]
async fn test_jwt_token_endpoint_accessible() {
    let base_url = spawn_test_app().await;

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/ws-token", base_url))
        .header("Content-Type", "application/json")
        .body(r#"{}"#)
        .send()
        .await
        .expect("Failed to send request");

    // Should be accessible without auth (not 401 or 404)
    assert_ne!(response.status(), 404);
    assert_ne!(response.status(), 401);
}
