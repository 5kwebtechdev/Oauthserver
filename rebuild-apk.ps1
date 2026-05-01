Write-Host "========================================"
Write-Host "MindfulBuddy APK Rebuild Script"
Write-Host "========================================"

# Step 1: Clean www folder
Write-Host "[1/4] Cleaning previous web build..."
if (Test-Path "www") {
    Remove-Item -Recurse -Force www
    Write-Host "Done: Cleaned www folder"
}

# Step 2: Build Angular app
Write-Host ""
Write-Host "[2/4] Building Angular app..."
npm run build -- --configuration production
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Angular build failed!"
    exit 1
}
Write-Host "Done: Angular build completed"

# Step 3: Sync with Capacitor
Write-Host ""
Write-Host "[3/4] Syncing with Capacitor..."
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: Capacitor sync failed!"
    exit 1
}
Write-Host "Done: Capacitor sync completed"

# Step 4: Build debug APK
Write-Host ""
Write-Host "[4/4] Building debug APK (this takes a few minutes)..."
Set-Location android
./gradlew clean assembleDebug
$result = $LASTEXITCODE
Set-Location ..

if ($result -ne 0) {
    Write-Host "FAILED: APK build failed!"
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "BUILD COMPLETE!"
Write-Host "APK: android\app\build\outputs\apk\debug\app-debug.apk"
Write-Host "========================================"
