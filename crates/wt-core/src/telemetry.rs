//! Lightweight telemetry: counters and timers that can be exposed via IPC
//! and inspected from the UI (e.g. "show me RPC latencies").

use parking_lot::RwLock;
use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

/// A monotonic counter.
#[derive(Debug, Default)]
pub struct Counter {
    inner: RwLock<u64>,
}

impl Counter {
    /// Create a new zero counter.
    pub fn new() -> Self {
        Self::default()
    }
    /// Increment by `n`.
    pub fn inc_by(&self, n: u64) {
        *self.inner.write() += n;
    }
    /// Increment by one.
    pub fn inc(&self) {
        self.inc_by(1);
    }
    /// Read the current value.
    pub fn get(&self) -> u64 {
        *self.inner.read()
    }
}

/// A timer that keeps a moving average of the last `N` samples.
#[derive(Debug)]
pub struct Timer {
    samples: RwLock<MovingWindow>,
}

#[derive(Debug)]
struct MovingWindow {
    buf: Vec<Duration>,
    cap: usize,
    idx: usize,
    full: bool,
}

impl MovingWindow {
    fn new(cap: usize) -> Self {
        Self { buf: vec![Duration::ZERO; cap], cap, idx: 0, full: false }
    }
    fn push(&mut self, d: Duration) {
        self.buf[self.idx] = d;
        self.idx = (self.idx + 1) % self.cap;
        if self.idx == 0 {
            self.full = true;
        }
    }
    fn avg(&self) -> Duration {
        let len = if self.full { self.cap } else { self.idx.max(1) };
        let sum: Duration = self.buf.iter().take(len).sum();
        sum / len as u32
    }
    fn p95(&self) -> Duration {
        let len = if self.full { self.cap } else { self.idx };
        if len == 0 {
            return Duration::ZERO;
        }
        let mut v: Vec<Duration> = self.buf.iter().take(len).copied().collect();
        v.sort();
        v[(len * 95 / 100).min(len - 1)]
    }
}

impl Timer {
    /// Create a new timer with the given capacity for the moving window.
    pub fn new(cap: usize) -> Self {
        Self { samples: RwLock::new(MovingWindow::new(cap.max(1))) }
    }
    /// Time the closure and record the elapsed duration.
    pub fn time<F, T>(&self, f: F) -> T
    where
        F: FnOnce() -> T,
    {
        let start = Instant::now();
        let out = f();
        self.samples.write().push(start.elapsed());
        out
    }
    /// Average sample.
    pub fn avg(&self) -> Duration {
        self.samples.read().avg()
    }
    /// 95th percentile sample.
    pub fn p95(&self) -> Duration {
        self.samples.read().p95()
    }
}

/// A named collection of counters and timers.
#[derive(Debug, Default)]
pub struct Registry {
    counters: RwLock<BTreeMap<String, Arc<Counter>>>,
    timers: RwLock<BTreeMap<String, Arc<Timer>>>,
}

impl Registry {
    /// Create an empty registry.
    pub fn new() -> Self {
        Self::default()
    }
    /// Get-or-create a counter.
    pub fn counter(&self, name: &str) -> Arc<Counter> {
        if let Some(c) = self.counters.read().get(name) {
            return c.clone();
        }
        let c = Arc::new(Counter::new());
        self.counters.write().insert(name.to_string(), c.clone());
        c
    }
    /// Get-or-create a timer (window of 128).
    pub fn timer(&self, name: &str) -> Arc<Timer> {
        if let Some(t) = self.timers.read().get(name) {
            return t.clone();
        }
        let t = Arc::new(Timer::new(128));
        self.timers.write().insert(name.to_string(), t.clone());
        t
    }
    /// Snapshot all counters and timers for serialization.
    pub fn snapshot(&self) -> TelemetrySnapshot {
        let counters = self
            .counters
            .read()
            .iter()
            .map(|(k, v)| (k.clone(), v.get()))
            .collect();
        let timers = self
            .timers
            .read()
            .iter()
            .map(|(k, v)| (k.clone(), TimerSnapshot { avg_us: v.avg().as_micros() as u64, p95_us: v.p95().as_micros() as u64 }))
            .collect();
        TelemetrySnapshot { counters, timers }
    }
}

/// Serializable snapshot of a registry.
#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct TelemetrySnapshot {
    /// All counters (name -> value).
    pub counters: BTreeMap<String, u64>,
    /// All timers (name -> snapshot).
    pub timers: BTreeMap<String, TimerSnapshot>,
}

/// Serializable snapshot of a single timer.
#[derive(Debug, Default, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub struct TimerSnapshot {
    /// Average in microseconds.
    pub avg_us: u64,
    /// p95 in microseconds.
    pub p95_us: u64,
}
