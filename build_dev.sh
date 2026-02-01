#!/bin/bash

# Build Script for DEVELOPMENT Flavor
# Usage: ./build_dev.sh
set -e # Stop on error

# Ensure Java 21 is used (ignore JAVA_HOME version 17)
unset JAVA_HOME

echo "======================================"
echo "      BUILDING: DEV FLAVOR            "
echo "======================================"

# 0. Clean old assets
echo "Cleaning old assets..."
rm -rf dist
rm -rf android/app/src/main/assets/public

# 1. Setup Environment
echo "Setting up Dev Environment..."
cp .env .env.local 2>/dev/null || true # Ensure .env is used
# Vite uses .env by default for 'dev' mode, but for 'production' build mode it might verify.
# To be safe, we explicitly load variables if needed, or rely on Vite's mode.
# We will use 'vite build --mode development' to pick up .env.development if it exists, or just .env

# Restore Capacitor Config for Dev
# We need to dynamically update capacitor.config.json or trust that the Android Build config overrides it.
# Actually, capacitor.config.json is used for 'npx cap sync'.
# We should update it to match the Dev package ID so Capacitor plugins work correctly.
sed -i 's/"appId": ".*"/"appId": "com.bhavathpathai.app.dev"/g' capacitor.config.json
sed -i 's/"appName": ".*"/"appName": "Sri Bagavath Dev"/g' capacitor.config.json
sed -i 's/"androidClientId": ".*"/"androidClientId": "265576571338-an7ve40skp38mn2htpt2pt5egumtaj8d.apps.googleusercontent.com"/g' capacitor.config.json
sed -i 's/"serverClientId": ".*"/"serverClientId": "265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com"/g' capacitor.config.json

# Force Copy Google Services JSON for Dev
cp android/app/src/dev/google-services.json android/app/google-services.json

# Update Android Version from package.json
VERSION=$(node -p "require('./package.json').version")
# Extract digits and ensure it follows 20XXXX format (e.g. 2.8.337 -> 208337)
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
npm run build:dev # Ensure this script exists or use 'vite build --mode development'

# 3. Sync to Android
echo "Syncing to Capacitor..."
npx cap sync android

# 4. Build Android APK
echo "Building Android APK (Dev Flavor)..."
cd android
./gradlew assembleDevRelease
cd ..

echo "Copying APK to project root..."
cp android/app/build/outputs/apk/dev/release/app-dev-release.apk SriBagavathDevClean.apk

echo "======================================"
echo "✅ Dev Build Complete!"
echo "APK Location: SriBagavathDevClean.apk"
echo "======================================"
