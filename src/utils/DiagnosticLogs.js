import { Clipboard } from '@capacitor/clipboard';

class DiagnosticLogs {
    constructor() {
        this.logs = [];
        this.listeners = new Set();
        this.maxLogs = 200;

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
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return '[Circular or Complex Object]';
                }
            }
            return String(arg);
        }).join(' ');

        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            type,
            message
        };

        this.logs = [logEntry, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    clear() {
        this.logs = [];
        this.notify();
    }

    async copyToClipboard() {
        const text = this.logs
            .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
            .join('\n');

        try {
            await Clipboard.write({ string: text });
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
