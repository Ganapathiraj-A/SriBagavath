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
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: 'rgba(17, 24, 39, 0.9)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '0 0 12px 12px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} color="#f97316" />
                <span>API: {count}</span>
            </div>
            <button
                onClick={() => ApiMonitor.reset()}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Reset Counter"
            >
                <RefreshCw size={10} />
            </button>
        </div>
    );
};

export default ApiCounterOverlay;
