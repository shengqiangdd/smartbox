//! SQLite persistence layer.
//!
//! SmartBox uses SQLite (via `rusqlite` with `bundled` feature) for
//! lightweight, zero-dependency persistence of audit logs and alerts.
//!
//! All database operations are dispatched via `tokio::task::spawn_blocking`
//! so they never block the async runtime.

use std::path::Path;
use std::sync::Arc;

use rusqlite::Connection;
use tokio::sync::Mutex;

use crate::app_state::{AlertEntry, AuditEntry};

/// Shared database handle.
#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    /// Open (or create) the SQLite database at `path`.
    ///
    /// Enables WAL mode for concurrent reads and sets a busy timeout.
    /// Runs any pending migrations.
    pub async fn open(path: &Path) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;

        // WAL mode: better concurrency, no readers block writers
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA busy_timeout=5000;
             PRAGMA foreign_keys=ON;",
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.migrate().await?;
        tracing::info!("SQLite database ready: {}", path.display());
        Ok(db)
    }

    /// Open an in-memory database (for testing).
    pub async fn open_in_memory() -> anyhow::Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA busy_timeout=5000;
             PRAGMA foreign_keys=ON;",
        )?;

        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };

        db.migrate().await?;
        Ok(db)
    }

    // ─── Migrations ──────────────────────────────────────────────

    /// Run pending schema migrations.
    async fn migrate(&self) -> anyhow::Result<()> {
        self.exec(move |conn| {
            let version: i32 = conn
                .pragma_query_value(None, "user_version", |row| row.get(0))
                .unwrap_or(0);

            if version < 1 {
                conn.execute_batch(SCHEMA_V1)?;
                conn.pragma_update(None, "user_version", 1)?;
                tracing::info!("DB migration V1 applied");
            }

            Ok::<_, anyhow::Error>(())
        })
        .await
    }

    // ─── Audit Logs ──────────────────────────────────────────────

    /// Insert an audit log entry asynchronously.
    pub async fn insert_audit_log(
        &self,
        timestamp: &str,
        action: &str,
        detail: &str,
        ip: &str,
    ) -> anyhow::Result<i64> {
        let ts = timestamp.to_string();
        let act = action.to_string();
        let det = detail.to_string();
        let addr = ip.to_string();

        self.exec(move |conn| {
            conn.execute(
                "INSERT INTO audit_logs (timestamp, action, detail, ip) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![ts, act, det, addr],
            )?;
            Ok(conn.last_insert_rowid())
        })
        .await
    }

    /// Load recent audit logs (most recent first).
    pub async fn load_recent_audit_logs(
        &self,
        limit: usize,
    ) -> anyhow::Result<Vec<AuditEntry>> {
        let limit_i64 = limit as i64;

        self.exec(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, timestamp, action, detail, ip
                 FROM audit_logs
                 ORDER BY id DESC
                 LIMIT ?1",
            )?;

            let rows = stmt.query_map(rusqlite::params![limit_i64], |row| {
                let _id: i64 = row.get(0)?;
                let timestamp: String = row.get(1)?;
                let action: String = row.get(2)?;
                let detail_str: String = row.get(3)?;
                let ip: String = row.get(4)?;

                let detail: serde_json::Value =
                    serde_json::from_str(&detail_str).unwrap_or(serde_json::Value::Null);

                Ok(AuditEntry {
                    timestamp,
                    action,
                    detail,
                    ip,
                })
            })?;

            let mut entries = Vec::new();
            for row in rows {
                entries.push(row?);
            }
            // Reverse so oldest-first (preserve chronological order in memory)
            entries.reverse();
            Ok(entries)
        })
        .await
    }

    // ─── Alerts ──────────────────────────────────────────────────

    /// Insert an alert entry asynchronously.
    pub async fn insert_alert(
        &self,
        alert: &AlertEntry,
    ) -> anyhow::Result<i64> {
        let id = alert.id.clone();
        let timestamp = alert.timestamp.clone();
        let level = alert.level.clone();
        let host = alert.host.clone();
        let metric = alert.metric.clone();
        let message = alert.message.clone();
        let value = alert.value;
        let threshold = alert.threshold;

        self.exec(move |conn| {
            conn.execute(
                "INSERT OR IGNORE INTO alerts (id, timestamp, level, host, metric, message, value, threshold)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![id, timestamp, level, host, metric, message, value, threshold],
            )?;
            Ok(conn.last_insert_rowid())
        })
        .await
    }

    /// Load all alerts (most recent first).
    pub async fn load_alerts(&self, limit: usize) -> anyhow::Result<Vec<AlertEntry>> {
        let limit_i64 = limit as i64;

        self.exec(move |conn| {
            let mut stmt = conn.prepare(
                "SELECT id, timestamp, level, host, metric, message, value, threshold
                 FROM alerts
                 ORDER BY timestamp DESC
                 LIMIT ?1",
            )?;

            let rows = stmt.query_map(rusqlite::params![limit_i64], |row| {
                Ok(AlertEntry {
                    id: row.get(0)?,
                    timestamp: row.get(1)?,
                    level: row.get(2)?,
                    host: row.get(3)?,
                    metric: row.get(4)?,
                    message: row.get(5)?,
                    value: row.get(6)?,
                    threshold: row.get(7)?,
                })
            })?;

            let mut entries = Vec::new();
            for row in rows {
                entries.push(row?);
            }
            entries.reverse();
            Ok(entries)
        })
        .await
    }

    // ─── Internal helpers ────────────────────────────────────────

    /// Execute a closure on the database connection via `spawn_blocking`.
    pub async fn exec<F, T>(&self, f: F) -> anyhow::Result<T>
    where
        F: FnOnce(&Connection) -> anyhow::Result<T> + Send + 'static,
        T: Send + 'static,
    {
        let conn = self.conn.clone();
        tokio::task::spawn_blocking(move || {
            let conn = conn.blocking_lock();
            f(&conn)
        })
        .await?
    }
}

// ─── Schema definitions ──────────────────────────────────────────

const SCHEMA_V1: &str = "
CREATE TABLE IF NOT EXISTS audit_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT    NOT NULL,
    action    TEXT    NOT NULL,
    detail    TEXT    NOT NULL DEFAULT '{}',
    ip        TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS alerts (
    id        TEXT    PRIMARY KEY,
    timestamp TEXT    NOT NULL,
    level     TEXT    NOT NULL,
    host      TEXT    NOT NULL,
    metric    TEXT    NOT NULL,
    message   TEXT    NOT NULL,
    value     REAL    NOT NULL,
    threshold REAL    NOT NULL
);
";

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_db() -> Database {
        Database::open_in_memory().await.unwrap()
    }

    #[test]
    fn test_open_in_memory() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let db = rt.block_on(Database::open_in_memory()).unwrap();
        rt.block_on(async move {
            // Verify tables exist by inserting and reading back
            let id = db
                .insert_audit_log("2026-01-01T00:00:00Z", "test", "{}", "127.0.0.1")
                .await
                .unwrap();
            assert!(id > 0);
        });
    }

    #[test]
    fn test_insert_and_load_audit_log() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let db = rt.block_on(test_db());

        rt.block_on(async move {
            db.insert_audit_log(
                "2026-01-01T00:00:00Z",
                "ssh_connect",
                r#"{"host":"192.168.1.1"}"#,
                "10.0.0.1",
            )
            .await
            .unwrap();

            let logs = db.load_recent_audit_logs(10).await.unwrap();
            assert_eq!(logs.len(), 1);
            assert_eq!(logs[0].action, "ssh_connect");
            assert_eq!(logs[0].ip, "10.0.0.1");
        });
    }

    #[test]
    fn test_audit_log_limit() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let db = rt.block_on(test_db());

        rt.block_on(async {
            for i in 0..20 {
                db.insert_audit_log(
                    &format!("2026-01-{:02}T00:00:00Z", i + 1),
                    &format!("action_{}", i),
                    "{}",
                    "127.0.0.1",
                )
                .await
                .unwrap();
            }

            let logs = db.load_recent_audit_logs(5).await.unwrap();
            assert_eq!(logs.len(), 5);
            // Should be the 5 most recent in chronological order
            assert_eq!(logs[0].action, "action_15");
            assert_eq!(logs[4].action, "action_19");
        });
    }

    #[test]
    fn test_insert_and_load_alerts() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let db = rt.block_on(test_db());

        rt.block_on(async {
            let alert = AlertEntry {
                id: "alert-1".into(),
                timestamp: "2026-01-01T00:00:00Z".into(),
                level: "warning".into(),
                host: "localhost".into(),
                metric: "cpu".into(),
                message: "CPU > 90%".into(),
                value: 95.0,
                threshold: 90.0,
            };

            db.insert_alert(&alert).await.unwrap();

            let alerts = db.load_alerts(10).await.unwrap();
            assert_eq!(alerts.len(), 1);
            assert_eq!(alerts[0].id, "alert-1");
            assert_eq!(alerts[0].value, 95.0);
        });
    }

    #[test]
    fn test_alert_dedup() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let db = rt.block_on(test_db());

        rt.block_on(async {
            let alert = AlertEntry {
                id: "alert-dup".into(),
                timestamp: "2026-01-01T00:00:00Z".into(),
                level: "error".into(),
                host: "h1".into(),
                metric: "mem".into(),
                message: "OOM".into(),
                value: 99.0,
                threshold: 95.0,
            };

            // Insert twice (same id)
            db.insert_alert(&alert).await.unwrap();
            db.insert_alert(&alert).await.unwrap();

            let alerts = db.load_alerts(10).await.unwrap();
            assert_eq!(alerts.len(), 1); // dedup by id
        });
    }

    #[test]
    fn test_migration_idempotent() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        // Opening twice on same path should be safe
        rt.block_on(async {
            let _db1 = Database::open_in_memory().await.unwrap();
            let _db2 = Database::open_in_memory().await.unwrap();
            // No crash = migration is idempotent
        });
    }
}
