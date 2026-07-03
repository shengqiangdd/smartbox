use std::path::PathBuf;

use dashmap::DashMap;
use parking_lot::RwLock;
use serde::Serialize;

use crate::config::AppConfig;
use crate::ssh::SshConnection;

/// Shared application state accessible from all handlers.
pub struct AppState {
    pub config: AppConfig,

    /// SSH connections: connection_id -> SshConnection
    pub connections: DashMap<String, SshConnection>,

    /// Docker clients cached by host: host -> bollard::Docker
    pub docker_clients: DashMap<String, bollard::Docker>,

    /// Alerts store (in-memory, max 500)
    pub alerts: RwLock<Vec<AlertEntry>>,

    /// Audit logs (in-memory ring buffer)
    pub audit_logs: RwLock<Vec<AuditEntry>>,

    /// WS token store for one-time tokens
    pub ws_tokens: DashMap<String, WsTokenInfo>,

    /// Plugin marketplace cache
    pub marketplace_cache: RwLock<Option<Vec<crate::models::PluginManifest>>>,

    /// Active log tail cancel tokens: "connectionId:logPath" -> oneshot Sender
    pub active_logtails: DashMap<String, tokio::sync::oneshot::Sender<()>>,
}

#[derive(Clone, Debug, Serialize)]
pub struct AlertEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub host: String,
    pub metric: String,
    pub message: String,
    pub value: f64,
    pub threshold: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct AuditEntry {
    pub timestamp: String,
    pub action: String,
    pub detail: serde_json::Value,
    pub ip: String,
}

#[derive(Clone, Debug)]
pub struct WsTokenInfo {
    pub token: String,
    pub ip: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}

impl AppState {
    pub async fn new(config: AppConfig) -> anyhow::Result<Self> {
        Ok(Self {
            connections: DashMap::new(),
            docker_clients: DashMap::new(),
            alerts: RwLock::new(Vec::with_capacity(500)),
            audit_logs: RwLock::new(Vec::with_capacity(1000)),
            ws_tokens: DashMap::new(),
            marketplace_cache: RwLock::new(None),
            active_logtails: DashMap::new(),
            config,
        })
    }

    /// Ensure a plugin directory path is safe (no path traversal)
    pub fn safe_plugin_path(&self, plugin_id: &str) -> Option<PathBuf> {
        let sanitized: String = plugin_id
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
            .collect();

        if sanitized.is_empty() || sanitized != plugin_id {
            return None;
        }

        let target = self.config.plugins_dir.join(&sanitized);
        // Ensure resolved path starts with plugins_dir
        if target.starts_with(&self.config.plugins_dir) {
            Some(target)
        } else {
            None
        }
    }

    /// Add audit log entry
    pub fn add_audit_log(&self, action: &str, detail: serde_json::Value, ip: &str) {
        let mut logs = self.audit_logs.write();
        logs.push(AuditEntry {
            timestamp: chrono::Utc::now().to_rfc3339(),
            action: action.to_string(),
            detail,
            ip: ip.to_string(),
        });
        if logs.len() > 1000 {
            logs.remove(0);
        }
    }

    /// Add alert entry
    pub fn add_alert(&self, alert: AlertEntry) {
        let mut alerts = self.alerts.write();
        alerts.push(alert);
        if alerts.len() > 500 {
            alerts.remove(0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::AppConfig;

    fn test_config() -> AppConfig {
        AppConfig {
            host: "0.0.0.0".into(),
            port: 3001,
            frontend_dist: PathBuf::from("./frontend/dist"),
            plugins_dir: PathBuf::from("/tmp/smartbox/plugins"),
            cors_origins: vec!["*".into()],
            openrouter_api_key: None,
            jwt_secret: "test-jwt-secret".into(),
            database_url: Some("sqlite::memory:".into()),
            log_level: "warn".into(),
        }
    }

    #[test]
    fn test_new_state_creates_empty_fields() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();
        assert!(state.connections.is_empty());
        assert!(state.docker_clients.is_empty());
        assert!(state.alerts.read().is_empty());
        assert!(state.audit_logs.read().is_empty());
        assert!(state.ws_tokens.is_empty());
        assert!(state.marketplace_cache.read().is_none());
        assert!(state.active_logtails.is_empty());
    }

    #[test]
    fn test_safe_plugin_path_accepts_valid() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();
        let path = state.safe_plugin_path("my-plugin_1.0");
        assert!(path.is_some());
        assert!(path.unwrap().ends_with("my-plugin_1.0"));
    }

    #[test]
    fn test_safe_plugin_path_rejects_path_traversal() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();
        assert!(state.safe_plugin_path("../../../etc/passwd").is_none());
        assert!(state.safe_plugin_path("../hack").is_none());
        assert!(state.safe_plugin_path("plugin/../../etc").is_none());
    }

    #[test]
    fn test_safe_plugin_path_rejects_empty() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();
        assert!(state.safe_plugin_path("").is_none());
    }

    #[test]
    fn test_safe_plugin_path_rejects_special_chars() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();
        assert!(state.safe_plugin_path("plugin;rm -rf /").is_none());
        assert!(state.safe_plugin_path("plugin|cat /etc/passwd").is_none());
    }

    #[test]
    fn test_add_audit_log() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();

        state.add_audit_log("ssh_connect", serde_json::json!({"host": "192.168.1.1"}), "10.0.0.1");
        let logs = state.audit_logs.read();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].action, "ssh_connect");
    }

    #[test]
    fn test_audit_log_trims_excess() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();

        for i in 0..1100 {
            state.add_audit_log("test_action", serde_json::json!({"i": i}), "127.0.0.1");
        }

        let logs = state.audit_logs.read();
        assert!(logs.len() <= 1000);
    }

    #[test]
    fn test_ws_token_store() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();

        state.ws_tokens.insert("abc".into(), WsTokenInfo {
            token: "abc".into(),
            ip: "10.0.0.1".into(),
            expires_at: chrono::Utc::now() + chrono::Duration::hours(1),
        });

        assert!(state.ws_tokens.contains_key("abc"));
        assert!(!state.ws_tokens.contains_key("nonexistent"));
    }

    #[test]
    fn test_add_alert_and_trim() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let state = rt.block_on(AppState::new(test_config())).unwrap();

        for i in 0..600 {
            state.add_alert(AlertEntry {
                id: format!("alert-{}", i),
                timestamp: chrono::Utc::now().to_rfc3339(),
                level: "info".into(),
                host: "localhost".into(),
                metric: "cpu".into(),
                message: format!("alert {}", i),
                value: i as f64,
                threshold: 100.0,
            });
        }

        let alerts = state.alerts.read();
        assert!(alerts.len() <= 500);
    }
}
