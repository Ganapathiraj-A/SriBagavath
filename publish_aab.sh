#!/bin/bash

# Force Java 21 for this build
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
set -e # Stop on any error

# Executes Build Script
echo "Executing App Bundle Build..."
chmod +x build_aab.sh
./build_aab.sh

AAB_NAME="SriBagavathProd.aab"
TAG="prod-bundle"

echo "Verifying AAB..."
if [ ! -f "$AAB_NAME" ]; then
    echo "Error: $AAB_NAME not found!"
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
    --title "App Bundle Release v$VERSION" \
    --notes "v$VERSION Play Store Ready Bundle: 
1. **Camera Permission**: Added for manual screenshot scanning.
2. **App Bundle**: Generated .aab format for Play Store submission." \
    "$AAB_NAME"

echo "---------------------------------------------------"
echo "App Bundle Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$AAB_NAME"
echo "---------------------------------------------------"
