import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import PWAInstallBanner from '../components/PWAInstallBanner';

const PWAContext = createContext();

export const PWAProvider = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef(null);

  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.bhavathpathai.app';

  useEffect(() => {
    // 1. Detect Platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isMobile = isIOS || isAndroid || /mobile/.test(ua);
    
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : isMobile ? 'mobile' : 'desktop');

    // 2. Check if already installed (Standalone mode or Related Native App)
    const checkStandalone = async () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.navigator.standalone || 
                               document.referrer.includes('android-app://');
      
      let isNativeAppInstalled = false;
      if (isAndroid && navigator.getInstalledRelatedApps) {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          isNativeAppInstalled = relatedApps.some(app => app.id === 'com.bhavathpathai.app' || app.platform === 'play');
          console.log('PWA: Related apps check:', isNativeAppInstalled, relatedApps);
        } catch (err) {
          console.error('PWA: Related apps check failed:', err);
        }
      }

      const alreadyInstalled = isStandaloneMode || isNativeAppInstalled;
      setIsStandalone(alreadyInstalled);
      
      if (isMobile && !alreadyInstalled) {
        setIsInstallable(true);
      }
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 6. Handle Banner Auto-Dismiss
  useEffect(() => {
    if (isInstallable && !isStandalone) {
      setShowBanner(true);
      
      // Auto-hide after 20 seconds (Increased from 10s based on feedback)
      timerRef.current = setTimeout(() => {
        setShowBanner(false);
      }, 20000);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isInstallable, isStandalone]);

  const installApp = async () => {
    // 1. iOS Flow
    if (platform === 'ios') {
      setShowHint(true);
      return;
    }

    // 2. Android Choice Flow
    if (platform === 'android' || platform === 'mobile') {
        setShowChoice(true);
        return;
    }
  };

  const handlePWAInstall = async () => {
    setShowChoice(false);
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    // Fallback: If automated prompt is missing, show hint
    setShowHint(true);
  };

  const handlePlayStoreInstall = () => {
    setShowChoice(false);
    window.open(PLAY_STORE_URL, '_blank');
  };

  return (
    <PWAContext.Provider value={{
      isInstallable: isInstallable && !isStandalone,
      isStandalone,
      platform,
      installApp,
      showHint,
      setShowHint,
      showBanner,
      setShowBanner
    }}>
      {children}
      <PWAInstallBanner />
      
      {/* 1. Android Choice Modal */}
      {showChoice && (
        <div className="pwa-ios-overlay" onClick={() => setShowChoice(false)}>
          <div className="pwa-ios-content" onClick={e => e.stopPropagation()}>
            <h3>Install Sri Bagavath</h3>
            <p>How would you like to install the application?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button 
                    onClick={handlePlayStoreInstall} 
                    style={{ background: '#34A853', color: 'white', borderRadius: '25px', padding: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                    Install from Google Play Store
                </button>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '-4px' }}>Recommended for native features</div>

                <button 
                    onClick={handlePWAInstall}
                >
                    Install on Browser (PWA)
                </button>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '-4px' }}>Fastest, no store account needed</div>

                <button 
                  onClick={() => setShowChoice(false)} 
                  style={{ background: 'transparent', color: '#666', border: 'none', padding: '10px', marginTop: '10px' }}
                >
                  Cancel
                </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Manual Hint Overlay */}
      {showHint && (
        <div className="pwa-ios-overlay" onClick={() => setShowHint(false)}>
          <div className="pwa-ios-content" onClick={e => e.stopPropagation()}>
            <h3>Installation Instructions</h3>
            {platform === 'ios' ? (
              <>
                <p>To install on your iPhone:</p>
                <ol>
                  <li>Tap the <strong>Share</strong> button (square icon with up arrow).</li>
                  <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                </ol>
              </>
            ) : (
              <>
                <p>To install manually via Browser:</p>
                <ol>
                  <li>Tap the <strong>Menu</strong> (three dots ⋮) in Chrome.</li>
                  <li>Tap <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong>.</li>
                </ol>
              </>
            )}
            <button onClick={() => setShowHint(false)} style={{ background: '#ff9800', color: 'white', border: 'none', padding: '12px', borderRadius: '25px', width: '100%', marginTop: '20px' }}>
                Close
            </button>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);
