//! `wt-agent` binary entry point.
//!
//! Modes:
//! - (default) — run the stdio JSON-RPC loop, serving the calling Tauri host.
//! - `serve`   — same, but with extra logging (for debugging).
//! - `install` — install the Windows service (via the same binary as wt-service).
//! - `uninstall`
//! - `status`  — print whether the service is running.
//! - `version` — print version.
//!
//! The agent never starts a GUI. It is started by `wt-ui` as a child process
//! and its lifetime is tied to the UI.

use clap::Parser;
use std::process::ExitCode;

#[derive(Parser, Debug)]
#[command(name = "wt-agent", version, about = "WindowsTools user-mode agent")]
struct Cli {
    #[command(subcommand)]
    cmd: Option<Cmd>,
}

#[derive(clap::Subcommand, Debug)]
enum Cmd {
    /// Run the JSON-RPC server on stdio (default).
    Serve,
    /// Print whether the SYSTEM service is running.
    Status,
    /// Launch the SYSTEM service via `sc start`.
    StartService,
    /// Stop the SYSTEM service.
    StopService,
}

fn main() -> ExitCode {
    init_tracing();
    let cli = Cli::parse();
    let r = match cli.cmd.unwrap_or(Cmd::Serve) {
        Cmd::Serve => wt_agent::run_stdio_loop(),
        Cmd::Status => status(),
        Cmd::StartService => start_service(),
        Cmd::StopService => stop_service(),
    };
    match r {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("agent: {e}");
            ExitCode::from(1)
        }
    }
}

fn status() -> wt_core::Result<()> {
    let running = sc_query_state(wt_agent::SERVICE_NAME)?;
    println!("service {}: {}", wt_agent::SERVICE_NAME, if running { "RUNNING" } else { "STOPPED" });
    Ok(())
}

fn start_service() -> wt_core::Result<()> {
    let out = std::process::Command::new("sc.exe")
        .args(["start", wt_agent::SERVICE_NAME])
        .output()
        .map_err(|e| wt_core::Error::Other(format!("sc start: {e}")))?;
    print!("{}", String::from_utf8_lossy(&out.stdout));
    eprint!("{}", String::from_utf8_lossy(&out.stderr));
    Ok(())
}

fn stop_service() -> wt_core::Result<()> {
    let out = std::process::Command::new("sc.exe")
        .args(["stop", wt_agent::SERVICE_NAME])
        .output()
        .map_err(|e| wt_core::Error::Other(format!("sc stop: {e}")))?;
    print!("{}", String::from_utf8_lossy(&out.stdout));
    eprint!("{}", String::from_utf8_lossy(&out.stderr));
    Ok(())
}

fn sc_query_state(name: &str) -> wt_core::Result<bool> {
    let out = std::process::Command::new("sc.exe")
        .args(["query", name])
        .output()
        .map_err(|e| wt_core::Error::Other(format!("sc query: {e}")))?;
    let s = String::from_utf8_lossy(&out.stdout);
    Ok(s.lines().any(|l| l.contains("RUNNING")))
}

fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("warn")))
        .with_target(false)
        .with_writer(std::io::stderr)
        .try_init();
}
