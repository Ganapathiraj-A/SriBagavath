/**
 * ApiMonitor: Global singleton to track API calls.
 */
class ApiMonitor {
    constructor() {
        let saved = {};
        const isSafe = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

        if (isSafe) {
            try {
                saved = JSON.parse(localStorage.getItem('debug_api_stats') || '{}');
            } catch (_err) {
                console.warn("ApiMonitor: Could not read localStorage", _err);
            }
        }
        this.stats = {
            serverReads: saved.serverReads || 0,
            cacheReads: saved.cacheReads || 0,
            writes: saved.writes || 0,
            fetches: saved.fetches || 0
        };
        this.listeners = new Set();
        this.init();
    }

    init() {
        if (typeof window === 'undefined' || !window.fetch) return;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            const isApiCall = typeof url === 'string' && (
                url.includes('scripts.google.com') ||
                url.includes('googleapis.com') ||
                url.includes('firebasedatabase.app')
            );

            if (isApiCall) {
                this.recordFetch();
            }
            return originalFetch.apply(window, args);
        };
    }

    recordServerRead(count = 1) {
        this.stats.serverReads += count;
        this.saveAndNotify();
    }

    recordCacheRead(count = 1) {
        this.stats.cacheReads += count;
        this.saveAndNotify();
    }

    recordWrite(count = 1) {
        this.stats.writes += count;
        this.saveAndNotify();
    }

    recordFetch(count = 1) {
        this.stats.fetches += count;
        this.saveAndNotify();
    }

    saveAndNotify() {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('debug_api_stats', JSON.stringify(this.stats));
        }
        this.notify();
    }

    reset() {
        this.stats = { serverReads: 0, cacheReads: 0, writes: 0, fetches: 0 };
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('debug_api_stats', JSON.stringify(this.stats));
        }
        this.notify();
    }

    getStats() {
        return this.stats;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.stats));
    }
}

const instance = new ApiMonitor();
export default instance;
