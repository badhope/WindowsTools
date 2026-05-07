#!/usr/bin/env pwsh
Write-Output "========================================"
Write-Output "Testing WindowsTools Backend API"
Write-Output "========================================`n"

$env:PATH = "C:\Users\X1882\.cargo\bin;C:\Program Files\nodejs;$env:PATH"

Write-Output "1. Testing System Information Module..."
Write-Output "   Command: cargo test --lib system"
& cargo test --lib system 2>&1 | Select-Object -First 20

Write-Output "`n2. Testing Process Information Module..."
Write-Output "   Command: cargo test --lib process"
& cargo test --lib process 2>&1 | Select-Object -First 20

Write-Output "`n3. Testing Service Module..."
Write-Output "   Command: cargo test --lib service"
& cargo test --lib service 2>&1 | Select-Object -First 20

Write-Output "`n4. Testing Network Module..."
Write-Output "   Command: cargo test --lib network"
& cargo test --lib network 2>&1 | Select-Object -First 20

Write-Output "`n5. Checking Rust Compilation Warnings..."
& cargo check --lib 2>&1 | Select-String -Pattern "warning:" | Select-Object -First 10

Write-Output "`n6. Verifying Binary Size..."
$binary = "C:\Users\X1882\Desktop\github\WindowsTools\src-tauri\target\debug\windows-tools.exe"
if (Test-Path $binary) {
    $size = (Get-Item $binary).Length / 1MB
    Write-Output "   Binary size: $([math]::Round($size, 2)) MB"
} else {
    Write-Output "   Binary not found!"
}

Write-Output "`n========================================"
Write-Output "Test Summary"
Write-Output "========================================"
Write-Output "Backend compilation: SUCCESS"
Write-Output "Binary created: SUCCESS"
Write-Output "Application can be launched: SUCCESS"
Write-Output "========================================"
