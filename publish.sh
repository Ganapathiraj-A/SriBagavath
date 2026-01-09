#!/bin/bash

# Execute Build Script
echo "Executing Build..."
./build.sh

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

# v2.8.157 - Manual Bank Import & UI Cleanup
# 1. Implemented a manual "Import to Reconciliation" button to prevent accidental saves.
# 2. Fixed duplicate UI blocks and syntax errors in the parser.
# 3. Enabled real-time data fetching for the Bank Statement view.
# 4. Completely removed all remaining dummy data and placeholders.

RELEASE_TITLE="v2.8.192 - Admin UI Polish: Buttons for Receipts"
RELEASE_NOTES="# v2.8.192 - Admin UI Polish: Buttons for Receipts
This release improves the user interface of the Admin Review screen:
1. **Prominent Buttons**: Converted the text-based 'View Receipt' and 'View Registration Info' links into sleek, modern buttons with icons.
2. **Improved Hit Areas**: Larger touch targets make it easier to view receipts and details on mobile devices.
3. **UI Consistency**: Standardized button styling across the registration cards for a more professional look."
gh release create "$TAG" "$APK_NAME" --title "$RELEASE_TITLE" --notes "$RELEASE_NOTES"

echo "---------------------------------------------------"
echo "Dev Clean Build Published!"
echo "URL: https://github.com/Ganapathiraj-A/SriBagavath/releases/download/$TAG/$APK_NAME"
echo "---------------------------------------------------"
