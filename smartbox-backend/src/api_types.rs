//! Typed API response structures.
//!
//! Replaces `ApiResponse<serde_json::Value>` with concrete response types
//! for compile-time API contract validation and better serialization perf.

use serde::Serialize;

// ─── Health ───

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub uptime: u64,
    pub version: &'static str,
    pub connections: ConnectionsInfo,
}

#[derive(Serialize)]
pub struct ConnectionsInfo {
    pub active: usize,
}

// ─── Auth / Token ───

#[derive(Serialize)]
pub struct TokenResponse {
    pub token: String,
    #[serde(rename = "tokenType")]
    pub token_type: String,
    #[serde(rename = "expiresIn")]
    pub expires_in: u64,
}

#[derive(Serialize)]
pub struct AuditLogsResponse {
    pub total: usize,
    pub logs: Vec<crate::app_state::AuditEntry>,
}

// ─── Hosts ───

#[derive(Serialize)]
pub struct HostEntry {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub connected: bool,
}

#[derive(Serialize)]
pub struct HostCreatedResponse {
    pub id: String,
    pub host: String,
}

// ─── Alerts ───

#[derive(Serialize)]
pub struct AlertsResponse {
    pub total: usize,
    pub alerts: Vec<crate::app_state::AlertEntry>,
}

// ─── Monitor ───

#[derive(Serialize)]
pub struct MetricsResponse {
    pub hosts: Vec<serde_json::Value>,
    pub timestamp: u64,
}

// ─── Scripts ───

#[derive(Serialize)]
pub struct ScriptEntry {
    pub id: String,
    pub name: String,
    pub command: String,
    pub group: String,
}

// ─── Logs ───

#[derive(Serialize)]
pub struct LogSource {
    pub path: String,
    pub label: String,
}

#[derive(Serialize)]
pub struct LogTailResponse {
    pub content: Option<String>,
    pub path: String,
    pub lines: usize,
    pub total_lines: usize,
}

#[derive(Serialize)]
pub struct GrepResponse {
    pub content: String,
    pub pattern: String,
    pub path: String,
}

// ─── AI ───

#[derive(Serialize)]
pub struct AiConfigResponse {
    pub enabled: bool,
    pub provider: String,
    pub models: Vec<String>,
}

#[derive(Serialize)]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    pub provider: String,
}

// ─── Connection (saved SSH connection config) ───

#[derive(Serialize)]
pub struct SavedConnectionEntry {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub group: String,
    pub created_at: String,
}

// ─── Plugins ───

#[derive(Serialize)]
pub struct PluginInstallResponse {
    pub success: bool,
    #[serde(rename = "pluginId")]
    pub plugin_id: String,
    pub message: String,
}

// ─── Vault ───

#[derive(Serialize)]
pub struct VaultEntryResponse {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─── Docker ───

#[derive(Serialize)]
pub struct DockerExecResponse {
    pub data: String,
}

/// Docker inspect returns a parsed JSON value as data
#[derive(Serialize)]
pub struct DockerInspectResponse {
    pub data: serde_json::Value,
}

/// Docker exec returns data + exit code
#[derive(Serialize)]
pub struct DockerExecResultResponse {
    pub data: String,
    #[serde(rename = "exitCode")]
    pub exit_code: u32,
}

// ─── Host Health ───

#[derive(Serialize)]
pub struct HostHealthCheckResponse {
    pub hosts: Vec<serde_json::Value>,
}
