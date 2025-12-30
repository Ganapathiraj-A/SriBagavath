#!/bin/bash

# Publish script for Clean Dev Project
TAG="dev-clean"
APK_NAME="SriBagavathDevClean.apk"

echo "Verifying APK..."
if [ ! -f "$APK_NAME" ]; then
    echo "Error: $APK_NAME not found!"
    exit 1
fi

echo "Publishing to tag: $TAG"
gh release delete $TAG --yes || true
git tag -d $TAG || true
git push origin :refs/tags/$TAG || true

gh release create $TAG "$APK_NAME" --title "v2.8.36: Refined Consultation Management" --notes "Features:
- Removed the default phone number placeholder in the Consultation Management screen for a cleaner input experience."

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
