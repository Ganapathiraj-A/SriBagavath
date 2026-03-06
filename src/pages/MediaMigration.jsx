import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database,
    Cloud,
    Play,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Clipboard,
    Trash2,
    ArrowRight,
    Search
} from 'lucide-react';
import { BulkMigrationService } from '@/services/BulkMigrationService';

const MIGRATION_TASKS = [
    { id: 'teachers', title: 'Teacher Photos', description: 'Migrate profile photos stored in teacher documents.', service: 'migrateTeachers' },
    { id: 'programs', title: 'Program Banners', description: 'Migrate banners from program_banners collection.', service: 'migrateProgramBanners' },
    { id: 'satsangs', title: 'Satsang Banners', description: 'Migrate banners from satsang_banners collection.', service: 'migrateSatsangBanners' },
    { id: 'online_meetings', title: 'Online Meeting Banners', description: 'Migrate banners from online_meeting_banners collection.', service: 'migrateOnlineMeetingBanners' },
    { id: 'books', title: 'Book Covers', description: 'Migrate covers from book_covers collection.', service: 'migrateBookCovers' },
    { id: 'transactions', title: 'Transaction Receipts', description: 'Migrate payment receipts from transaction_images collection (High Volume).', service: 'migrateTransactions' },
];

const MediaMigration = () => {
    const [runningTask, setRunningTask] = useState(null);
    const [progress, setProgress] = useState({ processed: 0, total: 0 });
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const logEndRef = useRef(null);

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { timestamp, message, type }]);
    };

    const runMigration = async (task) => {
        if (runningTask) return;

        setRunningTask(task.id);
        setProgress({ processed: 0, total: 0 });
        addLog(`Starting migration for ${task.title}...`, 'info');

        try {
            const results = await BulkMigrationService[task.service]((progressData) => {
                setProgress({ processed: progressData.processed, total: progressData.total });
                if (progressData.processed % 5 === 0 || progressData.processed === progressData.total) {
                    addLog(`Processing ${progressData.processed}/${progressData.total} (Current ID: ${progressData.id})`, 'info');
                }
            });

            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            setStats(prev => ({
                ...prev,
                [task.id]: { success: successCount, total: results.length }
            }));

            addLog(`Completed ${task.title}: ${successCount} Success, ${failCount} Failed.`, successCount === results.length ? 'success' : 'warning');

            if (failCount > 0) {
                results.filter(r => !r.success).forEach(err => {
                    addLog(`Error [${err.id}]: ${err.error}`, 'error');
                });
            }

        } catch (error) {
            addLog(`Fatal Error: ${error.message}`, 'error');
        } finally {
            setRunningTask(null);
        }
    };

    const copyLogs = () => {
        const logText = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(logText);
        alert('Logs copied to clipboard!');
    };

    const clearLogs = () => setLogs([]);

    return (
        <div className="admin-page-container p-4 md:p-8 max-w-6xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Database className="text-primary w-8 h-8" />
                    Media Migration Utility
                </h1>
                <p className="text-muted text-lg mt-2">
                    Bulk update legacy Firestore Base64 images to high-performance Cloud Storage.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                        <Play className="w-5 h-5 text-primary" />
                        Migration Tasks
                    </h2>
                    {MIGRATION_TASKS.map((task) => (
                        <div
                            key={task.id}
                            className={`p-5 rounded-2xl border transition-all duration-300 ${runningTask === task.id
                                ? 'bg-primary-transparent border-primary shadow-lg ring-1 ring-primary'
                                : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{task.title}</h3>
                                    <p className="text-muted text-sm mt-1">{task.description}</p>

                                    {stats[task.id] && (
                                        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-success bg-success-transparent px-2 py-1 rounded-full w-fit">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Last Run: {stats[task.id].success}/{stats[task.id].total} Migrated
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => runMigration(task)}
                                    disabled={runningTask !== null}
                                    className={`p-3 rounded-xl transition-all ${runningTask === task.id
                                        ? 'bg-primary text-white cursor-not-allowed animate-pulse'
                                        : runningTask !== null
                                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                            : 'bg-primary text-white hover:scale-105 active:scale-95'
                                        }`}
                                >
                                    {runningTask === task.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                </button>
                            </div>

                            {runningTask === task.id && (
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between text-xs font-medium mb-1">
                                        <span>Progress: {progress.processed} / {progress.total}</span>
                                        <span>{Math.round((progress.processed / progress.total) * 100) || 0}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(progress.processed / progress.total) * 100}%` }}
                                            className="h-full bg-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Logging Console */}
                <div className="flex flex-col h-[600px] bg-black/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 mr-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <span className="text-zinc-400 font-mono text-sm uppercase tracking-wider font-bold">Live Migration Logs</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copyLogs} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400" title="Copy Logs">
                                <Clipboard className="w-4 h-4" />
                            </button>
                            <button onClick={clearLogs} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400" title="Clear Console">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 custom-scrollbar">
                        {logs.length === 0 ? (
                            <div className="text-zinc-600 italic text-center mt-10">
                                No activity recorded. Select a task to begin migration.
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="flex gap-3 leading-relaxed group">
                                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                                    <span className={`
                                        ${log.type === 'error' ? 'text-red-400' : ''}
                                        ${log.type === 'success' ? 'text-green-400 font-bold' : ''}
                                        ${log.type === 'warning' ? 'text-yellow-400' : ''}
                                        ${log.type === 'info' ? 'text-blue-300' : ''}
                                    `}>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>

            <section className="mt-12 p-6 bg-blue-50/10 border border-blue-200/20 rounded-2xl">
                <h2 className="text-lg font-bold flex items-center gap-2 text-blue-400 mb-3">
                    <AlertCircle className="w-5 h-5" />
                    Crucial Verification Steps
                </h2>
                <ul className="space-y-3 text-muted">
                    <li className="flex gap-2 items-start">
                        <ArrowRight className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <span>After migration, clearing the local app cache (**Admin &gt; System &gt; Clear Cache**) is mandatory to force the app to retrieve new Storage URLs.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <ArrowRight className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <span>Use the browser's Network Tab to confirm images are loading from **firebasestorage.googleapis.com**.</span>
                    </li>
                    <li className="flex gap-2 items-start">
                        <ArrowRight className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <span>Wait 24 hours to observe Firestore Read metrics in Google Cloud Console. Migration success is confirmed when "Transaction Images" and "Program Banners" collections show 0 reads.</span>
                    </li>
                </ul>
            </section>
        </div>
    );
};

export default MediaMigration;
