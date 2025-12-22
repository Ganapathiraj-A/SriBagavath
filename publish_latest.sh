#!/bin/bash

# Configuration
APP_NAME="SriBagavath"
APK_PATH="android/app/build/outputs/apk/debug/BagavathPathai-debug.apk"
OUTPUT_APK="${APP_NAME}.apk"

# Set Java 21 for Capacitor 7+
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
TAG_NAME="latest"
RELEASE_TITLE="Latest Build (Persistent URL)"
RELEASE_NOTES="This is the latest build of Sri Bagavath. The download link for this release will always remain the same."

echo "Starting Build & Publish Process for $APP_NAME..."

# 1. Build Web Assets
echo "Building Web Assets..."
npm run build
if [ $? -ne 0 ]; then
    echo "Web build failed!"
    exit 1
fi

# 2. Sync Capacitor
echo "Syncing Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "Cap Sync failed!"
    exit 1
fi

# 2.1 Ensure Java 21 in all build files
echo "Ensuring Java 21 in build files..."
grep -r "VERSION_17" android --include="*.gradle" -l | xargs -r sed -i 's/VERSION_17/VERSION_21/g'
# 2.2 Ensure google-services.json
echo "Syncing google-services.json..."
cp google-services.json android/app/google-services.json

# 3. Build APK
echo "Building APK..."
cd android
./gradlew assembleDebug
if [ $? -ne 0 ]; then
    echo "Gradle build failed!"
    exit 1
fi
cd ..

# 4. Verify APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "APK not found at $APK_PATH"
    exit 1
fi

# 5. Rename and Move to Root
cp "$APK_PATH" "$OUTPUT_APK"
echo "APK copied to $OUTPUT_APK"

# 6. Github Release Management
echo "Publishing to tag: $TAG_NAME"

# Delete existing release and tag (to ensure 'latest' moves)
gh release delete "$TAG_NAME" --yes || echo "No existing release to delete"
gh api repos/:owner/:repo/git/refs/tags/"$TAG_NAME" -X DELETE || echo "No existing tag to delete"
# Note: For permanent history, we'd use semantic versioning. For persistent URL, we reuse tag.

# Allow some time for deletion to propagate if needed (usually instant for API)
sleep 2

# Create new release
gh release create "$TAG_NAME" "$OUTPUT_APK" \
    --title "$RELEASE_TITLE" \
    --notes "$RELEASE_NOTES" \
    --prerelease=false \
    --latest

echo "---------------------------------------------------"
echo "Persistent URL:"
echo "https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG_NAME/$OUTPUT_APK"
echo "---------------------------------------------------"
