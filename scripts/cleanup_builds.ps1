# Build Artifact Cleanup Script

# This script maintains only:
# - The latest 3 .aab files
# - The latest 1 .apk file

Write-Host "Starting Build Artifact Cleanup..." -ForegroundColor Cyan

# 1. Cleanup APKs
$apkFiles = Get-ChildItem "SriBagavath*.apk" | Sort-Object LastWriteTime -Descending
if ($apkFiles.Count -gt 1) {
    $toDelete = $apkFiles | Select-Object -Skip 1
    foreach ($file in $toDelete) {
        Write-Host "Deleting old APK: $($file.Name)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
    }
}

# 2. Cleanup AABs
$aabFiles = Get-ChildItem "SriBagavath*.aab" | Sort-Object LastWriteTime -Descending
if ($aabFiles.Count -gt 3) {
    $toDelete = $aabFiles | Select-Object -Skip 3
    foreach ($file in $toDelete) {
        Write-Host "Deleting old AAB: $($file.Name)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
    }
}

Write-Host "Cleanup Complete." -ForegroundColor Green
