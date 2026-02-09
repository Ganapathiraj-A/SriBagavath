import React, { useState, useEffect, useRef } from 'react';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import DiagnosticLogs from '../utils/DiagnosticLogs';
import { Terminal, Copy, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DiagnosticLogOverlay = () => {
    const { showDiagnosticLogs } = useGlobalSettings();
    const [logs, setLogs] = useState(DiagnosticLogs.getLogs());
    const [isExpanded, setIsExpanded] = useState(false);
    const [copying, setCopying] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (!showDiagnosticLogs) return;

        const unsubscribe = DiagnosticLogs.subscribe((newLogs) => {
            setLogs([...newLogs]);
        });

        return () => unsubscribe();
    }, [showDiagnosticLogs]);

    if (!showDiagnosticLogs) return null;

    const handleCopy = async () => {
        setCopying(true);
        const success = await DiagnosticLogs.copyToClipboard();
        if (success) {
            setTimeout(() => setCopying(false), 2000);
        } else {
            setCopying(false);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'error': return '#ef4444';
            case 'warn': return '#f59e0b';
            default: return '#94a3b8';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10000,
            pointerEvents: 'none'
        }}>
            {/* Header / Toggle */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0 1rem 0.5rem 1rem'
            }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        pointerEvents: 'auto',
                        backgroundColor: '#111827',
                        color: 'white',
                        border: '1px solid #374151',
                        borderBottom: 'none',
                        borderRadius: '12px 12px 0 0',
                        padding: '6px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer'
                    }}
                >
                    <Terminal size={14} color="#34d399" />
                    Diagnostics ({logs.length})
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: '300px' }}
                        exit={{ height: 0 }}
                        style={{
                            pointerEvents: 'auto',
                            backgroundColor: '#0f172a',
                            borderTop: '1px solid #334155',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        {/* Toolbar */}
                        <div style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #1e293b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#1e293b'
                        }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>SYSTEM LOGS</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        backgroundColor: copying ? '#059669' : '#334155',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Copy size={12} />
                                    {copying ? 'Copied!' : 'Copy All'}
                                </button>
                                <button
                                    onClick={() => DiagnosticLogs.clear()}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        backgroundColor: '#334155',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={12} />
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Log List */}
                        <div
                            ref={scrollRef}
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '8px',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                display: 'flex',
                                flexDirection: 'column-reverse',
                                gap: '4px'
                            }}
                        >
                            {logs.map(log => (
                                <div key={log.id} style={{
                                    borderLeft: `3px solid ${getTypeColor(log.type)}`,
                                    paddingLeft: '8px',
                                    marginBottom: '2px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                }}>
                                    <span style={{ color: '#64748b', marginRight: '8px' }}>[{log.timestamp}]</span>
                                    <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div style={{ color: '#475569', textAlign: 'center', marginTop: '20px' }}>
                                    No logs captured yet.
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DiagnosticLogOverlay;
