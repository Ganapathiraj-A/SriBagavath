/**
 * ApiMonitor: Global singleton to track API calls.
 */
class ApiMonitor {
    constructor() {
        this.apiCount = parseInt(localStorage.getItem('debug_api_count') || '0', 10);
        this.listeners = new Set();
        this.init();
    }

    init() {
        if (typeof window === 'undefined') return;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            const isApiCall = typeof url === 'string' && (
                url.includes('scripts.google.com') ||
                url.includes('googleapis.com') ||
                url.includes('firebasedatabase.app')
            );

            if (isApiCall) {
                this.increment();
            }
            return originalFetch.apply(window, args);
        };
    }

    increment() {
        this.apiCount++;
        localStorage.setItem('debug_api_count', this.apiCount);
        this.notify();
    }

    reset() {
        this.apiCount = 0;
        localStorage.setItem('debug_api_count', '0');
        this.notify();
    }

    getCount() {
        return this.apiCount;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.apiCount));
    }
}

const instance = new ApiMonitor();
export default instance;
