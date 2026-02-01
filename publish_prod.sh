#!/bin/bash

# Force Java 21 for this build
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
set -e # Stop on any error

# 0. Clean old results
echo "Cleaning root APK..."
rm -f SriBagavathProdClean.apk
./android/gradlew --stop

# Execute Build Script
echo "Executing Production Build..."
./build_prod.sh

# NEW: Copy the freshly built APK to the root directory
# (Handled by build_prod.sh now, but we verify here)
APK_NAME="SriBagavathProdClean.apk"
TAG="prod-clean"

echo "Verifying APK..."
if [ ! -f "$APK_NAME" ]; then
    echo "Error: $APK_NAME not found!"
    exit 1
fi

echo "Publishing to tag: $TAG"
gh release delete $TAG --yes || true
git tag -d $TAG || true
git push origin :refs/tags/$TAG || true

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create the release
gh release create "$TAG" \
    --title "Production Release v$VERSION" \
    --notes "v$VERSION Production Update: 
1. **GPay Share Fix**: Restored stable screenshot sharing flow.
2. **Environment**: Production flavor build for validation." \
    "$APK_NAME"

echo "---------------------------------------------------"
echo "Production Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
