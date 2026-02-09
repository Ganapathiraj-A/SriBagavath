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
            top: '48px',
            right: '10%',
            zIndex: 9999,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
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
