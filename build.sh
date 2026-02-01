#!/bin/bash

set -e

# Simple Build Script for Clean Dev Project
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Building Web Assets..."
npm run build

echo "Initializing Capacitor Android..."
if [ ! -d "android" ]; then
    npx cap add android
fi

echo "Syncing Capacitor..."
npx cap sync android

echo "Building Android APK (Release)..."
cd android
./gradlew clean assembleRelease

echo "Copying APK to project root..."
cd ..
cp android/app/build/outputs/apk/prod/release/app-prod-release.apk SriBagavathDevClean.apk

echo "---------------------------------------------------"
echo "Build Complete: SriBagavathDevClean.apk"
echo "---------------------------------------------------"
