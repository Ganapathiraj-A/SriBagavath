#!/bin/bash

# Staging Build Script
# 1. Swaps .env and google-services.json to Production
# 2. Builds APK using existing Package Name (com.bhavathpathai.app.dev) if possible, OR warns user.
# NOTE: Using Prod Config with Dev Package Name will break Google Auth.
# The user requested "point to production". 
# So we will use the PROD package name logic by NOT changing the applicationId in build.gradle, 
# BUT we need to ensure the source code points to Prod.

# Backup Dev Config
cp .env .env.dev.bak
cp android/app/google-services.json android/app/google-services.json.dev.bak

# Apply Prod Config
# We assume .env.production exists (created in plan) or we copy from ../SriBagavath/.env.production
if [ -f .env.production ]; then
    cp .env.production .env
else
    echo "Error: .env.production not found."
    exit 1
fi

# Copy Prod google-services.json
cp ../SriBagavath/google-services.json android/app/google-services.json

# Update Version Name to indicate Staging
# We'll stick to the current version but append -STAGING in the echo output or just build as is.

# Update version name/code or Package Name logic
# We MUST swap the package name in build.gradle to match the Prod google-services.json
# otherwise the build will fail with "No matching client found".
sed -i 's/com.bhavathpathai.app.dev/com.bhavathpathai.app/g' android/app/build.gradle

echo "Building Staging APK (Pointing to Production)..."

# Build
./build.sh

# Restore Dev Config
mv .env.dev.bak .env
mv android/app/google-services.json.dev.bak android/app/google-services.json

# Restore build.gradle
sed -i 's/com.bhavathpathai.app/com.bhavathpathai.app.dev/g' android/app/build.gradle

echo "---------------------------------------------------"
echo "Staging Build Complete!"
echo "APK: SriBagavathDevClean.apk"
echo "WARNING: This APK is signed with Debug key but uses Prod Config."
echo "If you have the real Prod App installed, you must uninstall it first."
echo "---------------------------------------------------"
