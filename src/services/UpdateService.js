import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
// import { Dialog } from '@capacitor/dialog'; // Optional, using standard confirm for now

const GITHUB_API_URL = "https://api.github.com/repos/Ganapathiraj-A/SriBagavath/releases/tags/dev-clean";

class UpdateService {
    constructor() {
        this.currentVersion = null;
        this.updateAvailable = false;
        this.downloadUrl = null;
        this.releaseNotes = "";
        this.source = null; // 'laptop' or 'github'
    }

    async getCurrentVersion() {
        if (this.currentVersion) return this.currentVersion;
        try {
            const info = await App.getInfo();
            // SAFETY CHECK: Only allow updates on Dev / Internal builds
            if (info.id !== 'com.bhavathpathai.app.dev') {
                console.log("Production build detected. Disabling internal updater.");
                this.updateAvailable = false;
                return null; // Return null to signal disabled
            }
            this.currentVersion = info.version; // e.g. "2.8.192"
            return this.currentVersion;
        } catch (e) {
            console.error("Failed to get app info", e);
            return "0.0.0";
        }
    }

    // Helper to compare semantic versions 2.8.192 vs 2.8.193
    compareVersions(v1, v2) {
        if (!v1 || !v2) return 0;
        const p1 = v1.split('.').map(Number);
        const p2 = v2.split('.').map(Number);
        const len = Math.max(p1.length, p2.length);

        for (let i = 0; i < len; i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    }

    async checkForUpdate(settings = {}) {
        if (!Capacitor.isNativePlatform()) {
            console.log("Not native, skipping update check");
            return null;
        }

        const currentVer = await this.getCurrentVersion();
        if (!currentVer) {
            return { available: false, disabled: true };
        }

        const prefSource = settings.updateSource || localStorage.getItem('settings_updateSource') || 'auto';
        const serverUrl = settings.serverUrl || localStorage.getItem('settings_serverUrl') || "http://192.168.1.2:8080";

        console.log(`Checking for updates... Current: ${currentVer}, Source: ${prefSource}, Server: ${serverUrl}`);

        let laptopError = null;
        let githubError = null;
        let finalResult = { available: false };

        // 1. Try Laptop (If pref is 'auto' or 'laptop')
        if (prefSource === 'auto' || prefSource === 'laptop') {
            try {
                const manifestUrl = `${serverUrl}/manifest.json`;
                console.log("Checking Laptop Manifest at:", manifestUrl);

                const response = await Capacitor.Plugins.CapacitorHttp.get({
                    url: manifestUrl,
                    connectTimeout: 2000,
                    readTimeout: 2000
                });

                if (response.status === 200) {
                    const json = response.data;
                    if (json.server === "SriBagavath-ApkServer") {
                        const appEntry = json.apks.find(apk =>
                            apk.name.toLowerCase().includes("sribagavath") ||
                            apk.name.toLowerCase().includes("dev")
                        );

                        if (appEntry) {
                            this.downloadUrl = appEntry.url;
                            const remoteVer = appEntry.version;
                            const comparison = remoteVer && remoteVer !== 'unknown' ? this.compareVersions(remoteVer, currentVer) : 1;

                            this.releaseNotes = `Local Update (Modified: ${appEntry.modified})`;

                            return {
                                available: comparison > 0,
                                match: true,
                                source: 'laptop',
                                version: remoteVer,
                                currentVersion: currentVer,
                                notes: this.releaseNotes,
                                downloadUrl: this.downloadUrl
                            };
                        } else {
                            laptopError = "Manifest found but app missing";
                        }
                    } else {
                        laptopError = "Invalid server response";
                    }
                } else {
                    laptopError = `HTTP ${response.status}`;
                }
            } catch (e) {
                laptopError = e.message || "Timeout/Connection Failed";
                console.log("Laptop check failed:", laptopError);
            }
        }

        // If Laptop check succeeded above, we would have returned.
        // If preferred source is 'laptop' and it failed, we stop here.
        if (prefSource === 'laptop') {
            return { available: false, error: `Laptop: ${laptopError}` };
        }

        // 2. Fallback to GitHub (If pref is 'auto' or 'github')
        if (prefSource === 'auto' || prefSource === 'github') {
            try {
                const cacheBuster = `?t=${Date.now()}`;
                const response = await Capacitor.Plugins.CapacitorHttp.get({
                    url: GITHUB_API_URL + cacheBuster,
                    headers: {
                        'User-Agent': 'SriBagavathApp',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.status === 200) {
                    const json = response.data;
                    let remoteVersion = json.name; // e.g. "v2.8.193"
                    const cleanVersion = remoteVersion.replace(/[^\d.]/g, ''); // "2.8.193"

                    if (cleanVersion && cleanVersion.includes('.')) {
                        const comparison = this.compareVersions(cleanVersion, currentVer);
                        const asset = json.assets.find(a => a.name.endsWith('.apk'));
                        const dlUrl = asset ? asset.browser_download_url : null;

                        this.downloadUrl = dlUrl;
                        this.source = 'github';
                        this.releaseNotes = json.body || "New update available";

                        return {
                            available: comparison > 0,
                            source: 'github',
                            version: cleanVersion,
                            downloadUrl: dlUrl,
                            currentVersion: currentVer,
                            notes: this.releaseNotes
                        };
                    } else {
                        githubError = "Invalid version format";
                    }
                } else {
                    githubError = `HTTP ${response.status}`;
                }
            } catch (e) {
                console.error("GitHub check failed", e);
                githubError = e.message || "Connection Failed";
            }
        }

        // Construct final error message based on what was actually attempted
        let errorMsg = "";
        if (prefSource === 'auto') errorMsg = `Laptop: ${laptopError}, GitHub: ${githubError}`;
        else if (prefSource === 'github') errorMsg = `GitHub: ${githubError}`;

        return {
            available: false,
            error: errorMsg
        };
    }

    async triggerUpdate(onProgress) {
        try {
            if (!this.downloadUrl) {
                throw new Error("No update URL available");
            }

            const OCR = registerPlugin('OCR');

            // Setup Native Listener
            let listener = null;
            if (onProgress) {
                // Listen for 'downloadProgress' event from Native
                listener = await OCR.addListener('downloadProgress', (info) => {
                    // Info has { progress: 0-100 }
                    // Converter to 0.0-1.0 for callback
                    onProgress(info.progress / 100);
                });
            }

            console.log("Starting Native Download from:", this.downloadUrl);
            const filename = `update_${Date.now()}.apk`;

            // Native Download Call
            // Returns { filePath: "..." }
            const result = await OCR.downloadApk({
                url: this.downloadUrl,
                filename: filename
            });

            // Cleanup listener
            if (listener) {
                listener.remove();
            }

            if (!result || !result.filePath) {
                throw new Error("Download failed: No file path returned");
            }

            console.log("Download finished:", result.filePath);
            return result.filePath;

        } catch (error) {
            console.error("UpdateTrigger Error", error);
            if (onProgress) onProgress(0); // Reset UI on error
            throw error;
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result); // Returns data:application/octet-stream;base64,... is fine? 
            // Filesystem.writeFile expects pure string? No, data url is bad?
            // "If data is a string, it can be a UTF-8 string or a base64 string... 
            // If checking Filesystem docs: it expects string.
            // We might need to map `reader.result` to pure base64.
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }).then(res => res.split(',')[1]);
    }
}

export default new UpdateService();
