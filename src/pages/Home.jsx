import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    BookOpen,
    Mail,
    User,
    LogOut,
    LogIn,
    Settings,
    Heart,
    IndianRupee,
    LayoutDashboard,
    FileSpreadsheet
} from 'lucide-react';
import { signOut, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { ensureGoogleAuthInitialized, GET_GOOGLE_CLIENT_ID } from '../utils/GoogleAuthUtils';
import { db, auth } from '../firebase';
import { StatsService } from '../services/StatsService';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Toast } from '@capacitor/toast';


const MenuButton = ({ title, icon: Icon, path, delay, badgeCount }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(path)}
            style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                position: 'relative'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: '#fff7ed',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' }}>{title}</span>
            {badgeCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}>
                    NEW
                </div>
            )}
        </motion.button>
    );
};

import { useUnseenCounts } from '../hooks/useUnseenCounts';

const Home = () => {
    const { user, isAdmin } = useAdminAuth();
    const { serverUrl, appVersion, landingPage } = useGlobalSettings();
    const [authLoading, setAuthLoading] = React.useState(false);
    const navigate = useNavigate();
    const counts = useUnseenCounts();
    const totalPending = (counts.registrations || 0) + (counts.transactions || 0);

    // Track Login on mount if user exists
    useEffect(() => {
        if (user && !user.isAnonymous) {
            StatsService.trackUserLogin().catch(() => { });
        }
    }, [user]);

    // Landing Page Redirection Logic

    useEffect(() => {
        // Only redirect if:
        // 1. User is an admin
        // 2. A landing page preference exists and is not the home page
        // 3. We haven't redirected yet in this session (sessionStorage)
        // 4. The current path is actually the home page
        if (isAdmin && window.location.pathname === '/') {
            const hasRedirected = sessionStorage.getItem('admin_initial_redirect');

            if (landingPage && landingPage !== '/' && !hasRedirected) {
                console.log("Redirecting admin to cloud-synced landing page:", landingPage);
                sessionStorage.setItem('admin_initial_redirect', 'true');
                navigate(landingPage, { replace: false });
            }
        }
    }, [isAdmin, landingPage, navigate]);

    const [logs, setLogs] = React.useState([]);
    const startTimeRef = React.useRef(null); // Fix: Use Ref for sync access
    const [elapsed, setElapsed] = React.useState(0);
    const [forceAlert, setForceAlert] = React.useState(false); // A/B Test Toggle
    const logRef = React.useRef(null); // Auto-scroll

    // Live Timer (Visual Only)
    useEffect(() => {
        const interval = setInterval(() => {
            if (startTimeRef.current) {
                setElapsed(Date.now() - startTimeRef.current);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs]);

    // Listener for App Restored (Native result recovery)
    useEffect(() => {
        const handler = (data) => {
            addLog(`[NATIVE_RESTORE] Data: ${JSON.stringify(data)}`);
            if (data.pluginId === 'GoogleAuth' && data.methodName === 'signIn') {
                addLog(`[NATIVE_RESTORE] Recovered Google Result!`);
            }
        };
        const listenerPromise = App.addListener('appRestoredResult', handler);
        return () => { listenerPromise.then(l => l.remove()); };
    }, []);

    

    const addLog = (msg) => {
        const start = startTimeRef.current;
        const time = start ? (Date.now() - start) + 'ms' : '0ms';
        setLogs(prev => [...prev, `[${time}] ${msg}`]);
    };

    const handleGoogleLogin = async () => {
        setAuthLoading(true);
        const start = Date.now();
        startTimeRef.current = start;
        setElapsed(0);

        const mode = import.meta.env.MODE;
        const projId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
        const clientId = GET_GOOGLE_CLIENT_ID();

        setLogs([
            `[0ms] STARTING LOGIN FLOW v2.8.357 [FORCED]`, // HARDCODED FOR VERIFICATION
            `MODE: ${mode}`,
            `PROJECT: ${projId}`,
            `CLIENT: ${clientId.substring(0, 15)}...`
        ]);

        try {
            // SAFETY RE-INIT
            await ensureGoogleAuthInitialized();

            let idToken = null;

            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // On web, signInWithPopup already signs the user in.
                StatsService.trackUserLogin().catch(() => { });
                return;
            }

            if (!idToken) throw new Error("No ID Token received from Google");

            // FIREBASE AUTH (Native only now, as web is handled above)
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);

            // Track successful login
            StatsService.trackUserLogin().catch(() => { });
        } catch (err) {
            console.error("Home Sign-in error:", err);
            // Deep Error Extraction
            const errDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
            addLog("ERROR CATCH: " + errDetails);

            if (!err.message?.includes("cancelled")) {
                const debugInfo = `\n\nEnv: ${import.meta.env.MODE}\nClient: ${GET_GOOGLE_CLIENT_ID().substring(0, 10)}...`;
                alert("Login Failed!\n\nDetails: " + (err.message || "Unknown error") + "\n\nRaw: " + errDetails.substring(0, 100) + "..." + debugInfo);
            }
        } finally {
            setAuthLoading(false);
            startTimeRef.current = null;
        }
    };

    const handleLogout = async () => {
        if (confirm("Are you sure you want to logout?")) {
            setAuthLoading(true);
            try {
                if (Capacitor.isNativePlatform()) {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Google disconnect failed:", dErr);
                    }
                }
                await signOut(auth);
                sessionStorage.removeItem('admin_initial_redirect');
            } catch (err) {
                console.error("Home Logout error:", err);
                alert("Logout Error: " + err.message);
            } finally {
                setAuthLoading(false);
            }
        }
    };

    const isActualUser = user && !user.isAnonymous;

    // Menu Definitions
    const baseMenu = [
        { title: "About Bagavath Ayya", icon: User, path: "/about", delay: 0.1 },
        { title: "Programs", icon: Calendar, path: "/programs", delay: 0.2 },
        { title: "Books & Media", icon: BookOpen, path: "/books", delay: 0.3 },
        { title: "Donations", icon: Heart, path: "/donations", delay: 0.4 },
        { title: "Contact", icon: Mail, path: "/contact", delay: 0.5 }
    ];


    let menuItems = isAdmin
        ? [
            { title: "Admin", icon: LayoutDashboard, path: "/configuration", delay: 0.1, isAdmin: true },
            ...baseMenu.slice(1)
        ]
        : [...baseMenu];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            position: 'relative' // For Overlay
        }}>
            {logs.length > 0 && !import.meta.env.PROD && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '160px',
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    color: '#00FF00',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    overflowY: 'auto',
                    zIndex: 99999,
                    padding: '12px',
                    pointerEvents: 'auto',
                    textAlign: 'left',
                    borderTop: '3px solid red',
                    userSelect: 'text'
                }}>
                    <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>TIME: {elapsed}ms</span>
                            <button
                                onClick={() => {
                                    const text = logs.join('\n');
                                    navigator.clipboard.writeText(text);
                                    alert("Logs copied to clipboard!");
                                }}
                                style={{
                                    background: '#444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                Copy Logs
                            </button>
                            {serverUrl && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const text = logs.join('\n');
                                            const uploadUrl = serverUrl.replace(/:\d+$/, ':5000') + '/upload_logs';

                                            addLog("WiFi Upload: " + uploadUrl);
                                            const response = await fetch(uploadUrl, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ logs: text }),
                                                mode: 'cors'
                                            });

                                            if (response.ok) {
                                                alert("Logs successfully sent via WiFi!");
                                            } else {
                                                const err = await response.text();
                                                throw new Error(err || "WiFi upload failed");
                                            }
                                        } catch (e) {
                                            addLog("WiFi Failed: " + e.message);
                                            // Fallback to Firestore (Legacy)
                                            try {
                                                const text = logs.join('\n');
                                                await addDoc(collection(db, 'agent_commands'), {
                                                    command: "REVIEW LOGS: " + text,
                                                    status: 'QUEUED',
                                                    timestamp: Date.now()
                                                });
                                                alert("WiFi failed, but logs sent to Firestore!");
                                            } catch (fe) {
                                                alert("Total failure! WiFi: " + e.message + " | Firestore: " + fe.message);
                                            }
                                        }
                                    }}
                                    style={{
                                        background: '#0066cc',
                                        color: 'white',
                                        border: 'none',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Send Logs
                                </button>
                            )}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', background: '#333', padding: '2px 4px', borderRadius: '4px' }}>
                            <input
                                type="checkbox"
                                checked={forceAlert}
                                onChange={(e) => setForceAlert(e.target.checked)}
                            />
                            Use Blocking Alert
                        </label>
                    </div>
                    {logs.map((L, i) => <div key={i} style={{ borderBottom: '1px solid #333' }}>{L}</div>)}
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: '28rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '8rem',
                        height: '8rem',
                        margin: '0 auto 1.5rem auto',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '4px solid white',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#e5e7eb',
                        position: 'relative'
                    }}>
                        <img
                            src="/images/bagavath_ayya.png"
                            alt="Bagavath Ayya"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/150?text=Bagavath+Ayya';
                            }}
                        />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Sri Bagavath Mission</h1>
                    <p style={{ color: '#6b7280' }}>Welcome to the official app</p>

                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                        {isActualUser ? (
                            <button
                                onClick={handleLogout}
                                disabled={authLoading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#dc2626',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <LogOut size={14} />
                                Logout
                            </button>
                        ) : (
                            <button
                                onClick={handleGoogleLogin}
                                disabled={authLoading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <LogIn size={14} />
                                {authLoading ? 'Signing in...' : 'Sign in for full access'}
                            </button>
                        )}


                    </div>
                </div>


                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {menuItems.map((item, idx) => (
                        <MenuButton
                            key={item.path}
                            title={item.title}
                            icon={item.icon}
                            path={item.path}
                            delay={item.delay}
                            badgeCount={
                                item.isAdmin
                                    ? totalPending
                                    : (item.path === '/programs'
                                        ? (counts.hasNewPrograms || counts.hasNewMeetings || counts.hasNewSatsangs || counts.hasNewSchedule ? 1 : 0)
                                        : 0)
                            }
                        />
                    ))}
                </div>

                {/* App Version Footer */}
                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    paddingBottom: '2.5rem', // Increased to move higher
                    opacity: 0.5,
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '500'
                }}>
                    v{appVersion} {import.meta.env.MODE === 'production' ? '(Prod)' : '(Dev)'}
                </div>
                {logs.length > 0 && (
                    <div style={{
                        marginTop: '12px',
                        marginBottom: '40px', // Extra buffer from bottom
                        width: '100%',
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(logs.join('\n'));
                                alert("Logs copied to clipboard!");
                            }}
                            style={{ padding: '4px 12px', fontSize: '10px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none' }}
                        >
                            Copy Debug Logs
                        </button>
                        <button
                            onClick={() => setLogs([])}
                            style={{ padding: '4px 12px', fontSize: '10px', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none' }}
                        >
                            Clear
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Home;
