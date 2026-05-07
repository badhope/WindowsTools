Write-Output "========================================"
Write-Output "WindowsTools 功能全面测试"
Write-Output "========================================`n"

$errors = @()

function Test-Function {
    param(
        [string]$Name,
        [string]$Description,
        [string]$Command,
        [bool]$RequiresAdmin = $false,
        [string]$ExpectedPattern = $null
    )
    
    Write-Output "测试: $Name"
    Write-Output "描述: $Description"
    Write-Output "命令: $Command"
    
    if ($RequiresAdmin) {
        Write-Output "⚠️ 需要管理员权限"
    }
    
    try {
        $result = Invoke-Expression $Command -ErrorAction Stop
        
        if ($ExpectedPattern) {
            if ($result -match $ExpectedPattern) {
                Write-Output "✅ 通过"
            } else {
                Write-Output "❌ 失败 - 输出不匹配预期"
                $errors += "$Name : 输出不匹配预期"
            }
        } else {
            if ($result) {
                Write-Output "✅ 通过"
                Write-Output "输出: $($result | Select-Object -First 3)"
            } else {
                Write-Output "⚠️ 无输出 (可能正常)"
            }
        }
    } catch {
        Write-Output "❌ 失败 - $($_.Exception.Message)"
        $errors += "$Name : $($_.Exception.Message)"
    }
    
    Write-Output ""
}

Write-Output "========== PowerShell命令执行 ==========`n"
Test-Function -Name "执行简单命令" -Description "测试基本PowerShell命令执行" `
    -Command "Get-Date" -ExpectedPattern "\d{4}/\d{2}/\d{2}"

Write-Output "========== 注册表管理 ==========`n"
Test-Function -Name "读取HKCU注册表" -Description "测试读取HKEY_CURRENT_USER" `
    -Command "Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion'"

Test-Function -Name "读取HKLM注册表" -Description "测试读取HKEY_LOCAL_MACHINE（可能需要管理员）" `
    -Command "Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion'" -RequiresAdmin

Test-Function -Name "写入HKCU注册表" -Description "测试写入HKEY_CURRENT_USER" `
    -Command "Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion' -Name 'TestValue' -Value 'Test' -ErrorAction Stop"

Test-Function -Name "写入HKLM注册表" -Description "测试写入HKEY_LOCAL_MACHINE（需要管理员）" `
    -Command "Set-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion' -Name 'TestValue' -Value 'Test' -ErrorAction Stop" -RequiresAdmin

Write-Output "========== 服务管理 ==========`n"
Test-Function -Name "获取服务列表" -Description "测试获取所有服务" `
    -Command "Get-Service | Select-Object -First 5"

Test-Function -Name "启动服务" -Description "测试启动一个非关键服务（需要管理员）" `
    -Command "Start-Service -Name 'wuauserv' -ErrorAction Stop" -RequiresAdmin

Test-Function -Name "停止服务" -Description "测试停止一个非关键服务（需要管理员）" `
    -Command "Stop-Service -Name 'wuauserv' -ErrorAction Stop" -RequiresAdmin

Write-Output "========== 进程管理 ==========`n"
Test-Function -Name "获取进程列表" -Description "测试获取所有进程" `
    -Command "Get-Process | Select-Object -First 5"

Test-Function -Name "结束进程" -Description "测试结束进程（需要管理员）" `
    -Command "Get-Process -Name 'notepad' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; Write-Output 'Done'" -RequiresAdmin

Write-Output "========== 网络功能 ==========`n"
Test-Function -Name "获取网络连接" -Description "测试netstat命令" `
    -Command "netstat -ano | Select-Object -First 10"

Test-Function -Name "刷新DNS缓存" -Description "测试ipconfig /flushdns（需要管理员）" `
    -Command "ipconfig /flushdns" -RequiresAdmin

Test-Function -Name "释放IP地址" -Description "测试ipconfig /release（需要管理员）" `
    -Command "ipconfig /release" -RequiresAdmin

Test-Function -Name "重置网络" -Description "测试netsh winsock reset（需要管理员）" `
    -Command "netsh winsock reset" -RequiresAdmin

Write-Output "========== 磁盘工具 ==========`n"
Test-Function -Name "获取磁盘信息" -Description "测试获取磁盘空间" `
    -Command "Get-Volume | Select-Object DriveLetter, Size, FreeSpace | Where-Object DriveLetter"

Test-Function -Name "磁盘检查" -Description "测试chkdsk（需要管理员）" `
    -Command "chkdsk C: /f /r" -RequiresAdmin

Test-Function -Name "碎片整理" -Description "测试Optimize-Volume（需要管理员）" `
    -Command "Optimize-Volume -DriveLetter C -Defrag" -RequiresAdmin

Write-Output "========== 系统优化 ==========`n"
Test-Function -Name "清理临时文件" -Description "测试删除临时文件" `
    -Command "Remove-Item '$env:TEMP\*' -Recurse -Force -ErrorAction SilentlyContinue; Write-Output 'Done'"

Test-Function -Name "获取启动项" -Description "测试获取启动项" `
    -Command "Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'"

Test-Function -Name "计划任务" -Description "测试获取计划任务" `
    -Command "Get-ScheduledTask | Select-Object -First 5"

Write-Output "========== 高级工具 ==========`n"
Test-Function -Name "SFC扫描" -Description "测试系统文件检查（需要管理员）" `
    -Command "sfc /scannow" -RequiresAdmin

Test-Function -Name "DISM修复" -Description "测试映像修复（需要管理员）" `
    -Command "dism /online /cleanup-image /restorehealth" -RequiresAdmin

Write-Output "========== 快捷工具 ==========`n"
Test-Function -Name "打开命令提示符" -Description "测试启动cmd" `
    -Command "Start-Process cmd -PassThru | Select-Object Id, ProcessName"

Test-Function -Name "打开设备管理器" -Description "测试启动devmgmt.msc" `
    -Command "Start-Process mmc.exe -ArgumentList 'devmgmt.msc' -PassThru | Select-Object Id, ProcessName"

Write-Output "========================================"
Write-Output "测试结果总结"
Write-Output "========================================"

if ($errors.Count -eq 0) {
    Write-Output "✅ 所有测试通过！"
} else {
    Write-Output "❌ 发现 $($errors.Count) 个问题:"
    $errors | ForEach-Object { Write-Output "  - $_" }
    Write-Output ""
    Write-Output "⚠️ 需要管理员权限的功能在非管理员模式下会失败"
    Write-Output "建议：添加'以管理员身份运行'按钮"
}

Write-Output ""
Write-Output "========================================"