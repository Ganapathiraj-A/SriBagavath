#!/bin/bash
set -e

# Configuration
APP_NAME="SriBagavath"
GITHUB_OWNER="Ganapathiraj-A"
GITHUB_REPO="SriBagavath"
HOME_DIR="/home/ganapathiraj"

# Set Java 21
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"

echo "======================================"
echo "   BUILDING PLAY STORE AAB BUNDLE     "
echo "======================================"

# 1. Environment Preparation
echo "Prepping for Production..."
cp capacitor.config.prod.json capacitor.config.json
cp android/app/src/prod/google-services.json android/app/google-services.json

# 2. Sync Versioning from package.json
VERSION=$(node -p "require('./package.json').version")
STRIPPED_VERSION=$(echo $VERSION | tr -d '.')
VERSION_CODE="20${STRIPPED_VERSION#2}"

echo "Syncing Android Version to $VERSION (Code: $VERSION_CODE)..."
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/g" android/app/build.gradle
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/g" android/app/build.gradle

# 3. Web Build (Production)
echo "Building Web Assets (production)..."
npm run build -- --mode production

# 4. Capacitor Sync
echo "Syncing Capacitor..."
npx cap sync android

# 5. Native Bundle Build
echo "Building Android App Bundle (bundleProdRelease)..."
cd android
./gradlew bundleProdRelease
cd ..

# 6. Locate and Rename AAB
OUTPUT_AAB_PATH="android/app/build/outputs/bundle/prodRelease/app-prod-release.aab"
FINAL_AAB_NAME="SriBagavath_v${VERSION}.aab"

if [ ! -f "$OUTPUT_AAB_PATH" ]; then
    echo "ERROR: AAB not found at $OUTPUT_AAB_PATH"
    exit 1
fi

echo "Copying AAB to $HOME_DIR/$FINAL_AAB_NAME..."
cp "$OUTPUT_AAB_PATH" "$HOME_DIR/$FINAL_AAB_NAME"

# 7. Git Tagging
TAG_NAME="v${VERSION}-playstore"
echo "Tagging repository with $TAG_NAME..."
git add .
git commit -m "chore: Play Store release v$VERSION" || echo "No changes to commit"
git tag -a "$TAG_NAME" -m "Play Store release v$VERSION"
git push origin main --tags

echo "======================================"
echo "✅ PLAY STORE AAB GENERATED SUCCESSFULLY!"
echo "Location: $HOME_DIR/$FINAL_AAB_NAME"
echo "Tag: $TAG_NAME"
echo "======================================"
