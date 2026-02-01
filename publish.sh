#!/bin/bash

# Force Java 21 for this build (Required for Capacitor v7+ / Modern Gradle)
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
set -e # Stop on any error

# 0. Clean old results to avoid stale uploads
echo "Cleaning root APK..."
rm -f SriBagavathDevClean.apk
./android/gradlew --stop

# Execute Build Script
echo "Executing Build..."

# Build script handles version sync now

./build_dev.sh

# NEW: Copy the freshly built APK to the root directory
echo "Copying fresh APK to root..."
cp android/app/build/outputs/apk/dev/release/app-dev-release.apk SriBagavathDevClean.apk

# Publish script for Clean Dev Project
TAG="dev-clean"
APK_NAME="SriBagavathDevClean.apk"

echo "Verifying APK..."
if [ ! -f "$APK_NAME" ]; then
    echo "Error: $APK_NAME not found!"
    exit 1
fi

echo "Publishing to tag: $TAG"
gh release delete $TAG --yes || true
git tag -d $TAG || true
git push origin :refs/tags/$TAG || true

# v2.8.337 - Login & Connectivity Fixes
# 1. Fixed 12s Login Hang: Native plugin registration order adjusted.
# 2. WiFi Log Upload: Fixed PC Bridge and CORS headers.
# 3. Firestore Rules: Deployed permissive rules to both Dev and Prod projects.

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create the release
gh release create "$TAG" \
    --title "Release v$VERSION" \
    --notes "v$VERSION Update: 
1. **Login Fix**: Resolved the 12s hang during Google Sign-In.
2. **WiFi Log Upload**: Send logs directly to your PC via WiFi. Faster and more reliable.
3. **Connectivity**: Improved Firestore rule alignment across environments." \
    "$APK_NAME"

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
