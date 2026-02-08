#!/bin/bash
set -e

# Unified Publishing Script for Sri Bagavath
# Usage: ./publish.sh [dev|prod]

FLAVOR=${1:-dev}
GITHUB_OWNER="Ganapathiraj-A"
GITHUB_REPO="SriBagavath"

echo "======================================"
echo "   PUBLISHING: $FLAVOR                "
echo "======================================"

# 1. Run the appropriate build
echo "Starting Build..."
./build.sh $FLAVOR

# 2. Extract Metadata
VERSION=$(node -p "require('./package.json').version")

case $FLAVOR in
    dev)
        ARTIFACT_NAME="SriBagavathDevClean.apk"
        GH_TAG="dev-clean"
        GH_TITLE="Development Build v$VERSION"
        GH_FLAGS="--prerelease"
        ;;
    prod)
        ARTIFACT_NAME="SriBagavath.apk"
        GH_TAG="latest"
        GH_TITLE="Production Build (APK) v$VERSION"
        GH_FLAGS="--latest"
        DO_TAGGING=true
        ;;
    prod-aab)
        ARTIFACT_NAME="SriBagavath_v${VERSION}.aab"
        GH_TAG="playstore-latest"
        GH_TITLE="Production Bundle (AAB) v$VERSION"
        GH_FLAGS="--latest"
        DO_TAGGING=true
        ;;
    *)
        echo "Invalid flavor for publishing: $FLAVOR. Use 'dev', 'prod', or 'prod-aab'."
        exit 1
        ;;
esac

echo "Verifying Build Artifact..."
if [ ! -f "$ARTIFACT_NAME" ]; then
    echo "ERROR: $ARTIFACT_NAME not found. Build might have failed."
    exit 1
fi

# 3. Git Tagging (for production)
if [ "$DO_TAGGING" = true ]; then
    VERSION_TAG="v${VERSION}-${FLAVOR}"
    echo "Creating versioned tag: $VERSION_TAG"
    git add .
    git commit -m "chore: release $VERSION_TAG" || echo "No changes to commit"
    git tag -a "$VERSION_TAG" -m "Release $VERSION_TAG"
    git push origin main --tags
fi

# 4. GitHub Publish
echo "Publishing to GitHub ($GH_TAG)..."

# Delete existing generic release/tag
gh release delete "$GH_TAG" --yes || echo "No existing release to delete"
gh api repos/$GITHUB_OWNER/$GITHUB_REPO/git/refs/tags/"$GH_TAG" -X DELETE || echo "No existing tag to delete"
sleep 5

# Create new generic release (latest/dev-clean) and upload
gh release create "$GH_TAG" "$ARTIFACT_NAME" \
    --title "$GH_TITLE" \
    --notes "Automated $FLAVOR release of v$VERSION." \
    $GH_FLAGS

echo "======================================"
echo "✅ $FLAVOR PUBLISHED SUCCESSFULLY!"
echo "Artifact: $ARTIFACT_NAME"
echo "URL: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/releases/download/$GH_TAG/$ARTIFACT_NAME"
echo "======================================"
