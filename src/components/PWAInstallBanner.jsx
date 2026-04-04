import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, MonitorSmartphone } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

const PWAInstallBanner = () => {
    const { isInstallable, showBanner, setShowBanner, installApp, platform } = usePWA();

    if (!isInstallable || !showBanner) return null;

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10001,
                        background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)',
                        color: 'white',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderBottom: '1px solid rgba(255,255,255,0.2)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {platform === 'ios' ? <MonitorSmartphone size={20} /> : <Download size={20} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2 }}>Install Sri Bagavath App</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Get full screen access</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={installApp}
                            style={{
                                backgroundColor: 'white',
                                color: '#ff9800',
                                border: 'none',
                                padding: '6px 16px',
                                borderRadius: '20px',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            INSTALL
                        </button>
                        <button
                            onClick={() => setShowBanner(false)}
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                padding: '4px',
                                cursor: 'pointer',
                                opacity: 0.8
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PWAInstallBanner;
