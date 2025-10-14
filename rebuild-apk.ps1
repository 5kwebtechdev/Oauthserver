# APK Rebuild and Deploy Script
# Run this after making changes to rebuild and deploy your APK

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MindfulBuddy APK Rebuild Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous build
Write-Host "[Step 1/5] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "www") {
    Remove-Item -Recurse -Force www
    Write-Host "✓ Cleaned www folder" -ForegroundColor Green
}

# Step 2: Build production
Write-Host ""
Write-Host "[Step 2/5] Building for production..." -ForegroundColor Yellow
ionic build --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Production build completed" -ForegroundColor Green

# Step 3: Sync with Capacitor
Write-Host ""
Write-Host "[Step 3/5] Syncing with Capacitor Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Capacitor sync completed" -ForegroundColor Green

# Step 4: Build APK
Write-Host ""
Write-Host "[Step 4/5] Building APK with Gradle..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Set-Location android
./gradlew clean
./gradlew assembleDebug
Set-Location ..
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ APK build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ APK built successfully" -ForegroundColor Green

# Step 5: Check if device is connected
Write-Host ""
Write-Host "[Step 5/5] Checking for connected devices..." -ForegroundColor Yellow
$devices = adb devices
if ($devices -match "device$") {
    Write-Host "✓ Device detected" -ForegroundColor Green
    Write-Host ""
    $install = Read-Host "Install APK on connected device? (Y/N)"
    if ($install -eq "Y" -or $install -eq "y") {
        Write-Host "Uninstalling old version..." -ForegroundColor Yellow
        adb uninstall io.ionic.starter 2>$null
        Write-Host "Installing new APK..." -ForegroundColor Yellow
        adb install android\app\build\outputs\apk\debug\app-debug.apk
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ APK installed successfully" -ForegroundColor Green
            Write-Host ""
            Write-Host "Opening logcat to monitor app..." -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
            Write-Host ""
            Start-Sleep -Seconds 2
            adb logcat -c  # Clear logs
            adb logcat | Select-String "AuthService|LoginComponent|AuthInterceptor"
        } else {
            Write-Host "✗ Installation failed!" -ForegroundColor Red
        }
    }
} else {
    Write-Host "! No device detected" -ForegroundColor Yellow
    Write-Host "APK location: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
