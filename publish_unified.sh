#!/bin/bash
set -e

# Usage: ./publish_unified.sh [dev|prod]
FLAVOR=${1:-dev}

# Configuration
APP_NAME="SriBagavath"
GITHUB_OWNER="Ganapathiraj-A"
GITHUB_REPO="SriBagavath"

# Set Java 21
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"

echo "======================================"
echo "   PUBLISHING: $FLAVOR FLAVOR         "
echo "======================================"

# 1. Environment Preparation
[ ! -f .env ] && [ -f secrets/.env ] && cp secrets/.env .env
cp secrets/release-keystore.jks android/app/release-keystore.jks
cp secrets/signing.properties android/app/signing.properties

if [ "$FLAVOR" == "prod" ]; then
    echo "Prepping for Production..."
    cp secrets/google-services.prod.json android/app/src/prod/google-services.json
    cp secrets/google-services.prod.json android/app/google-services.json
    cp capacitor.config.prod.json capacitor.config.json
    VITE_BUILD_MODE="production"
    GRADLE_TASK="assembleProdRelease"
    OUTPUT_APK_PATH="android/app/build/outputs/apk/prod/release/app-prod-release.apk"
    FINAL_NAME="SriBagavath.apk"
    GH_TAG="latest"
    GH_TITLE="Latest Production Build"
else
    echo "Prepping for Development..."
    cp secrets/google-services.dev.json android/app/src/dev/google-services.json
    cp secrets/google-services.dev.json android/app/google-services.json
    cp capacitor.config.dev.json capacitor.config.json
    VITE_BUILD_MODE="development"
    GRADLE_TASK="assembleDevRelease"
    OUTPUT_APK_PATH="android/app/build/outputs/apk/dev/release/app-dev-release.apk"
    FINAL_NAME="SriBagavathDevClean.apk"
    GH_TAG="dev-clean"
    GH_TITLE="Latest Development Build"
fi

# 2. Sync Versioning
VERSION=$(node -p "require('./package.json').version")
STRIPPED_VERSION=$(echo $VERSION | tr -d '.')
VERSION_CODE="20${STRIPPED_VERSION#2}"

echo "Syncing Android Version to $VERSION (Code: $VERSION_CODE)..."
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/g" android/app/build.gradle
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/g" android/app/build.gradle

# 3. Web Build
echo "Building Web Assets ($VITE_BUILD_MODE)..."
npm run build -- --mode $VITE_BUILD_MODE

# 4. Capacitor Sync
echo "Syncing Capacitor..."
npx cap sync android

# 5. Native Build
echo "Updating strings.xml for $FLAVOR..."
MAIN_STRINGS="android/app/src/main/res/values/strings.xml"
FLAVOR_STRINGS="android/app/src/$FLAVOR/res/values/strings.xml"

if [ "$FLAVOR" == "prod" ]; then
    APP_NAME="Sri Bagavath"
    SERVER_CLIENT_ID="358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com"
else
    APP_NAME="SB Dev"
    SERVER_CLIENT_ID="265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com"
fi

update_strings() {
    local file=$1
    if [ -f "$file" ]; then
        sed -i "s|<string name=\"app_name\">.*</string>|<string name=\"app_name\">$APP_NAME</string>|g" "$file"
        if grep -q "server_client_id" "$file"; then
            sed -i "s|<string name=\"server_client_id\">.*</string>|<string name=\"server_client_id\">$SERVER_CLIENT_ID</string>|g" "$file"
        else
            sed -i "s|</resources>|    <string name=\"server_client_id\">$SERVER_CLIENT_ID</string>\n</resources>|g" "$file"
        fi
    fi
}

update_strings "$MAIN_STRINGS"
update_strings "$FLAVOR_STRINGS"

echo "Running Gradle: $GRADLE_TASK..."
cd android
./gradlew $GRADLE_TASK
cd ..

# 6. Verify & Rename
if [ ! -f "$OUTPUT_APK_PATH" ]; then
    echo "ERROR: APK not found at $OUTPUT_APK_PATH"
    exit 1
fi
cp "$OUTPUT_APK_PATH" "$FINAL_NAME"

# 7. GitHub Publish
echo "Publishing to GitHub ($GH_TAG)..."
gh release delete "$GH_TAG" --yes || echo "No existing release to delete"
gh api repos/$GITHUB_OWNER/$GITHUB_REPO/git/refs/tags/"$GH_TAG" -X DELETE || echo "No existing tag to delete"
sleep 5

# Retry mechanism for GitHub Upload
MAX_RETRIES=3
RETRY_COUNT=0
UPLOAD_SUCCESS=false

# Set flags based on flavor
GH_FLAGS="--latest"
if [ "$FLAVOR" != "prod" ]; then
    GH_FLAGS="--prerelease"
fi

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$UPLOAD_SUCCESS" = false ]; do
    echo "Upload Attempt $((RETRY_COUNT+1))..."
    if gh release create "$GH_TAG" "$FINAL_NAME" --title "$GH_TITLE" --notes "Automated $FLAVOR build of v$VERSION" $GH_FLAGS; then
        UPLOAD_SUCCESS=true
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        [ $RETRY_COUNT -lt $MAX_RETRIES ] && echo "Failed. Retrying in 10s..." && sleep 10
    fi
done

if [ "$UPLOAD_SUCCESS" = false ]; then
    echo "CRITICAL: All GitHub upload attempts failed. The APK is still available locally at: $(pwd)/$FINAL_NAME"
    exit 1
fi

echo "======================================"
echo "✅ $FLAVOR PUBLISHED SUCCESSFULLY!"
echo "URL: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/releases/download/$GH_TAG/$FINAL_NAME"
echo "======================================"
