import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import ApiMonitor from '@/utils/ApiMonitor';
import { RefreshCw, Activity } from 'lucide-react';

const ApiCounterOverlay = () => {
    const { showApiCounter } = useGlobalSettings();
    const [stats, setStats] = useState(ApiMonitor.getStats());

    useEffect(() => {
        if (!showApiCounter) return;

        const unsubscribe = ApiMonitor.subscribe((newStats) => {
            setStats({ ...newStats });
        });

        return () => unsubscribe();
    }, [showApiCounter]);

    if (!showApiCounter) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '48px',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(17, 24, 39, 0.7)',
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9 }}>
                <Activity size={16} color="#f97316" strokeWidth={3} />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span title="Server Reads (Billed)" style={{ color: '#60a5fa' }}>SR:{stats.serverReads}</span>
                    <span title="Cache Reads (Free)" style={{ color: '#94a3b8' }}>CR:{stats.cacheReads}</span>
                    <span title="Firestore Writes" style={{ color: '#34d399' }}>W:{stats.writes}</span>
                    <span title="Network Fetches" style={{ color: '#fbbf24' }}>F:{stats.fetches}</span>
                </div>
            </div>
            <button
                onClick={() => ApiMonitor.reset()}
                style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    color: '#e5e7eb',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s'
                }}
                title="Reset Counter"
            >
                <RefreshCw size={12} />
            </button>
        </div>
    );
};

export default ApiCounterOverlay;
