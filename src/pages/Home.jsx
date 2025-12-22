import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, BookOpen, Video, Mail, Settings, LogIn, LogOut } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { db, auth } from '../firebase';
import { StatsService } from '../services/StatsService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const MenuButton = ({ title, icon: Icon, path, delay }) => {
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
                cursor: 'pointer'
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
        </motion.button>
    );
};

const Home = () => {
    const { user, isAdmin, checkAdminStatus, setIsAdmin } = useAdminAuth();
    const [authLoading, setAuthLoading] = React.useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                checkAdminStatus(user.uid);
                StatsService.trackUserLogin().catch(() => { });
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, [checkAdminStatus, setIsAdmin]);

    const handleGoogleLogin = async () => {
        setAuthLoading(true);
        try {
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser?.authentication?.idToken;
            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
        } catch (err) {
            console.error("Home Sign-in error:", err);
            alert("Login failed: " + (err.message || err));
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        if (confirm("Are you sure you want to logout?")) {
            setAuthLoading(true);
            try {
                await GoogleAuth.signOut();
                try { await GoogleAuth.disconnect(); } catch (e) { }
                await signOut(auth);
            } catch (err) {
                console.error("Home Logout error:", err);
            } finally {
                setAuthLoading(false);
            }
        }
    };

    const isActualUser = user && !user.isAnonymous;

    // Menu Definitions
    const baseMenu = [
        { title: "About Bagavath Ayya", icon: User, path: "/about", delay: 0.1 },
        { title: "Books & Media", icon: BookOpen, path: "/books", delay: 0.2 },
        { title: "Programs", icon: Calendar, path: "/programs", delay: 0.4 },
        { title: "Ayya's Schedule", icon: Calendar, path: "/schedule", delay: 0.45 },
        { title: "Dashboard", icon: LayoutDashboard, path: "/admin-dashboard", delay: 0.3 },
        { title: "Contact", icon: Mail, path: "/contact", delay: 0.5 }
    ];

    // Admin Button (Conditional)
    const adminButton = { title: "Admin", icon: Settings, path: "/configuration", delay: 0.6 };

    // Final Menu List
    let menuItems = [...baseMenu];
    if (isAdmin) {
        // Splice in Admin at 2nd position (Index 1)
        menuItems.splice(1, 0, adminButton);
    }
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
        }}>
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

                    <div style={{ marginTop: '0.5rem' }}>
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
                                    gap: '4px',
                                    margin: '0 auto'
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
                                    gap: '4px',
                                    margin: '0 auto'
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
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
