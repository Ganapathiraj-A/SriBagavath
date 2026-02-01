#!/bin/bash

# SYNC PROD -> DEV (Clean)
# Run this from 'SriBagavathDevClean' to PULL changes from 'SriBagavath' (Prod)

DEV_DIR="$(pwd)"
PROD_DIR="../SriBagavath"

echo "======================================"
echo "    SYNCING: PROD -> DEV (Clean)      "
echo "======================================"
echo "WARNING: This will overwrite your Dev work with Prod code."
read -p "Are you sure? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

if [ ! -d "$PROD_DIR" ]; then
    echo "Error: Prod directory not found at $PROD_DIR"
    exit 1
fi

echo "Source: $PROD_DIR"
echo "Target: $DEV_DIR"
echo "--------------------------------------"

# 1. Sync Source Code (Recursive)
echo "Syncing 'src' folder..."
rsync -av --delete "$PROD_DIR/src/" "$DEV_DIR/src/"

# 2. Sync Public Assets
echo "Syncing 'public' folder..."
rsync -av --delete "$PROD_DIR/public/" "$DEV_DIR/public/"

# 3. Sync Application Logic Configs
echo "Syncing safe configs..."
cp "$PROD_DIR/vite.config.js" "$DEV_DIR/vite.config.js"
cp "$PROD_DIR/index.html" "$DEV_DIR/index.html"
cp "$PROD_DIR/package.json" "$DEV_DIR/package.json"

# 4. Sync Android Source (Java & Res)
echo "Syncing Android Java Source..."
rsync -av "$PROD_DIR/android/app/src/main/java/" "$DEV_DIR/android/app/src/main/java/"
rsync -av --exclude 'values/strings.xml' "$PROD_DIR/android/app/src/main/res/" "$DEV_DIR/android/app/src/main/res/"

echo "--------------------------------------"
echo "✅ Sync Complete!"
echo "Your Dev workspace is now identical to Prod (except for DB connection)."
