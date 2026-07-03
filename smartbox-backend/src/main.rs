use smartbox_backend::build_app;
use smartbox_backend::config::AppConfig;
use smartbox_backend::AppState;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env if present
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "smartbox_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = AppConfig::from_env()?;
    tracing::info!("Starting SmartBox Backend on {}:{}", config.host, config.port);
    tracing::info!("Frontend dist: {:?}", config.frontend_dist);

    // Build app state
    let state = Arc::new(AppState::new(config.clone()).await?);

    // Build router
    let app = build_app(state.clone()).await;

    // ─── Idle SSH session cleanup (every 5 minutes) ───
    let cleanup_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            let mut disconnected = 0usize;
            let ids: Vec<String> = cleanup_state
                .connections
                .iter()
                .map(|e| e.key().clone())
                .collect();
            for id in ids {
                // Remove connection if session is idle or closed
                let should_remove = {
                    let entry = cleanup_state.connections.get(&id);
                    match entry {
                        Some(conn) => match &conn.session {
                            Some(session) => {
                                if !session.is_connected().await || session.is_idle_async().await {
                                    session.disconnect().await;
                                    true
                                } else {
                                    false
                                }
                            }
                            None => true, // No session, clean up entry
                        },
                        None => false,
                    }
                };
                if should_remove {
                    cleanup_state.connections.remove(&id);
                    disconnected += 1;
                }
            }
            if disconnected > 0 {
                tracing::info!("Cleaned up {} idle/disconnected SSH sessions", disconnected);
            }
        }
    });

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Listening on http://{}/", addr);

    axum::serve(listener, app)
        .await?;

    Ok(())
}
