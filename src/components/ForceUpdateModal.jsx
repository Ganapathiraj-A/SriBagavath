import { motion, AnimatePresence } from 'framer-motion';
import { Download, ExternalLink } from 'lucide-react';

const ForceUpdateModal = ({ currentVersion, minVersion }) => {
    // Version comparison logic (simple string comparison for 2.8.x style)
    // For more complex versions, we'd split by . and compare integers.
    const isUpdateRequired = () => {
        if (!currentVersion || !minVersion) return false;

        const currentParts = currentVersion.split('.').map(Number);
        const minParts = minVersion.split('.').map(Number);

        for (let i = 0; i < Math.max(currentParts.length, minParts.length); i++) {
            const current = currentParts[i] || 0;
            const min = minParts[i] || 0;
            if (current < min) return true;
            if (current > min) return false;
        }
        return false;
    };

    if (!isUpdateRequired()) return null;

    const handleUpdateClick = () => {
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.bhavathpathai.app';
        window.open(playStoreUrl, '_system');
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1.5rem',
                        maxWidth: '24rem',
                        width: '100%',
                        padding: '2.5rem',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div style={{
                        width: '4rem',
                        height: '4rem',
                        backgroundColor: '#fee2e2',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                        color: '#ef4444'
                    }}>
                        <Download size={32} />
                    </div>

                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#111827',
                        marginBottom: '0.75rem'
                    }}>
                        Update Required
                    </h2>

                    <p style={{
                        fontSize: '0.9375rem',
                        color: '#4b5563',
                        lineHeight: '1.5',
                        marginBottom: '2rem'
                    }}>
                        A new version of **Sri Bagavath** is available. Please update to continue using the app.
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginBottom: '2rem',
                        padding: '1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.75rem',
                        fontSize: '0.8125rem',
                        color: '#6b7280'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Current Version:</span>
                            <span style={{ fontWeight: 600 }}>{currentVersion}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Required Version:</span>
                            <span style={{ fontWeight: 600, color: '#ef4444' }}>{minVersion}+</span>
                        </div>
                    </div>

                    <button
                        onClick={handleUpdateClick}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        <ExternalLink size={18} />
                        Update Now
                    </button>

                    <p style={{
                        fontSize: '0.75rem',
                        color: '#9ca3af',
                        marginTop: '1.5rem'
                    }}>
                        Redirecting to Google Play Store
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ForceUpdateModal;
