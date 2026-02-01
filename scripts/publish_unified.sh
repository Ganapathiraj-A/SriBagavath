#!/bin/bash

# Configuration
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"
DATE=$(date +%Y%m%d)

# Source Paths (from flavors)
PROD_APK_SRC="android/app/build/outputs/apk/prod/release/app-prod-release.apk"
DEV_APK_SRC="android/app/build/outputs/apk/dev/release/app-dev-release.apk"

# Destination Names for Release
PROD_APK_NAME="SriBagavath_Prod_${VERSION}_${DATE}.apk"
DEV_APK_NAME="SriBagavath_Dev_${VERSION}_${DATE}.apk"

# Check if files exist
if [ ! -f "$PROD_APK_SRC" ]; then
    echo "❌ Error: Prod APK not found at $PROD_APK_SRC"
    exit 1
fi

if [ ! -f "$DEV_APK_SRC" ]; then
    echo "❌ Error: Dev APK not found at $DEV_APK_SRC"
    exit 1
fi

echo "Preparing Release $TAG..."

# Copy to temp names for uploading
cp "$PROD_APK_SRC" "$PROD_APK_NAME"
cp "$DEV_APK_SRC" "$DEV_APK_NAME"

# Delete existing tag if it exists (Optional, mostly for dev iterations)
# gh release delete "$TAG" --yes 2>/dev/null || true
# git tag -d "$TAG" 2>/dev/null || true
# git push origin ":refs/tags/$TAG" 2>/dev/null || true

# Create Release
echo "Uploading to GitHub..."
gh release create "$TAG" \
    "$PROD_APK_NAME" \
    "$DEV_APK_NAME" \
    --title "Release $TAG (Unified)" \
    --notes "Unified Build containing both Production and Development flavors.
    
    📱 **Production:** $PROD_APK_NAME
    🛠 **Development:** $DEV_APK_NAME" \
    --generate-notes

# Cleanup
rm "$PROD_APK_NAME"
rm "$DEV_APK_NAME"

echo "✅ Published Successfully!"
echo "Release URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/tag/$TAG"
