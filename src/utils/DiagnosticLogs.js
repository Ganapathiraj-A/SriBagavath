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
                } catch (_err) {
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
        } catch (_err) {
            console.error("Clipboard copy failed", _err);
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

    async pushLogs(db, user, version, deviceId) {
        if (!db) return { success: false, error: 'Database not initialized' };

        const { setDoc, doc, collection, serverTimestamp } = await import('firebase/firestore');

        const metadata = {
            userId: user?.uid || 'anonymous',
            email: user?.email || 'N/A',
            deviceId: deviceId || 'unknown',
            appVersion: version || 'unknown',
            platform: Capacitor.getPlatform(),
            sessionStart: this.sessionStart,
            reportId: `log_${Date.now()}`,
            timestamp: serverTimestamp()
        };

        // Prepare text-based logs
        const logContent = this.logs
            .slice()
            .reverse()
            .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
            .join('\n');

        // Firestore doc limit is 1MB. Stringified logs of 2000 entries should be well under that.
        // Each log entry is roughly ~100-200 chars. 2000 * 200 = 400,000 bytes (~0.4MB).

        try {
            const reportRef = doc(db, 'diagnostic_reports', metadata.reportId);
            await setDoc(reportRef, {
                ...metadata,
                logs: logContent
            });
            return { success: true, reportId: metadata.reportId };
        } catch (_err) {
            console.error("Failed to push logs to server", _err);
            return { success: false, error: _err.message };
        }
    }

    async clearServerLogs(db) {
        if (!db) return { success: false, error: 'Database not initialized' };

        const { getDocs, collection, writeBatch, query, limit } = await import('firebase/firestore');

        try {
            // Note: For safety, let's only clear the ones we can see. 
            // In a real app, you'd want a Cloud Function for "Clear All".
            // Here we'll do a batch delete for the last 50 reports as a "Clear" action.
            const querySnap = await getDocs(query(collection(db, 'diagnostic_reports'), limit(50)));
            if (querySnap.empty) return { success: true, message: 'No logs to clear' };

            const batch = writeBatch(db);
            querySnap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            return { success: true };
        } catch (_err) {
            console.error("Failed to clear server logs", _err);
            return { success: false, error: _err.message };
        }
    }
}

const instance = new DiagnosticLogs();
export default instance;
