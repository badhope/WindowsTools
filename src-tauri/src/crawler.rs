use regex::Regex;
use reqwest::Client;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

pub async fn detect_structure(url: &str) -> Result<Value, String> {
    let html = fetch_page_html(url).await?;
    let fields = analyze_html_structure(&html);
    Ok(serde_json::json!({
        "fields": fields,
        "url": url
    }))
}

pub async fn fetch_page(url: &str, _method: &str, _render_js: bool) -> Result<String, String> {
    fetch_page_html(url).await
}

pub async fn test_extract(url: &str, fields: &[Value], _render_js: bool) -> Result<Value, String> {
    let html = fetch_page_html(url).await?;
    let data = extract_data(&html, fields)?;
    Ok(serde_json::json!({
        "task_id": "test",
        "data": data,
        "total": if !data.is_empty() { 1 } else { 0 },
        "errors": [],
        "startTime": chrono_now(),
        "endTime": chrono_now()
    }))
}

pub async fn start_crawl(
    url: &str,
    fields: &[Value],
    pagination: &Value,
    config: &Value,
    task_name: &str,
) -> Result<Value, String> {
    let start_time = chrono_now();
    let mut all_data = Vec::new();
    let mut errors = Vec::new();
    let mut current_url = url.to_string();
    let max_pages = pagination.get("maxPages").and_then(|v| v.as_u64()).unwrap_or(10) as usize;
    let pagination_enabled = pagination.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);

    for page in 0..max_pages {
        if page > 0 && !pagination_enabled {
            break;
        }

        let html = fetch_page_html(&current_url).await;
        match html {
            Ok(content) => {
                let page_data = extract_data(&content, fields)?;
                all_data.extend(page_data);

                if pagination_enabled {
                    if let Some(next_url) = find_next_page(&content, pagination) {
                        current_url = resolve_url(&current_url, &next_url);
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            Err(e) => {
                errors.push(format!("Page {} error: {}", current_url, e));
            }
        }

        if let Some(delay) = config.get("delay").and_then(|v| v.as_array()) {
            if delay.len() >= 2 {
                let min = delay[0].as_u64().unwrap_or(1);
                let max = delay[1].as_u64().unwrap_or(5);
                let wait = min + (max - min) * (rand_simple() as u64) / RAND_MAX_PART;
                tokio::time::sleep(tokio::time::Duration::from_secs(wait)).await;
            }
        }
    }

    let end_time = chrono_now();
    Ok(serde_json::json!({
        "task_id": task_name,
        "data": all_data,
        "total": all_data.len(),
        "errors": errors,
        "startTime": start_time,
        "endTime": end_time
    }))
}

fn chrono_now() -> String {
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    format!("{}", duration.as_secs())
}

async fn fetch_page_html(url: &str) -> Result<String, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    resp.text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))
}

fn analyze_html_structure(html: &str) -> Vec<Value> {
    let mut fields = Vec::new();

    let common_selectors = vec![
        ("h1", "标题1", "text"),
        ("h2", "标题2", "text"),
        ("h3", "标题3", "text"),
        ("a.title", "链接标题", "text"),
        (".title", "class=title元素", "text"),
        (".item-title", "商品标题", "text"),
        ("div.title", "div标题", "text"),
        (".price", "价格", "text"),
        ("span.price", "价格span", "text"),
        ("a[href]", "链接", "href"),
        ("img[src]", "图片", "src"),
    ];

    for (selector, name, attr) in common_selectors {
        if html.contains(selector) {
            fields.push(serde_json::json!({
                "name": name,
                "selector": selector,
                "selectorType": "css",
                "attribute": attr,
                "required": false
            }));
        }
    }

    fields
}

fn extract_data(html: &str, fields: &[Value]) -> Result<Vec<Value>, String> {
    let mut results = Vec::new();

    for field in fields {
        let selector = field.get("selector").and_then(|v| v.as_str()).unwrap_or("");
        let selector_type = field.get("selectorType").and_then(|v| v.as_str()).unwrap_or("css");
        let attribute = field.get("attribute").and_then(|v| v.as_str()).unwrap_or("text");

        if selector.is_empty() {
            continue;
        }

        let extracted = match selector_type {
            "css" => extract_css(html, selector, attribute),
            "xpath" => extract_xpath(html, selector, attribute),
            "regex" => extract_regex(html, selector),
            _ => Vec::new(),
        };

        for (idx, value) in extracted.into_iter().enumerate() {
            if results.len() <= idx {
                results.push(serde_json::Map::new().into_iter().collect::<Value>());
            }
            if let Some(obj) = results[idx].as_object_mut() {
                let name = field.get("name").and_then(|v| v.as_str()).unwrap_or("field");
                obj.insert(name.to_string(), serde_json::json!(value));
            }
        }
    }

    Ok(results)
}

fn extract_css(html: &str, selector: &str, attribute: &str) -> Vec<String> {
    let mut results = Vec::new();

    let escaped_selector = selector
        .replace(".", r"\.")
        .replace("#", r"\#")
        .replace("[", r"\[")
        .replace("]", r"\]");

    if attribute == "text" {
        let tag_re = Regex::new(&format!(r"<(\w+)[^>]*class\s*=\s*[\"'][^\"']*{}[^\"']*[\"'][^>]*>([^<]+)<", escaped_selector)).ok();
        if let Some(re) = tag_re {
            for cap in re.captures_iter(html) {
                if let Some(text) = cap.get(2) {
                    let value = text.as_str().trim().to_string();
                    if !value.is_empty() {
                        results.push(value);
                    }
                }
            }
        }

        if results.is_empty() {
            let simple_re = Regex::new(&format!(r"<(\w+)[^>]*>([^<]{})[^<]*</\1>", escaped_selector)).ok();
            if let Some(re) = simple_re {
                for cap in re.captures_iter(html) {
                    if let Some(text) = cap.get(2) {
                        let value = text.as_str().trim().to_string();
                        if !value.is_empty() {
                            results.push(value);
                        }
                    }
                }
            }
        }
    } else if attribute == "href" || attribute == "src" {
        let attr_re = Regex::new(&format!(r#"<a[^>]+class\s*=\s*["'][^"']*{}[^"']*["'][^>]+href\s*=\s*["']([^"']+)["']"#, escaped_selector.replace("\\", ""))).ok();
        if let Some(re) = attr_re {
            for cap in re.captures_iter(html) {
                if let Some(href) = cap.get(1) {
                    results.push(href.as_str().to_string());
                }
            }
        }
    }

    results
}

fn extract_xpath(_html: &str, _selector: &str, _attribute: &str) -> Vec<String> {
    vec![]
}

fn extract_regex(html: &str, pattern: &str) -> Vec<String> {
    let mut results = Vec::new();
    if let Ok(re) = Regex::new(pattern) {
        for cap in re.captures_iter(html) {
            if let Some(m) = cap.get(1) {
                results.push(m.as_str().to_string());
            } else if let Some(m) = cap.get(0) {
                results.push(m.as_str().to_string());
            }
        }
    }
    results
}

fn find_next_page(html: &str, pagination: &Value) -> Option<String> {
    let selector = pagination.get("selector").and_then(|v| v.as_str()).unwrap_or("");
    if selector.is_empty() {
        return None;
    }

    let escaped = selector.replace(".", r"\.").replace("#", r"\#");
    let href_re = Regex::new(&format!(r#"href\s*=\s*["']([^"']+)["'][^>]*>"#)).ok()?;

    let link_re = Regex::new(&format!(r#"<a[^>]+class\s*=\s*["'][^"']*{}[^"']*["'][^>]*href\s*=\s*["']([^"']+)["']"#, escaped.replace("\\", ""))).ok();

    if let Some(re) = link_re {
        for cap in re.captures_iter(html) {
            if let Some(m) = cap.get(1) {
                return Some(m.as_str().to_string());
            }
        }
    }

    None
}

fn resolve_url(base: &str, next: &str) -> String {
    if next.starts_with("http") {
        next.to_string()
    } else if next.starts_with("/") {
        if let Ok(base_parsed) = url::Url::parse(base) {
            if let Some(host) = base_parsed.host_str() {
                return format!("{}://{}{}", base_parsed.scheme(), host, next);
            }
        }
        next.to_string()
    } else {
        let base_parts: Vec<&str> = base.rsplitn(2, '/').collect();
        if base_parts.len() >= 2 {
            format!("{}/{}", base_parts[1], next)
        } else {
            next.to_string()
        }
    }
}

static RAND_MAX_PART: u32 = 32768;

fn rand_simple() -> u32 {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().subsec_nanos();
    nanos % RAND_MAX_PART
}

pub fn export_data(data: &[serde_json::Value], format: &str, file_name: &str) -> serde_json::Value {
    serde_json::json!({
        "format": format,
        "fileName": file_name,
        "count": data.len(),
        "status": "ready"
    })
}
