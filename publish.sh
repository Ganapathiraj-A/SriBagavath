#!/bin/bash

# Force Java 21 for this build (Required for Capacitor v7+ / Modern Gradle)
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"

# Stop existing daemons to prevent JVM mismatch
./android/gradlew --stop

# Execute Build Script
echo "Executing Build..."
./build.sh

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

# v2.8.157 - Manual Bank Import & UI Cleanup
# 1. Implemented a manual "Import to Reconciliation" button to prevent accidental saves.
# 2. Fixed duplicate UI blocks and syntax errors in the parser.
# 3. Enabled real-time data fetching for the Bank Statement view.
# 4. Completely removed all remaining dummy data and placeholders.

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create the release
gh release create "$TAG" \
    --title "Release v$VERSION" \
    --notes "Fixed the Pull operation by implementing robust CSV parsing and numbered tracing. Pull now handles commas within quotes and verifies column alignment before updating Firestore." \
    "$APK_NAME"

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
