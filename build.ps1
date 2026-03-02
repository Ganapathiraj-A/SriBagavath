# Unified Build Script for Sri Bagavath (Windows PowerShell)
# Usage: 
#   ./build.ps1 dev           -> Builds Development APK
#   ./build.ps1 prod          -> Builds Production APK
#   ./build.ps1 prod-aab      -> Builds Production AAB (for Play Store)

param (
    [string]$Flavor = "dev"
)

$ErrorActionPreference = "Stop"

# 1. Verification & Secrets
if (-not (Test-Path "secrets")) {
    Write-Error "ERROR: secrets directory missing. Cannot proceed."
}

# Ensure .env exists
if (-not (Test-Path ".env") -and (Test-Path "secrets/.env")) {
    Copy-Item "secrets/.env" ".env"
}

# Ensure signing credentials are in place
Copy-Item "secrets/release-keystore.jks" "android/app/release-keystore.jks" -Force
Copy-Item "secrets/signing.properties" "android/app/signing.properties" -Force

# 2. Setup Flavor Specifics
switch ($Flavor) {
    "dev" {
        Write-Host "Setting up Development Environment..." -ForegroundColor Cyan
        Copy-Item "secrets/google-services.dev.json" "android/app/src/dev/google-services.json" -Force
        Copy-Item "secrets/google-services.dev.json" "android/app/google-services.json" -Force
        Copy-Item "capacitor.config.dev.json" "capacitor.config.json" -Force
        $ViteMode = "development"
        $GradleTask = "assembleDevRelease"
        $OutputPath = "android/app/build/outputs/apk/dev/release/app-dev-release.apk"
        $FinalName = "SriBagavathDevClean.apk"
        $DisplayName = "SB Dev"
        $ServerClientId = "265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com"
        $PackageId = "com.bhavathpathai.app.dev"
    }
    "prod" {
        Write-Host "Setting up Production Environment (APK)..." -ForegroundColor Cyan
        Copy-Item "secrets/google-services.prod.json" "android/app/src/prod/google-services.json" -Force
        Copy-Item "secrets/google-services.prod.json" "android/app/google-services.json" -Force
        Copy-Item "capacitor.config.prod.json" "capacitor.config.json" -Force
        $ViteMode = "production"
        $GradleTask = "assembleProdRelease"
        $OutputPath = "android/app/build/outputs/apk/prod/release/app-prod-release.apk"
        $FinalName = "SriBagavath.apk"
        $DisplayName = "Sri Bagavath"
        $ServerClientId = "358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com"
        $PackageId = "com.bhavathpathai.app"
    }
    "prod-aab" {
        Write-Host "Setting up Production Environment (AAB)..." -ForegroundColor Cyan
        Copy-Item "secrets/google-services.prod.json" "android/app/src/prod/google-services.json" -Force
        Copy-Item "secrets/google-services.prod.json" "android/app/google-services.json" -Force
        Copy-Item "capacitor.config.prod.json" "capacitor.config.json" -Force
        $ViteMode = "production"
        $GradleTask = "bundleProdRelease"
        $OutputPath = "android/app/build/outputs/bundle/prodRelease/app-prod-release.aab"
        $Version = (Get-Content "package.json" | ConvertFrom-Json).version
        $FinalName = "SriBagavath_v$($Version).aab"
        $DisplayName = "Sri Bagavath"
        $ServerClientId = "358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com"
        $PackageId = "com.bhavathpathai.app"
    }
    Default {
        Write-Error "Invalid flavor: $Flavor. Use 'dev', 'prod', or 'prod-aab'"
    }
}

# 3. Version Sync
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$Version = $PackageJson.version
$Major, $Minor, $Patch = $Version.Split('.')
$VersionCode = [int]$Major * 100000 + [int]$Minor * 1000 + [int]$Patch

Write-Host "Syncing Android Version to $Version (Code: $VersionCode)..." -ForegroundColor Green
$GradleFile = "android/app/build.gradle"
$GradleContent = Get-Content $GradleFile
$GradleContent = $GradleContent -replace 'versionName ".*"', "versionName ""$Version"""
$GradleContent = $GradleContent -replace 'versionCode [0-9]*', "versionCode $VersionCode"
Set-Content $GradleFile $GradleContent

# 4. Web Build
Write-Host "Building Web Assets ($ViteMode)..." -ForegroundColor Green
npm run build -- --mode $ViteMode

# 5. Capacitor Sync
Write-Host "Syncing Capacitor..." -ForegroundColor Green
npx cap sync android

# 6. Native Strings Update
function Update-Strings($filePath) {
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $content = $content -replace '<string name="app_name">.*</string>', "<string name=`"app_name`">$DisplayName</string>"
        
        if ($content -like '*name="server_client_id"*') {
            $content = $content -replace '<string name="server_client_id">.*</string>', "<string name=`"server_client_id`">$ServerClientId</string>"
        } else {
            $content = $content -replace '</resources>', "    <string name=`"server_client_id`">$ServerClientId</string>`n</resources>"
        }

        if ($content -like '*name="custom_url_scheme"*') {
            $content = $content -replace '<string name="custom_url_scheme">.*</string>', "<string name=`"custom_url_scheme`">$PackageId</string>"
        }
        if ($content -like '*name="package_name"*') {
            $content = $content -replace '<string name="package_name">.*</string>', "<string name=`"package_name`">$PackageId</string>"
        }
        Set-Content $filePath $content
    }
}

Write-Host "Updating strings.xml for $Flavor..." -ForegroundColor Green
Update-Strings "android/app/src/main/res/values/strings.xml"
Update-Strings "android/app/src/$Flavor/res/values/strings.xml"

# 7. Native Build
Write-Host "Running Native Build: $GradleTask..." -ForegroundColor Green
Set-Location android
./gradlew.bat clean $GradleTask
Set-Location ..

# 8. Deliver Artifact
Write-Host "Delivering Artifact..." -ForegroundColor Green
if (-not (Test-Path $OutputPath)) {
    Write-Error "ERROR: Build artifact not found at $OutputPath"
}

Copy-Item $OutputPath $FinalName -Force

if ($FinalName -like "*.aab") {
    $HomePath = [System.Environment]::GetFolderPath('UserProfile')
    Write-Host "Copying AAB to $HomePath\$FinalName..." -ForegroundColor Green
    Copy-Item $FinalName "$HomePath\$FinalName" -Force
}

Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ BUILD COMPLETE: $FinalName" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# 9. Automatic Cleanup
if (Test-Path "scripts/cleanup_builds.ps1") {
    powershell -ExecutionPolicy Bypass -File ./scripts/cleanup_builds.ps1
}
