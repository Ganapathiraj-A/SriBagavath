import React, { useState, useEffect } from 'react';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import ApiMonitor from '../utils/ApiMonitor';
import { RefreshCw, Activity } from 'lucide-react';

const ApiCounterOverlay = () => {
    const { showApiCounter } = useGlobalSettings();
    const [count, setCount] = useState(ApiMonitor.getCount());

    useEffect(() => {
        if (!showApiCounter) return;

        const unsubscribe = ApiMonitor.subscribe((newCount) => {
            setCount(newCount);
        });

        return () => unsubscribe();
    }, [showApiCounter]);

    if (!showApiCounter) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            right: '16px',
            zIndex: 9999,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '0 0 12px 12px',
            fontSize: '16px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderTop: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={18} color="#f97316" strokeWidth={3} />
                <span>API: {count}</span>
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
                <RefreshCw size={14} />
            </button>
        </div>
    );
};

export default ApiCounterOverlay;
