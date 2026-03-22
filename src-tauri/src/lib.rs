use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

mod crawler;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Field {
    pub id: String,
    pub name: String,
    pub selector: String,
    #[serde(rename = "selectorType")]
    pub selector_type: String,
    pub attribute: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlConfig {
    pub method: String,
    pub headers: std::collections::HashMap<String, String>,
    pub proxy: Option<String>,
    pub delay: Vec<u32>,
    #[serde(rename = "maxRetries")]
    pub max_retries: u32,
    pub timeout: u32,
    #[serde(rename = "renderJs")]
    pub render_js: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationConfig {
    pub enabled: bool,
    pub selector: String,
    #[serde(rename = "selectorType")]
    pub selector_type: String,
    #[serde(rename = "maxPages")]
    pub max_pages: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrawlResult {
    pub task_id: String,
    pub data: Vec<serde_json::Value>,
    pub total: usize,
    pub errors: Vec<String>,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: String,
}

pub struct AppState {
    pub crawl_paused: Mutex<bool>,
    pub crawl_stopped: Mutex<bool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            crawl_paused: Mutex::new(false),
            crawl_stopped: Mutex::new(false),
        }
    }
}

#[tauri::command]
async fn detect_page_structure(url: String) -> Result<String, String> {
    let result = crawler::detect_structure(&url).await?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_page(url: String, method: String, render_js: bool) -> Result<String, String> {
    crawler::fetch_page(&url, &method, render_js).await
}

#[tauri::command]
async fn test_extract(
    url: String,
    fields: Vec<Field>,
    render_js: bool,
) -> Result<CrawlResult, String> {
    let fields_refs: Vec<serde_json::Value> = fields.iter().map(|f| {
        serde_json::json!({
            "name": f.name,
            "selector": f.selector,
            "selectorType": f.selector_type,
            "attribute": f.attribute,
            "required": f.required
        })
    }).collect();

    crawler::test_extract(&url, &fields_refs, render_js).await
}

#[tauri::command]
async fn start_crawl(
    url: String,
    fields: Vec<Field>,
    pagination: PaginationConfig,
    config: CrawlConfig,
    task_name: String,
    state: State<'_, AppState>,
) -> Result<CrawlResult, String> {
    *state.crawl_paused.lock().unwrap() = false;
    *state.crawl_stopped.lock().unwrap() = false;

    let fields_json: Vec<serde_json::Value> = fields.iter().map(|f| {
        serde_json::json!({
            "name": f.name,
            "selector": f.selector,
            "selectorType": f.selector_type,
            "attribute": f.attribute,
            "required": f.required
        })
    }).collect();

    let pagination_json = serde_json::json!({
        "enabled": pagination.enabled,
        "selector": pagination.selector,
        "selectorType": pagination.selector_type,
        "maxPages": pagination.max_pages
    });

    let config_json = serde_json::json!({
        "method": config.method,
        "headers": config.headers,
        "proxy": config.proxy,
        "delay": config.delay,
        "maxRetries": config.max_retries,
        "timeout": config.timeout,
        "renderJs": config.render_js
    });

    crawler::start_crawl(&url, &fields_json, &pagination_json, &config_json, &task_name).await
}

#[tauri::command]
fn pause_crawl(state: State<'_, AppState>) -> Result<(), String> {
    *state.crawl_paused.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
fn stop_crawl(state: State<'_, AppState>) -> Result<(), String> {
    *state.crawl_stopped.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
async fn export_data(format: String, file_name: String) -> Result<String, String> {
    let result = crawler::export_data(&[], &format, &file_name);
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    log::info!("Starting VisualSpider application");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            detect_page_structure,
            fetch_page,
            test_extract,
            start_crawl,
            pause_crawl,
            stop_crawl,
            export_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
