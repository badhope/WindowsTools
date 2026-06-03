//! Command manifest: 12 functional areas, each with metadata used by
//! the palette and the sidebar.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use wt_core::{Error, Result};

/// A single command entry in the manifest.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ManifestItem {
    pub id: String,
    pub title: String,
    pub title_zh: String,
    pub category: String,
    pub keywords: Vec<String>,
    /// "low" | "medium" | "high"
    pub risk: String,
    pub requires_admin: bool,
    pub route: String,
}

/// The full manifest. Stored as `Arc<Manifest>` in `AppState`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Manifest {
    pub items: Vec<ManifestItem>,
}

/// Load the command manifest. Tries `manifest/commands.json` next to
/// `Cargo.toml` first; falls back to the built-in defaults on any
/// error so the UI always has at least the 12 core commands.
pub fn load() -> Manifest {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("manifest")
        .join("commands.json");
    if let Ok(b) = std::fs::read(&path) {
        match serde_json::from_slice::<Manifest>(&b) {
            Ok(m) => return m,
            Err(e) => { tracing::warn!(error = %e, "manifest parse failed, using built-in"); }
        }
    }
    builtin()
}

fn builtin() -> Manifest {
    let items = vec![
        item("dashboard",    "Dashboard",       "仪表盘",    "overview",  vec!["home","overview","system"],       "low",    false, "/"),
        item("processes",    "Processes",       "进程",      "system",   vec!["process","task","kill"],             "medium", false, "/processes"),
        item("services",     "Services",        "服务",      "system",   vec!["service","scm","start","stop"],     "high",   true,  "/services"),
        item("registry",     "Registry",        "注册表",    "system",   vec!["reg","regedit","key"],               "high",   true,  "/registry"),
        item("network",      "Network",         "网络",      "system",   vec!["net","tcp","udp","ip","dns"],        "low",    false, "/network"),
        item("disk",         "Disk",            "磁盘",      "system",   vec!["drive","volume","space","cleanup"],  "low",    false, "/disk"),
        item("startup",      "Startup",         "启动项",    "system",   vec!["boot","run","autostart"],            "medium", false, "/startup"),
        item("performance",  "Performance",     "性能",      "monitor",  vec!["perf","cpu","ram","pdh"],            "low",    false, "/performance"),
        item("hosts",        "Hosts file",      "Hosts 文件","system",   vec!["hosts","dns","block"],               "high",   true,  "/hosts"),
        item("repair",       "Repair (SFC/DISM)","系统修复",  "tools",    vec!["sfc","dism","repair","scan"],        "high",   true,  "/repair"),
        item("tasks",        "Scheduled tasks", "计划任务",  "system",   vec!["task","scheduler","cron"],            "medium", false, "/tasks"),
        item("settings",     "Settings",        "设置",      "settings", vec!["settings","prefs","config"],         "low",    false, "/settings"),
    ];
    Manifest { items }
}

fn item(
    id: &str, title: &str, title_zh: &str, category: &str,
    kw: Vec<&str>, risk: &str, admin: bool, route: &str,
) -> ManifestItem {
    ManifestItem {
        id: id.into(),
        title: title.into(),
        title_zh: title_zh.into(),
        category: category.into(),
        keywords: kw.into_iter().map(String::from).collect(),
        risk: risk.into(),
        requires_admin: admin,
        route: route.into(),
    }
}

impl Manifest {
    /// Search the manifest for entries matching `q` (case-insensitive).
    /// Returns at most `limit` results, sorted by descending score.
    pub fn search(&self, q: &str, limit: usize) -> Vec<ManifestItem> {
        let q = q.trim().to_lowercase();
        if q.is_empty() {
            return self.items.iter().take(limit).cloned().collect();
        }
        let mut scored: Vec<(i32, &ManifestItem)> = self.items.iter().map(|it| {
            let mut s = 0i32;
            if it.id.to_lowercase().contains(&q)        { s += 10; }
            if it.title.to_lowercase().contains(&q)     { s += 10; }
            if it.title_zh.contains(&q)                  { s += 10; }
            for k in &it.keywords { if k.to_lowercase().contains(&q) { s += 3; } }
            (s, it)
        }).filter(|(s, _)| *s > 0).collect();
        scored.sort_by_key(|(s, _)| -s);
        scored.into_iter().take(limit).map(|(_, it)| it.clone()).collect()
    }

    /// Look up an item by id. Returns an error if not found.
    pub fn by_id(&self, id: &str) -> Result<&ManifestItem> {
        self.items.iter().find(|i| i.id == id)
            .ok_or_else(|| Error::NotFound { resource: format!("manifest:{id}") })
    }
}

/// Convenience: wrap a `Manifest` in an `Arc` for state storage.
pub fn into_arc(m: Manifest) -> Arc<Manifest> { Arc::new(m) }
