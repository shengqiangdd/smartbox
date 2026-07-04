use std::sync::Arc;
use std::path::PathBuf;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

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

#[tokio::test]
async fn test_health_endpoint_returns_200() {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_404_for_nonexistent_api() {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/nonexistent")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_cors_headers_present() {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state));

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .header("Origin", "http://example.com")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        response.headers().contains_key("access-control-allow-origin"),
        "CORS header should be present"
    );
}

#[tokio::test]
async fn test_auth_middleware_blocks_unauthenticated() {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state));

    // Plugins endpoint requires auth
    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/plugins")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "Protected routes should return 401 without auth token"
    );
}

#[tokio::test]
async fn test_auth_middleware_allows_authenticated() {
    let config = test_config();
    let state = AppState::new(config).await.expect("Failed to create AppState");
    let app = smartbox_backend::build_app(Arc::new(state));

    // Get a valid JWT token from the health endpoint
    // First get a ws-token to use
    let token = smartbox_backend::utils::jwt::JwtService::new(
        &config.jwt_secret,
    )
    .create_token("127.0.0.1", "test-session")
    .expect("Failed to create JWT token");

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/ai/config")
                .header("Authorization", format!("Bearer {}", token))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    // With valid JWT, should not get 401 (might be 200 or 404 depending on config)
    assert_ne!(
        response.status(),
        StatusCode::UNAUTHORIZED,
        "Authenticated requests should not be blocked"
    );
}
