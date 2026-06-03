//! `wt-service` binary entry point.
//!
//! Subcommands:
//! - `run`         — start the SCM-hosted service (called by Windows SCM, not directly)
//! - `foreground`  — run the named-pipe server in this console (for dev / debug)
//! - `install`     — register the service with the SCM
//! - `uninstall`   — unregister the service
//! - `start`       — `sc start WindowsToolsService`
//! - `stop`        — `sc stop WindowsToolsService`

use clap::{Parser, Subcommand};
use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Command;

#[derive(Parser, Debug)]
#[command(name = "wt-service", version, about = "WindowsTools SYSTEM service")]
struct Cli {
    #[command(subcommand)]
    cmd: Option<Cmd>,
}

#[derive(Subcommand, Debug)]
enum Cmd {
    /// Called by the Windows Service Control Manager.
    Run,
    /// Run the pipe server in the foreground (for dev).
    Foreground,
    /// Register the service with the SCM.
    Install,
    /// Unregister the service.
    Uninstall,
    /// Start the service (equivalent to `sc start`).
    Start,
    /// Stop the service (equivalent to `sc stop`).
    Stop,
}

fn main() {
    init_tracing();
    let cli = Cli::parse();
    let cmd = cli.cmd.unwrap_or(Cmd::Run);
    let r = match cmd {
        Cmd::Run => {
            if let Err(e) = wt_service::run_scm() {
                eprintln!("SCM dispatcher failed: {e}");
                std::process::exit(1);
            }
            Ok(())
        }
        Cmd::Foreground => {
            // Skip SCM, just run the pipe server in this process.
            wt_service::run_foreground()
        }
        Cmd::Install => wt_service::install_service().map_err(|e| e.to_string()),
        Cmd::Uninstall => wt_service::uninstall_service().map_err(|e| e.to_string()),
        Cmd::Start => run_sc(&["start", wt_service::SERVICE_NAME]),
        Cmd::Stop => run_sc(&["stop", wt_service::SERVICE_NAME]),
    };
    if let Err(e) = r {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}

fn run_sc(args: &[&str]) -> Result<(), String> {
    let exe = locate_sc().ok_or_else(|| "sc.exe not found".to_string())?;
    let out = Command::new(exe).args(args).output().map_err(|e| e.to_string())?;
    io::stdout().write_all(&out.stdout).ok();
    io::stderr().write_all(&out.stderr).ok();
    if !out.status.success() { return Err(format!("sc exited {:?}", out.status.code())); }
    Ok(())
}

fn locate_sc() -> Option<PathBuf> {
    let sys = std::env::var("SystemRoot").ok()?;
    let p = PathBuf::from(sys).join("System32").join("sc.exe");
    if p.exists() { Some(p) } else { None }
}

fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_target(false)
        .try_init();
}
