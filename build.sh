#!/bin/bash

# Simple Build Script for Clean Dev Project
export JAVA_HOME=/usr/lib/jvm/java-1.21.0-openjdk-amd64
echo "Building Web Assets..."
npm run build

echo "Initializing Capacitor Android..."
if [ ! -d "android" ]; then
    npx cap add android
fi

echo "Syncing Capacitor..."
npx cap sync android

echo "Building Android APK..."
cd android
./gradlew assembleDebug

echo "Copying APK to project root..."
cd ..
cp android/app/build/outputs/apk/debug/app-debug.apk SriBagavathDevClean.apk

echo "---------------------------------------------------"
echo "Build Complete: SriBagavathDevClean.apk"
echo "---------------------------------------------------"
