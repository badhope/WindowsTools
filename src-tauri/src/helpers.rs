use std::time::{Duration, Instant};

pub struct PerformanceTimer {
    start: Instant,
    operation: String,
}

impl PerformanceTimer {
    pub fn new(operation: &str) -> Self {
        log::info!("Starting operation: {}", operation);
        Self {
            start: Instant::now(),
            operation: operation.to_string(),
        }
    }

    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
}

impl Drop for PerformanceTimer {
    fn drop(&mut self) {
        let elapsed = self.start.elapsed();
        log::info!(
            "Completed operation: {} in {:.2}ms",
            self.operation,
            elapsed.as_secs_f64() * 1000.0
        );
    }
}

pub fn format_error(error: &str) -> String {
    if error.is_empty() {
        return "Unknown error".to_string();
    }
    
    let error_lower = error.to_lowercase();
    
    if error_lower.contains("access is denied") || error_lower.contains("permission denied") {
        "需要管理员权限".to_string()
    } else if error_lower.contains("not found") || error_lower.contains("does not exist") {
        "找不到指定的资源".to_string()
    } else if error_lower.contains("timeout") {
        "操作超时，请重试".to_string()
    } else if error_lower.contains("invalid") {
        "无效的参数或操作".to_string()
    } else {
        error.to_string()
    }
}

pub fn validate_path(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("路径不能为空".to_string());
    }
    
    let invalid_chars = ['<', '>', ':', '"', '|', '?', '*'];
    for c in invalid_chars {
        if path.contains(c) {
            return Err(format!("路径包含无效字符: {}", c));
        }
    }
    
    Ok(())
}

pub fn validate_port(port: u16) -> Result<(), String> {
    if port == 0 {
        return Err("端口号不能为 0".to_string());
    }
    Ok(())
}