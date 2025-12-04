# PowerShell script to kill process on port 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($process) {
    Stop-Process -Id $process -Force
    Write-Host "✅ Killed process on port 3000 (PID: $process)" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No process found on port 3000" -ForegroundColor Yellow
}

