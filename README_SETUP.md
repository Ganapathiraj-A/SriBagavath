# Project Setup Guide (GitHub)

This guide documents how to set up the Sri Bagavath project on a new machine using the source code and the password-protected secrets.

## Prerequisites
- Node.js (v18+)
- Android Studio / Java 21
- zip/unzip utility

## Step 1: Clone the Repository
```bash
git clone https://github.com/Ganapathiraj-A/SriBagavath.git
cd SriBagavath
```

## Step 2: Restore Sensitive Files
The project uses a password-protected zip file (`secrets.zip`) to store keystores, API keys, and configurations.
- **File:** `secrets.zip`
- **Password:** `deeps112`

**Unzip Command:**
```bash
unzip -P deeps112 secrets.zip
```
This will create a `secrets/` directory containing `.env`, `google-services.json` files, and the `release-keystore.jks`.

## Step 3: Initial Setup
```bash
npm install
```

## Step 4: Building the Project
The build scripts are configured to automatically pull files from the `secrets/` directory if they are missing from their target locations.

### For Development:
```bash
./publish_unified.sh dev
```

### For Production (APK):
```bash
./publish_unified.sh prod
```

### For Play Store (AAB):
```bash
./build_playstore_aab.sh
```

## Internal Note
Individual sensitive files are listed in `.gitignore` and should never be committed outside the `secrets.zip`. If you update a key or keystore, remember to update the `secrets/` folder and re-zip with the password!
