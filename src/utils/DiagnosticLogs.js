import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

class DiagnosticLogs {
    constructor() {
        this.logs = [];
        this.listeners = new Set();
        this.maxLogs = 2000;
        this.sessionStart = new Date().toISOString();

        // Capture original console methods
        this.originalLog = console.log;
        this.originalWarn = console.warn;
        this.originalError = console.error;

        // Auto-bootstrap console capture
        this.captureConsole();
    }

    captureConsole() {
        console.log = (...args) => {
            this.originalLog.apply(console, args);
            this.addLog('info', args);
        };
        console.warn = (...args) => {
            this.originalWarn.apply(console, args);
            this.addLog('warn', args);
        };
        console.error = (...args) => {
            this.originalError.apply(console, args);
            this.addLog('error', args);
        };
    }

    addLog(type, args) {
        const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        const message = args.map(arg => {
            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}\n${arg.stack}`;
            }
            if (typeof arg === 'object' && arg !== null) {
                try {
                    // Try to stringify, handle circular refs or big objects
                    return JSON.stringify(arg, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    );
                } catch (e) {
                    return '[Object]';
                }
            }
            return String(arg);
        }).join(' ');

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp,
            type,
            message
        };

        this.logs = [logEntry, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    logNavigation(path) {
        this.addLog('nav', [`Navigate to: ${path}`]);
    }

    clear() {
        this.logs = [];
        this.notify();
    }

    async copyToClipboard() {
        const metadata = [
            `Session Start: ${this.sessionStart}`,
            `Platform: ${Capacitor.getPlatform()}`,
            `Generated at: ${new Date().toISOString()}`,
            `----------------------------------------`
        ].join('\n');

        const text = this.logs
            .slice() // Copy to avoid mutation during map
            .reverse() // Oldest first for chronological reading
            .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
            .join('\n');

        try {
            await Clipboard.write({ string: metadata + '\n' + text });
            return true;
        } catch (e) {
            console.error("Clipboard copy failed", e);
            return false;
        }
    }

    getLogs() {
        return this.logs;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.logs));
    }
}

const instance = new DiagnosticLogs();
export default instance;
