#!/bin/bash
set -e

# Unified Build Script for Sri Bagavath
# Usage: 
#   ./build.sh dev           -> Builds Development APK
#   ./build.sh prod          -> Builds Production APK
#   ./build.sh prod-aab      -> Builds Production AAB (for Play Store)

FLAVOR=${1:-dev}
APP_NAME="SriBagavath"
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export JAVA_HOME

echo "======================================"
echo "   BUILDING: $FLAVOR                  "
echo "======================================"

# 1. Verification & Secrets
if [ ! -d "secrets" ]; then
    echo "ERROR: secrets directory missing. Cannot proceed."
    exit 1
fi

# Ensure .env exists
[ ! -f .env ] && [ -f secrets/.env ] && cp secrets/.env .env

# Ensure signing credentials are in place
cp secrets/release-keystore.jks android/app/release-keystore.jks
cp secrets/signing.properties android/app/signing.properties

# 2. Setup Flavor Specifics
case $FLAVOR in
    dev)
        echo "Setting up Development Environment..."
        cp secrets/google-services.dev.json android/app/src/dev/google-services.json
        cp secrets/google-services.dev.json android/app/google-services.json
        cp capacitor.config.dev.json capacitor.config.json
        VITE_MODE="development"
        GRADLE_TASK="assembleDevRelease"
        OUTPUT_PATH="android/app/build/outputs/apk/dev/release/app-dev-release.apk"
        FINAL_NAME="SriBagavathDevClean.apk"
        ;;
    prod)
        echo "Setting up Production Environment (APK)..."
        cp secrets/google-services.prod.json android/app/src/prod/google-services.json
        cp secrets/google-services.prod.json android/app/google-services.json
        cp capacitor.config.prod.json capacitor.config.json
        VITE_MODE="production"
        GRADLE_TASK="assembleProdRelease"
        OUTPUT_PATH="android/app/build/outputs/apk/prod/release/app-prod-release.apk"
        FINAL_NAME="SriBagavath.apk"
        ;;
    prod-aab)
        echo "Setting up Production Environment (AAB)..."
        cp secrets/google-services.prod.json android/app/src/prod/google-services.json
        cp secrets/google-services.prod.json android/app/google-services.json
        cp capacitor.config.prod.json capacitor.config.json
        VITE_MODE="production"
        GRADLE_TASK="bundleProdRelease"
        OUTPUT_PATH="android/app/build/outputs/bundle/prodRelease/app-prod-release.aab"
        VERSION=$(node -p "require('./package.json').version")
        FINAL_NAME="SriBagavath_v${VERSION}.aab"
        ;;
    *)
        echo "Invalid flavor: $FLAVOR. Use 'dev', 'prod', or 'prod-aab'"
        exit 1
        ;;
esac

# 3. Version Sync
VERSION=$(node -p "require('./package.json').version")

# Logic for version code: X.Y.Z -> (X*100000) + (Y*1000) + Z
# This ensures 3.0.0 (300000) > 2.8.362 (208362)
MAJOR=$(echo $VERSION | cut -d. -f1)
MINOR=$(echo $VERSION | cut -d. -f2)
PATCH=$(echo $VERSION | cut -d. -f3)
VERSION_CODE=$((MAJOR * 100000 + MINOR * 1000 + PATCH))

echo "Syncing Android Version to $VERSION (Code: $VERSION_CODE)..."
sed -i "s/versionName \".*\"/versionName \"$VERSION\"/g" android/app/build.gradle
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/g" android/app/build.gradle

# 4. Web Build
echo "Building Web Assets ($VITE_MODE)..."
npm run build -- --mode $VITE_MODE

# 5. Capacitor Sync
echo "Syncing Capacitor..."
npx cap sync android

# 6. Native Strings Update (App Name & Client ID override)
echo "Updating strings.xml for $FLAVOR..."
MAIN_STRINGS="android/app/src/main/res/values/strings.xml"
FLAVOR_STRINGS="android/app/src/$FLAVOR/res/values/strings.xml"

if [ "$FLAVOR" == "dev" ]; then
    DISPLAY_NAME="SB Dev"
    SERVER_CLIENT_ID="265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com"
    PACKAGE_ID="com.bhavathpathai.app.dev"
else
    DISPLAY_NAME="Sri Bagavath"
    SERVER_CLIENT_ID="358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com"
    PACKAGE_ID="com.bhavathpathai.app"
fi

update_strings() {
    local file=$1
    if [ -f "$file" ]; then
        sed -i "s|<string name=\"app_name\">.*</string>|<string name=\"app_name\">$DISPLAY_NAME</string>|g" "$file"
        
        # Update server_client_id
        if grep -q "server_client_id" "$file"; then
            sed -i "s|<string name=\"server_client_id\">.*</string>|<string name=\"server_client_id\">$SERVER_CLIENT_ID</string>|g" "$file"
        else
            sed -i "s|</resources>|    <string name=\"server_client_id\">$SERVER_CLIENT_ID</string>\n</resources>|g" "$file"
        fi

        # Update custom_url_scheme
        if grep -q "custom_url_scheme" "$file"; then
            sed -i "s|<string name=\"custom_url_scheme\">.*</string>|<string name=\"custom_url_scheme\">$PACKAGE_ID</string>|g" "$file"
        fi

        # Update package_name
        if grep -q "package_name" "$file"; then
            sed -i "s|<string name=\"package_name\">.*</string>|<string name=\"package_name\">$PACKAGE_ID</string>|g" "$file"
        fi
    fi
}

update_strings "$MAIN_STRINGS"
update_strings "$FLAVOR_STRINGS"

# 7. Native Build
echo "Running Native Build: $GRADLE_TASK..."
cd android
./gradlew clean $GRADLE_TASK
cd ..

# 7. Deliver Artifact
echo "Delivering Artifact..."
if [ ! -f "$OUTPUT_PATH" ]; then
    echo "ERROR: Build artifact not found at $OUTPUT_PATH"
    exit 1
fi

cp "$OUTPUT_PATH" "$FINAL_NAME"

# Bonus: If AAB, also copy to home directory for easy finding
if [[ $FINAL_NAME == *.aab ]]; then
    echo "Copying AAB to $HOME/$FINAL_NAME..."
    cp "$FINAL_NAME" "$HOME/$FINAL_NAME"
fi

echo "======================================"
echo "✅ BUILD COMPLETE: $FINAL_NAME"
echo "======================================"

# 8. Automatic ADB Installation (Silent)
if [[ $FINAL_NAME == *.apk ]]; then
    # Attempt to reconnect if property file exists
    ADB_PROP="secrets/adb_connection.properties"
    if [ -f "$ADB_PROP" ]; then
        KNOWN_DEVICE=$(grep "LAST_CONNECTED_DEVICE=" "$ADB_PROP" | cut -d'=' -f2)
        if [ ! -z "$KNOWN_DEVICE" ]; then
            # Only try to connect if it's not already in the list
            if ! adb devices | grep -q "$KNOWN_DEVICE"; then
                echo "🔌 Attempting to reconnect to saved device: $KNOWN_DEVICE..."
                adb connect "$KNOWN_DEVICE" || echo "⚠️ Reconnect failed."
            fi
        fi
    fi

    # Extract list of connected devices
    DEVICES=$(adb devices | grep -w "device" | cut -f1)

    # Auto-Discovery Fallback (Enhanced with Avahi/MDNS)
    if [ -z "$DEVICES" ]; then
        echo "🔍 Device not found. Attempting auto-discovery..."
        
        # 1. Try Avahi (MDNS) for Wireless Debugging (_adb-tls-connect._tcp)
        if command -v avahi-browse >/dev/null 2>&1; then
            echo "📡 Scanning for _adb-tls-connect._tcp via Avahi..."
            # Try once with persistent resolution
            AVAHI_OUT=$(avahi-browse -rt _adb-tls-connect._tcp --terminate 2>/dev/null)
            
            DISCOVERED_IP=$(echo "$AVAHI_OUT" | grep "address =" | head -n1 | cut -d'[' -f2 | cut -d']' -f1)
            DISCOVERED_PORT=$(echo "$AVAHI_OUT" | grep "port =" | head -n1 | cut -d'[' -f2 | cut -d']' -f1)
            
            # Fallback: If service found but not resolved, try to resolve the hostname manually
            if [ -z "$DISCOVERED_IP" ]; then
                SERVICE_NAME=$(echo "$AVAHI_OUT" | grep "^+" | grep "_adb-tls-connect._tcp" | head -n1 | awk '{print $4}')
                if [ ! -z "$SERVICE_NAME" ]; then
                    echo "🔍 Found service '$SERVICE_NAME' but resolution timed out. Trying manual resolve..."
                    # Try a few times because mDNS can be flaky
                    for i in {1..2}; do
                        DISCOVERED_IP=$(avahi-resolve -n "$SERVICE_NAME.local" -4 2>/dev/null | awk '{print $2}')
                        [ ! -z "$DISCOVERED_IP" ] && break
                        sleep 1
                    done
                fi
            fi

            if [ ! -z "$DISCOVERED_IP" ]; then
                if [ ! -z "$DISCOVERED_PORT" ]; then
                    echo "🔌 Found device at $DISCOVERED_IP:$DISCOVERED_PORT. Connecting..."
                    if adb connect "$DISCOVERED_IP:$DISCOVERED_PORT" | grep -qE "connected|already connected"; then
                        echo "✅ Connected to $DISCOVERED_IP:$DISCOVERED_PORT"
                        echo "# ADB Connection Details" > "$ADB_PROP"
                        echo "# Last used/verified: $(date +%Y-%m-%d)" >> "$ADB_PROP"
                        echo "LAST_CONNECTED_DEVICE=$DISCOVERED_IP:$DISCOVERED_PORT" >> "$ADB_PROP"
                        DEVICES=$(adb devices | grep -w "device" | cut -f1)
                    fi
                else
                    # IP found but port missing? Scan typical wireless debugging range
                    echo "🔍 IP found ($DISCOVERED_IP) but port missing. Scanning 30000-65535..."
                    FOUND_PORT=$(nmap -Pn -T4 -p 30000-65535 "$DISCOVERED_IP" --open -oG - | grep "/open/" | head -n1 | awk '{for(i=1;i<=NF;i++)if($i~/\/open\//)print $i}' | cut -d'/' -f1)
                    if [ ! -z "$FOUND_PORT" ]; then
                         echo "🔌 Potential port found: $FOUND_PORT. Connecting..."
                         if adb connect "$DISCOVERED_IP:$FOUND_PORT" | grep -qE "connected|already connected"; then
                            echo "✅ Connected to $DISCOVERED_IP:$FOUND_PORT"
                            echo "# ADB Connection Details" > "$ADB_PROP"
                            echo "# Last used/verified: $(date +%Y-%m-%d)" >> "$ADB_PROP"
                            echo "LAST_CONNECTED_DEVICE=$DISCOVERED_IP:$FOUND_PORT" >> "$ADB_PROP"
                            DEVICES=$(adb devices | grep -w "device" | cut -f1)
                         fi
                    fi
                fi
            fi
        fi

        # 2. Last-Known IP Port-Change Fallback
        if [ -z "$DEVICES" ] && [ ! -z "$KNOWN_DEVICE" ]; then
            OLD_IP=$(echo "$KNOWN_DEVICE" | cut -d':' -f1)
            echo "🔍 Discovery failed. Checking if last known IP ($OLD_IP) has a new wireless port..."
            # Scan typical range on the same IP in case mDNS failed but station is there
            FOUND_PORT=$(nmap -Pn -T4 -p 30000-65535 "$OLD_IP" --open -oG - | grep "/open/" | head -n1 | awk '{for(i=1;i<=NF;i++)if($i~/\/open\//)print $i}' | cut -d'/' -f1)
            if [ ! -z "$FOUND_PORT" ]; then
                echo "🔌 Found open port $FOUND_PORT on $OLD_IP. Connecting..."
                if adb connect "$OLD_IP:$FOUND_PORT" | grep -qE "connected|already connected"; then
                    echo "✅ Connected to $OLD_IP:$FOUND_PORT"
                    echo "# ADB Connection Details" > "$ADB_PROP"
                    echo "# Last used/verified: $(date +%Y-%m-%d)" >> "$ADB_PROP"
                    echo "LAST_CONNECTED_DEVICE=$OLD_IP:$FOUND_PORT" >> "$ADB_PROP"
                    DEVICES=$(adb devices | grep -w "device" | cut -f1)
                fi
            fi
        fi

        # 2. Subnet Scan Fallback (Legacy port 5555)
        if [ -z "$DEVICES" ]; then
            INTERFACE_IP=$(hostname -I | awk '{print $1}')
            if [ ! -z "$INTERFACE_IP" ]; then
                SUBNET=$(echo "$INTERFACE_IP" | cut -d. -f1,2,3).0/24
                echo "📡 Scanning subnet: $SUBNET for ADB devices (port 5555)..."
                POTENTIAL_IPS=$(nmap -n -p 5555 --open "$SUBNET" -oG - | awk '/Up$/{print $2}')
                
                for POTENTIAL_IP in $POTENTIAL_IPS; do
                    echo "🔌 Found potential device at $POTENTIAL_IP. Attempting to connect..."
                    if adb connect "$POTENTIAL_IP:5555" | grep -qE "connected|already connected"; then
                        echo "✅ Connected to $POTENTIAL_IP"
                        echo "# ADB Connection Details" > "$ADB_PROP"
                        echo "# Last used/verified: $(date +%Y-%m-%d)" >> "$ADB_PROP"
                        echo "LAST_CONNECTED_DEVICE=$POTENTIAL_IP:5555" >> "$ADB_PROP"
                        break
                    fi
                done
                DEVICES=$(adb devices | grep -w "device" | cut -f1)
            fi
        fi
    fi

    if [ ! -z "$DEVICES" ]; then
        echo "🚀 Found connected device(s). Starting silent installation..."
        for DEVICE in $DEVICES; do
            echo "Installing to $DEVICE..."
            if ! adb -s "$DEVICE" install -r -g "$FINAL_NAME"; then
                echo "⚠️ Installation failed (possibly signature mismatch). Attempting clean install..."
                adb -s "$DEVICE" uninstall "$PACKAGE_ID"
                adb -s "$DEVICE" install -r -g "$FINAL_NAME"
            fi
        done
        echo "✅ Silent installation complete!"
    else
        echo "ℹ️ No ADB devices connected. Skipping installation."
    fi
fi
