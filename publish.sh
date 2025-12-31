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

gh release create $TAG "$APK_NAME" --title "v2.8.58: Theme & Font Unification" --notes "Features:
- Program Management Hub: Unified fonts and typography across all screens (Program, Meeting, Satsang, Types, Schedule, Consultation) to match the cleaner Registration screen look.
- Program Management: Updated ProgramCard design with icon-based metadata and orange edit buttons.
- PageHeader: Standardized title font weight for a premium look."

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
