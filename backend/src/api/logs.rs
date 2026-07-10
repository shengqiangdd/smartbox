use axum::{extract::State, Json};
use std::sync::Arc;

use crate::api_types::{GrepResponse, LogScanResult, LogSource, LogTailResponse};
use crate::app_state::AppState;
use crate::response::ApiResponse;

fn get_session(state: &Arc<AppState>, connection_id: &str) -> Option<Arc<crate::ssh::SshSession>> {
    if !connection_id.is_empty() {
        state.connections.get(connection_id).and_then(|c| c.session.clone())
    } else {
        state.connections.iter().next().and_then(|e| e.value().session.clone())
    }
}

/// Helper: 尝试读取日志文件，自动降级 sudo
async fn read_log_file(session: &crate::ssh::SshSession, path: &str, cmd_builder: impl Fn(&str) -> String) -> Option<String> {
    let direct = cmd_builder(path);
    if let Ok(Ok((stdout, _, code))) = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        session.exec(&direct),
    ).await {
        if code == 0 && !stdout.trim().is_empty() {
            return Some(stdout);
        }
    }
    // fallback: sudo
    let sudo_cmd = format!("sudo -n sh -c '{}'", direct.replace('\'', "'\\''"));
    if let Ok(Ok((stdout, _, code))) = tokio::time::timeout(
        std::time::Duration::from_secs(15),
        session.exec(&sudo_cmd),
    ).await {
        if code == 0 && !stdout.trim().is_empty() {
            return Some(stdout);
        }
    }
    None
}

/// List available log sources (POST /api/logs/list-sources)
pub async fn list_sources(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<Vec<LogSource>> {
    let connection_id = body.get("connectionId").and_then(|v| v.as_str()).unwrap_or("");
    let session = get_session(&state, connection_id);

    let mut sources: Vec<LogSource> = Vec::new();

    if let Some(s) = session {
        // 简单直接：用 find 发现所有日志文件
        let cmd = concat!(
            "find /var/log -maxdepth 3 -type f \\( -name '*.log' -o -name '*.log.*' -o -name 'syslog' -o -name 'messages' -o -name 'auth.log' -o -name 'secure' -o -name 'kern.log' -o -name 'dmesg' -o -name 'cron.log' -o -name 'cron' -o -name 'boot.log' -o -name 'maillog' -o -name 'yum.log' -o -name 'apt/history.log' -o -name 'dpkg.log' \\) 2>/dev/null ",
            "| sort -u | head -50"
        );
        if let Ok(Ok((stdout, _, _))) = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            s.exec(cmd),
        ).await {
            for line in stdout.lines() {
                let path = line.trim().to_string();
                if !path.is_empty() && path.starts_with('/') {
                    let label = make_label(&path);
                    sources.push(LogSource { path, label });
                }
            }
        }
    } else {
        // 本地 fallback
        let common_logs = [
            ("/var/log/syslog", "System Log (syslog)"),
            ("/var/log/messages", "System Log (messages)"),
            ("/var/log/auth.log", "Authentication Log"),
            ("/var/log/kern.log", "Kernel Log"),
            ("/var/log/nginx/access.log", "Nginx Access Log"),
            ("/var/log/nginx/error.log", "Nginx Error Log"),
            ("/var/log/apache2/access.log", "Apache Access Log"),
            ("/var/log/apache2/error.log", "Apache Error Log"),
        ];
        for (path, label) in &common_logs {
            if std::path::Path::new(path).exists() {
                sources.push(LogSource { path: path.to_string(), label: label.to_string() });
            }
        }
    }

    if sources.is_empty() {
        sources.push(LogSource { path: "/var/log/syslog".into(), label: "System Log (syslog)".into() });
    }

    ApiResponse::success(sources)
}

/// Tail log file via SSH (POST /api/logs/tail)
pub async fn tail_log(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<LogTailResponse> {
    let path = body.get("path").and_then(|v| v.as_str()).unwrap_or("/var/log/syslog");
    let lines = body.get("lines").and_then(|v| v.as_u64()).unwrap_or(200) as usize;
    let connection_id = body.get("connectionId").and_then(|v| v.as_str()).unwrap_or("");

    let session = get_session(&state, connection_id);

    let content = match session {
        Some(s) => {
            let cmd = format!("tail -n {} {}", lines, shell_quote(path));
            if let Some(out) = read_log_file(&s, path, |_| cmd.clone()).await {
                out
            } else {
                // 尝试 cat（某些文件 tail 不支持，如二进制 btmp）
                let cat_cmd = format!("cat {} 2>&1 | tail -n {}", shell_quote(path), lines);
                match tokio::time::timeout(std::time::Duration::from_secs(10), s.exec(&cat_cmd)).await {
                    Ok(Ok((stdout, _, _))) if !stdout.contains("Permission denied") && !stdout.contains("No such file") => stdout,
                    _ => format!("无法读取: {}（文件不存在或无权限）", path),
                }
            }
        }
        None => "无 SSH 连接".to_string(),
    };

    let total = content.lines().count();
    ApiResponse::success(LogTailResponse {
        content: Some(content),
        path: path.to_string(),
        lines: total,
        total_lines: total,
    })
}

/// Grep log file via SSH (POST /api/logs/grep)
pub async fn grep_log(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<GrepResponse> {
    let pattern = body.get("pattern").and_then(|v| v.as_str()).unwrap_or("");
    let path = body.get("path").and_then(|v| v.as_str()).unwrap_or("/var/log/syslog");
    let connection_id = body.get("connectionId").and_then(|v| v.as_str()).unwrap_or("");

    if pattern.is_empty() {
        return ApiResponse::error(-1, "pattern required");
    }

    let session = get_session(&state, connection_id);

    let content = match session {
        Some(s) => {
            let pat = shell_quote(pattern);
            let pth = shell_quote(path);
            let cmd = format!("grep -i {} {} 2>/dev/null | tail -200", pat, pth);
            match tokio::time::timeout(std::time::Duration::from_secs(15), s.exec(&cmd)).await {
                Ok(Ok((stdout, _, code))) if code == 0 && !stdout.trim().is_empty() => stdout,
                _ => {
                    // fallback: sudo
                    let sudo_cmd = format!("sudo -n grep -i {} {} 2>/dev/null | tail -200", pat, pth);
                    match tokio::time::timeout(std::time::Duration::from_secs(15), s.exec(&sudo_cmd)).await {
                        Ok(Ok((stdout, _, _))) => stdout,
                        _ => "未找到匹配内容或无权限读取".to_string(),
                    }
                }
            }
        }
        None => "无 SSH 连接".to_string(),
    };

    ApiResponse::success(GrepResponse { content, pattern: pattern.to_string(), path: path.to_string() })
}

/// Scan log files on remote host (POST /api/logs/scan)
/// 接收一组路径，通过 SSH 检查哪些存在并返回大小
pub async fn scan_log_sources(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> ApiResponse<Vec<LogScanResult>> {
    let connection_id = body.get("connectionId").and_then(|v| v.as_str()).unwrap_or("");
    let paths: Vec<String> = body
        .get("paths")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    if paths.is_empty() {
        return ApiResponse::success(Vec::new());
    }

    let session = get_session(&state, connection_id);

    let mut results: Vec<LogScanResult> = Vec::new();

    if let Some(s) = session {
        // 构建简单的检查脚本，每行输出 "path\tsize\treadable"
        // 先用 find 发现真实存在的文件，再与预定义列表交叉
        let mut script = String::new();
        // 1. 先执行 find 发现 /var/log 下实际存在的日志文件
        script.push_str("find /var/log -maxdepth 3 -type f \\( -name '*.log' -o -name '*.log.*' -o -name 'syslog' -o -name 'messages' -o -name 'auth.log' -o -name 'secure' -o -name 'kern.log' -o -name 'dmesg' -o -name 'boot.log' -o -name 'maillog' -o -name 'cron.log' -o -name 'cron' -o -name 'dpkg.log' -o -name 'apt.history.log' -o -name 'yum.log' -o -name 'wtmp' -o -name 'btmp' -o -name 'lastlog' \\) 2>/dev/null | while read f; do sz=$(du -sh \"$f\" 2>/dev/null | cut -f1); [ -n \"$sz\" ] && printf \"%s\\t%s\\n\" \"$f\" \"$sz\"; done\n");
        // 2. 也检查前端传来的路径
        for p in &paths {
            let ep = p.replace('\\', "\\\\").replace('"', "\\\"");
            script.push_str(&format!(
                "[ -e \"{p}\" ] && sz=$(du -sh \"{p}\" 2>/dev/null | cut -f1) && printf \"{p}\\t%s\\n\" \"${{sz:-?}}\" || true\n",
                p = ep
            ));
        }

        if let Ok(Ok((stdout, _, _))) = tokio::time::timeout(
            std::time::Duration::from_secs(15),
            s.exec(&script),
        ).await {
            let found: std::collections::HashMap<String, String> = stdout.lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split('\t').collect();
                    if parts.len() >= 2 && parts[0].starts_with('/') {
                        Some((parts[0].to_string(), parts[1].trim().to_string()))
                    } else {
                        None
                    }
                })
                .collect();

            // 对前端传来的路径标记 exists
            for path in &paths {
                if let Some(size) = found.get(path) {
                    results.push(LogScanResult { path: path.clone(), size: size.clone(), exists: true });
                } else {
                    results.push(LogScanResult { path: path.clone(), size: String::new(), exists: false });
                }
            }

            // 追加 find 发现的、不在预定义列表中的文件（作为额外发现）
            for (found_path, size) in &found {
                if !paths.iter().any(|p| p == found_path) {
                    results.push(LogScanResult { path: found_path.clone(), size: size.clone(), exists: true });
                }
            }
        } else {
            for path in &paths {
                results.push(LogScanResult { path: path.clone(), size: String::new(), exists: false });
            }
        }
    } else {
        // 本地 fallback
        for path in &paths {
            if let Ok(meta) = std::fs::metadata(path) {
                let size = format_size(meta.len());
                results.push(LogScanResult { path: path.clone(), size, exists: true });
            } else {
                results.push(LogScanResult { path: path.clone(), size: String::new(), exists: false });
            }
        }
    }

    ApiResponse::success(results)
}

fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

fn make_label(path: &str) -> String {
    let name = path.rsplit('/').next().unwrap_or(path);
    // 去掉 .log 后缀和旋转后缀如 .1 .gz
    let base = name
        .strip_suffix(".log")
        .or_else(|| name.strip_suffix(".log.1"))
        .or_else(|| name.strip_suffix(".log.gz"))
        .unwrap_or(name);
    let parent = path.split('/').nth(3).unwrap_or("");
    if parent == "log" || parent.is_empty() {
        base.to_string()
    } else {
        format!("{}/{}", parent, base)
    }
}

fn format_size(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.1}G", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1}M", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.1}K", bytes as f64 / 1024.0)
    } else {
        format!("{}B", bytes)
    }
}
