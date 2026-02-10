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
            bottom: 'env(safe-area-inset-bottom, 20px)',
            left: 0,
            right: 0,
            zIndex: 10000,
            pointerEvents: 'none'
        }}>
            {/* Header / Toggle */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '0'
            }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        pointerEvents: 'auto',
                        width: '100%',
                        backgroundColor: '#111827',
                        color: 'white',
                        borderTop: '1px solid #374151',
                        borderBottom: isExpanded ? '1px solid #374151' : 'none',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.2)',
                        cursor: 'pointer'
                    }}
                >
                    <Terminal size={14} color="#34d399" />
                    APP DIAGNOSTICS ({logs.length})
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto', fontWeight: 400 }}>
                        {isExpanded ? 'Hide' : 'Tap to View Logs'}
                    </span>
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
                            padding: '10px 12px',
                            borderBottom: '1px solid #1e293b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#1e293b'
                        }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                TAP 'COPY ALL' & SEND TO ME
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: copying ? '#059669' : '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Copy size={12} />
                                    {copying ? 'LOGS COPIED!' : 'COPY ALL'}
                                </button>
                                <button
                                    onClick={() => DiagnosticLogs.clear()}
                                    style={{
                                        padding: '6px 12px',
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
