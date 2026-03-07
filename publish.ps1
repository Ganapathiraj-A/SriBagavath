# Unified Publishing Script for Sri Bagavath (Windows PowerShell)
# Usage: ./publish.ps1 [dev|prod|prod-aab]

param (
    [string]$Flavor = "dev"
)

$ErrorActionPreference = "Stop"

$GithubOwner = "Ganapathiraj-A"
$GithubRepo = "SriBagavath"

Write-Host "======================================" -ForegroundColor Magenta
Write-Host "   PUBLISHING: $Flavor                " -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

# 1. Run the appropriate build
Write-Host "Starting Build..." -ForegroundColor Cyan
./build.ps1 $Flavor

# 2. Extract Metadata
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$Version = $PackageJson.version
$DoTagging = $false

switch ($Flavor) {
    "dev" {
        $ArtifactName = "SriBagavathDevClean.apk"
        $GhTag = "dev-clean"
        $GhTitle = "Development Build v$Version"
        $GhFlags = "--prerelease"
    }
    "prod" {
        $ArtifactName = "SriBagavath.apk"
        $GhTag = "latest"
        $GhTitle = "Production Build (APK) v$Version"
        $GhFlags = "--latest"
        $DoTagging = $true
    }
    "prod-aab" {
        $ArtifactName = "SriBagavath_v$($Version).aab"
        $GhTag = "playstore-latest"
        $GhTitle = "Production Bundle (AAB) v$VERSION"
        $GhFlags = "--latest"
        $DoTagging = $true
    }
    Default {
        Write-Error "Invalid flavor for publishing: $Flavor. Use 'dev', 'prod', or 'prod-aab'."
    }
}

Write-Host "Verifying Build Artifact..." -ForegroundColor Cyan
if (-not (Test-Path $ArtifactName)) {
    Write-Error "ERROR: $ArtifactName not found. Build might have failed."
}

# 3. Git Tagging (for production)
if ($DoTagging) {
    if ($Flavor -eq "prod-aab") {
        $VersionTag = "playstore-v$($Version)"
        $CommitMsg = "play store update version v$Version"
    } else {
        $VersionTag = "v$($Version)-$($Flavor)"
        $CommitMsg = "chore: release $VersionTag"
    }
    
    Write-Host "Creating versioned tag: $VersionTag" -ForegroundColor Cyan
    git add .
    git commit -m "$CommitMsg" 2>$null
    git tag -a "$VersionTag" -m "Release $VersionTag"
    git push origin main "$VersionTag"
}

# 4. GitHub Publish
Write-Host "Publishing to GitHub ($GhTag)..." -ForegroundColor Cyan

# Delete existing generic release/tag (GitHub CLI required)
try {
    gh release delete "$GhTag" --yes
} catch {
    Write-Host "No existing release to delete"
}

try {
    gh api repos/$GithubOwner/$GithubRepo/git/refs/tags/"$GhTag" -X DELETE
} catch {
    Write-Host "No existing tag to delete"
}

Start-Sleep -Seconds 5

# Create new generic release (latest/dev-clean) and upload
gh release create "$GhTag" "$ArtifactName" `
    --title "$GhTitle" `
    --notes "Automated $Flavor release of v$Version." `
    $GhFlags

Write-Host "======================================" -ForegroundColor Magenta
Write-Host "✅ $Flavor PUBLISHED SUCCESSFULLY!" -ForegroundColor Magenta
Write-Host "Artifact: $ArtifactName" -ForegroundColor Magenta
Write-Host "URL: https://github.com/$GithubOwner/$GithubRepo/releases/download/$GhTag/$ArtifactName" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
