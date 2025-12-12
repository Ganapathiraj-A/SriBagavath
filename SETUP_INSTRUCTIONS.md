
# Environment Setup Instructions

The Android build requires **Java 17** and **Node.js v20+**.

## 1. Install Java (JDK 17)
Since I don't have your `sudo` password, please run this command in your terminal:

```bash
sudo apt update
sudo apt install openjdk-17-jdk
```

After installation, verify it by running:
```bash
java -version
```

## 2. Upgrade Node.js to v20
I recommend using `nvm` (Node Version Manager).

**Install nvm (if not installed):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
```

**Install Node 20:**
```bash
nvm install 20
nvm use 20
nvm alias default 20
```

## 3. Resume Build
Once dependencies are installed, you can resume the build with:

## 4. Install Android SDK (Missing)
I have created a script to install the Android SDK automatically in your home directory.

Run this:
```bash
chmod +x install_android_sdk.sh
./install_android_sdk.sh
```

This will:
1.  Download Android Command Line Tools.
2.  Install `platform-tools` and `build-tools`.
3.  Set up the correct folder structure in `~/Android/Sdk`.
