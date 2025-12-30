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

gh release create $TAG "$APK_NAME" --title "v2.8.34: Fixed Karma Vinai Title" --notes "Features:
- Corrected the title for 'Karma Vinai' to 'கர்ம வினை' (it was previously mislabeled as Agamiya Karma).
- Updated all Tamil category book titles to their Tamil equivalents.
- Added AI-generated prefaces and introductions for all 22 books."

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
