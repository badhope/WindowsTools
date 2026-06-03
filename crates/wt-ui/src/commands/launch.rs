//! `launch.*` commands: ShellExecuteW wrapper.

use crate::types::LaunchArgs;

#[tauri::command]
pub fn launch_run(args: LaunchArgs) -> wt_core::Result<u32> {
    let verb = if args.runas { "runas" } else { "open" };
    let extra: Option<&str> = if args.args.is_empty() { None } else { Some(&args.args) };
    wt_win32::launch::shell_execute(verb, &args.path, extra)
}
