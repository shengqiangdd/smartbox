use axum::{extract::State, Json};
use base64::Engine;
use std::sync::Arc;

use crate::app_state::AppState;
use crate::response::ApiResponse;

/// Helper: get the SSH session for a connection ID, or return an error response.
macro_rules! get_session {
    ($state:expr, $conn_id:expr) => {{
        let entry = $state.connections.get(&$conn_id);
        match entry {
            Some(conn) => match &conn.session {
                Some(s) => s.clone(),
                None => {
                    return Json(ApiResponse::error(
                        1,
                        &format!("SSH session not connected: {}", $conn_id),
                    ))
                }
            },
            None => {
                return Json(ApiResponse::error(
                    1,
                    &format!("SSH connection not found: {}", $conn_id),
                ))
            }
        }
    }};
}

/// List directory via SFTP
pub async fn sftp_list_dir(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<Vec<crate::ssh::sftp::FileEntry>>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let path = body["path"].as_str().unwrap_or(".").to_string();
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::list_directory(&session, &path).await {
        Ok(entries) => Json(ApiResponse::success(entries)),
        Err(e) => Json(ApiResponse::error(2, &e)),
    }
}

/// Upload file via SFTP (base64-encoded data)
pub async fn sftp_upload(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let remote_path = body["path"].as_str().unwrap_or("").to_string();
    let data = match body["data"].as_str() {
        Some(b64) => match base64::engine::general_purpose::STANDARD.decode(b64) {
            Ok(d) => d,
            Err(e) => {
                return Json(ApiResponse::error(
                    3,
                    &format!("Base64 decode failed: {}", e),
                ))
            }
        },
        None => return Json(ApiResponse::error(3, "Missing 'data' field (base64-encoded)")),
    };

    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::upload_file(&session, &remote_path, data).await {
        Ok(_) => Json(ApiResponse::success(())),
        Err(e) => Json(ApiResponse::error(4, &e)),
    }
}

/// Download file via SFTP (returns base64-encoded content)
pub async fn sftp_download(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let remote_path = body["path"].as_str().unwrap_or("").to_string();
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::download_file(&session, &remote_path).await {
        Ok(data) => {
            let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
            Json(ApiResponse::success(b64))
        }
        Err(e) => Json(ApiResponse::error(5, &e)),
    }
}

/// Delete file/directory via SFTP
pub async fn sftp_delete(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let path = body["path"].as_str().unwrap_or("").to_string();
    let recursive = body["recursive"].as_bool().unwrap_or(false);
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::delete_file(&session, &path, recursive).await {
        Ok(_) => Json(ApiResponse::success(())),
        Err(e) => Json(ApiResponse::error(6, &e)),
    }
}

/// Create directory via SFTP
pub async fn sftp_mkdir(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let path = body["path"].as_str().unwrap_or("").to_string();
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::create_dir(&session, &path).await {
        Ok(_) => Json(ApiResponse::success(())),
        Err(e) => Json(ApiResponse::error(7, &e)),
    }
}

/// Rename/move file or directory via SFTP
pub async fn sftp_rename(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<()>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let from = body["from"].as_str().unwrap_or("").to_string();
    let to = body["to"].as_str().unwrap_or("").to_string();
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::rename(&session, &from, &to).await {
        Ok(_) => Json(ApiResponse::success(())),
        Err(e) => Json(ApiResponse::error(8, &e)),
    }
}

/// Stat a file/directory via SFTP
pub async fn sftp_stat(
    State(state): State<Arc<AppState>>,
    Json(body): Json<serde_json::Value>,
) -> Json<ApiResponse<crate::ssh::sftp::FileEntry>> {
    let connection_id = body["connectionId"].as_str().unwrap_or("").to_string();
    let path = body["path"].as_str().unwrap_or("").to_string();
    let session = get_session!(state, connection_id);

    match crate::ssh::sftp::stat(&session, &path).await {
        Ok(entry) => Json(ApiResponse::success(entry)),
        Err(e) => Json(ApiResponse::error(9, &e)),
    }
}
