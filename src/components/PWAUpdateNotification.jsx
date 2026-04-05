import React, { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import './PWAUpdateNotification.css';

/**
 * PWAUpdateNotification Component
 * Handles the "New Version Available" logic and displays a toast prompt.
 * Includes a periodic check to detect updates in the background.
 */
const PWAUpdateNotification = () => {
    // intervalMS: how often the browser checks the server for a new Service Worker (1 hour)
    const intervalMS = 60 * 60 * 1000;

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered');
            if (r) {
                // Periodic background check
                setInterval(() => {
                    console.log('Checking for PWA updates...');
                    r.update();
                }, intervalMS);
            }
        },
        onRegisterError(error) {
            console.error('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) {
        return null;
    }

    return (
        <div className="pwa-toast-container">
            <div className={`pwa-toast ${needRefresh ? 'update' : 'offline'}`}>
                <div className="pwa-toast-content">
                    {needRefresh ? (
                        <>
                            <div className="pwa-toast-icon">
                                <RefreshCw className="animate-spin-slow" size={20} />
                            </div>
                            <div className="pwa-toast-message">
                                <strong>New Version Available</strong>
                                <p>Refresh to get the latest features and fixes.</p>
                            </div>
                            <button className="pwa-toast-btn primary" onClick={() => updateServiceWorker(true)}>
                                Refresh Now
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="pwa-toast-message">
                                <strong>Offline Ready</strong>
                                <p>App is ready to work offline.</p>
                            </div>
                        </>
                    )}
                    <button className="pwa-toast-close" onClick={close} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAUpdateNotification;
