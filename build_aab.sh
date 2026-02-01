#!/bin/bash

# Build Script for PRODUCTION App Bundle (.aab)
# Usage: ./build_aab.sh
set -e # Stop on error

# Ensure Java 21 is used
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"

echo "======================================"
echo "      BUILDING: PROD APP BUNDLE (.aab)"
echo "======================================"

# 0. Clean old assets
echo "Cleaning old assets..."
rm -rf dist
rm -rf android/app/src/main/assets/public
rm -f SriBagavathProd.aab

# 1. Setup Environment
echo "Setting up Prod Environment..."
sed -i 's/"appId": ".*"/"appId": "com.bhavathpathai.app"/g' capacitor.config.json
sed -i 's/"appName": ".*"/"appName": "Sri Bagavath"/g' capacitor.config.json
sed -i 's/"androidClientId": ".*"/"androidClientId": "358075696780-u652678n7j09daa3f9pl30cjtg288ioq.apps.googleusercontent.com"/g' capacitor.config.json
sed -i 's/"serverClientId": ".*"/"serverClientId": "358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com"/g' capacitor.config.json

# Force Copy Google Services JSON for Prod
cp android/app/src/prod/google-services.json android/app/google-services.json

# Update Android Version from package.json
VERSION=$(node -p "require('./package.json').version")
STRIPPED_VERSION=$(echo $VERSION | tr -d '.')
if [[ $VERSION == 2.* ]]; then
    VERSION_CODE="20${STRIPPED_VERSION#2}"
else
    VERSION_CODE=$STRIPPED_VERSION
fi
echo "Syncing Android Version to $VERSION (Code: $VERSION_CODE)..."
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/g" android/app/build.gradle
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/g" android/app/build.gradle

# 2. Build Web Assets
echo "Building Web Assets..."
npm run build

# 3. Sync to Android
echo "Syncing to Capacitor..."
npx cap sync android

# 4. Build Android App Bundle
echo "Building Android Bundle (Prod Flavor)..."
cd android
./gradlew bundleProdRelease
cd ..

echo "Copying AAB to project root..."
cp android/app/build/outputs/bundle/prodRelease/app-prod-release.aab SriBagavathProd.aab

echo "======================================"
echo "✅ App Bundle Complete!"
echo "AAB Location: SriBagavathProd.aab"
echo "======================================"
