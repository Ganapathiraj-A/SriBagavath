#!/bin/bash

# SYNC DEV -> PROD
# Run this from 'SriBagavathDevClean' to push changes to 'SriBagavath' (Prod)

DEV_DIR="$(pwd)"
PROD_DIR="../SriBagavath"

echo "======================================"
echo "    SYNCING: DEV (Clean) -> PROD      "
echo "======================================"

if [ ! -d "$PROD_DIR" ]; then
    echo "Error: Prod directory not found at $PROD_DIR"
    exit 1
fi

echo "Source: $DEV_DIR"
echo "Target: $PROD_DIR"
echo "--------------------------------------"

# 1. Sync Source Code (Recursive)
echo "Syncing 'src' folder..."
rsync -av --delete "$DEV_DIR/src/" "$PROD_DIR/src/"

# 2. Sync Public Assets
echo "Syncing 'public' folder..."
rsync -av --delete "$DEV_DIR/public/" "$PROD_DIR/public/"

# 3. Sync Application Logic Configs (Safe to overwrite)
echo "Syncing safe configs..."
cp "$DEV_DIR/vite.config.js" "$PROD_DIR/vite.config.js"
cp "$DEV_DIR/index.html" "$PROD_DIR/index.html"
cp "$DEV_DIR/package.json" "$PROD_DIR/package.json"

# 4. Sync Android Source (Java & Res)
# We EXCLUDE 'strings.xml' to protect App Name and Client IDs
# We EXCLUDE 'google-services.json' (just in case it's in a weird spot, usually root)
echo "Syncing Android Java Source..."
rsync -av "$DEV_DIR/android/app/src/main/java/" "$PROD_DIR/android/app/src/main/java/"
rsync -av --exclude 'values/strings.xml' "$DEV_DIR/android/app/src/main/res/" "$PROD_DIR/android/app/src/main/res/"

echo "--------------------------------------"
echo "✅ Sync Complete!"
echo "Now go to '$PROD_DIR' and run './publish_latest.sh' to build."
