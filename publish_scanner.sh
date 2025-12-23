#!/bin/bash

# Configuration
APP_NAME="SignatureScanner"
APK_PATH="tools/SignatureScanner/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT_APK="${APP_NAME}.apk"

TAG_NAME="scanner"
RELEASE_TITLE="Signature Scanner Utility"
RELEASE_NOTES="This utility helps extract the SHA-1 fingerprint of the installed Sri Bagavath app to fix Google Sign-In issues."

echo "Starting Publish Process for $APP_NAME..."

# 1. Verify APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "APK not found at $APK_PATH. Please run build_apk.sh first."
    exit 1
fi

# 2. Rename and Move to Root
cp "$APK_PATH" "$OUTPUT_APK"
echo "APK copied to $OUTPUT_APK"

# 3. Github Release Management
echo "Publishing to tag: $TAG_NAME"

# Delete existing release and tag
gh release delete "$TAG_NAME" --yes || echo "No existing release to delete"
gh api repos/:owner/:repo/git/refs/tags/"$TAG_NAME" -X DELETE || echo "No existing tag to delete"

sleep 2

# Create new release
gh release create "$TAG_NAME" "$OUTPUT_APK" \
    --title "$RELEASE_TITLE" \
    --notes "$RELEASE_NOTES" \
    --prerelease=false

echo "---------------------------------------------------"
echo "Persistent URL for Signature Scanner:"
echo "https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG_NAME/$OUTPUT_APK"
echo "---------------------------------------------------"
