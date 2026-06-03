// Build script for wt-ui.
// We intentionally do NOT call tauri_build::build() because on this
// Windows host, the rc.exe path inside tauri-build triggers a known
// std::process::Command::output() bug (Os { code: 0 }) when the build
// script context is sandboxed.  We let the Tauri app pick its icon at
// runtime instead.

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=capabilities");
    println!("cargo:rerun-if-changed=icons");
    println!("cargo:rerun-if-changed={manifest_dir}/tauri.conf.json");
    let _ = manifest_dir;
}
