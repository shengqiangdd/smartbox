use axum::response::{IntoResponse, Response};
use serde::Serialize;

/// Standard API response matching the original Node.js format:
/// `{ "success": true/false, "code": 0, "msg": "success", "data": ..., "error": "..." }`
#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub code: i32,
    pub msg: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            code: 0,
            msg: "success".into(),
            data: Some(data),
            error: None,
        }
    }

    pub fn success_msg(msg: &str) -> Self {
        Self {
            success: true,
            code: 0,
            msg: msg.into(),
            data: None,
            error: None,
        }
    }

    pub fn error(code: i32, msg: &str) -> Self {
        Self {
            success: false,
            code,
            msg: msg.into(),
            data: None,
            error: Some(msg.into()),
        }
    }
}

/// Convert any ApiResponse into an HTTP response.
impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        axum::Json(self).into_response()
    }
}
