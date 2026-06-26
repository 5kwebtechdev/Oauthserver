Write-Host "========================================"
Write-Host "Super Me - Release AAB Build Script"
Write-Host "========================================"

# Use JDK 21
$jdk21 = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
if (Test-Path $jdk21) {
    $env:JAVA_HOME = $jdk21
    $env:PATH = "$jdk21\bin;$env:PATH"
    Write-Host "Using JDK 21: $jdk21"
}

$rootDir = $PSScriptRoot

# Step 1: Clean www
Write-Host ""
Write-Host "[1/4] Cleaning previous web build..."
if (Test-Path "$rootDir\www") {
    Remove-Item -Recurse -Force "$rootDir\www"
}
Write-Host "Done"

# Step 2: Angular production build
Write-Host ""
Write-Host "[2/4] Building Angular app (production)..."
Set-Location $rootDir
npm run build -- --configuration production
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Angular build failed!"; exit 1 }
Write-Host "Done"

# Step 3: Capacitor sync
Write-Host ""
Write-Host "[3/4] Syncing Capacitor assets to Android..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: Capacitor sync failed!"; exit 1 }
Write-Host "Done"

# Step 4: Build signed release AAB
Write-Host ""
Write-Host "[4/4] Building signed release AAB (this takes a few minutes)..."
Set-Location "$rootDir\android"
.\gradlew clean bundleRelease
$result = $LASTEXITCODE
Set-Location $rootDir

if ($result -ne 0) {
    Write-Host "FAILED: AAB build failed!"
    exit 1
}

$aabPath = "$rootDir\android\app\build\outputs\bundle\release\app-release.aab"
Write-Host ""
Write-Host "========================================"
Write-Host "BUILD COMPLETE!"
Write-Host "AAB: $aabPath"
Write-Host ""
Write-Host "Upload this file to Google Play Console."
Write-Host "========================================"
