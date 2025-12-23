#!/bin/bash
cd /home/ganapathiraj/Code/AndroidDevelopment/SriBagavath/tools/SignatureScanner
chmod +x gradlew || true
./gradlew assembleDebug
echo "APK generated at: /home/ganapathiraj/Code/AndroidDevelopment/SriBagavath/tools/SignatureScanner/app/build/outputs/apk/debug/app-debug.apk"
