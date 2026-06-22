# Quick Log Monitor Script
# Use this to monitor app logs after installing the APK

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Super Me APK Log Monitor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if device is connected
$devices = adb devices
if ($devices -notmatch "device$") {
    Write-Host "✗ No device connected!" -ForegroundColor Red
    Write-Host "Please connect your device and enable USB debugging" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Device connected" -ForegroundColor Green
Write-Host ""

# Clear previous logs
Write-Host "Clearing previous logs..." -ForegroundColor Yellow
adb logcat -c

Write-Host "Monitoring app logs..." -ForegroundColor Green
Write-Host "Now try to login in the app" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray

# Monitor logs with filtering
adb logcat | Select-String "AuthService|LoginComponent|AuthInterceptor|chromium:I"
