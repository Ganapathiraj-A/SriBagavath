#!/bin/bash

# Exit on error
set -e

SDK_DIR="$HOME/Android/Sdk"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

echo "Creating SDK directory at $SDK_DIR..."
mkdir -p "$SDK_DIR"

echo "Downloading Command Line Tools..."
wget -q --show-progress -O cmdline-tools.zip "$CMDLINE_TOOLS_URL"

echo "Extracting..."
unzip -q cmdline-tools.zip -d "$SDK_DIR"
rm cmdline-tools.zip

# Structure needs to be cmdline-tools/latest/bin
echo "Structuring directories..."
cd "$SDK_DIR"
mkdir -p cmdline-tools/latest
# Move unpacked 'cmdline-tools' content into 'latest'
# The zip unpacks a folder named 'cmdline-tools'
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true
rmdir cmdline-tools 2>/dev/null || true
# Now we have $SDK_DIR/cmdline-tools/latest

# Set Variables for this script
export ANDROID_HOME="$SDK_DIR"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "Installing Platform Tools and SDK..."
yes | sdkmanager --licenses >/dev/null 2>&1
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo "Success! Android SDK installed at $SDK_DIR"
echo "Don't forget to restart your terminal or source your profile."
