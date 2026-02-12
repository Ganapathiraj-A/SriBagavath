import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, IndianRupee, LogOut, Users, LayoutDashboard, Video, Layers, Settings, BookOpen, Heart } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useUnseenCounts } from '@/hooks/useUnseenCounts';

const ConfigButton = ({ title, subtitle, icon: Icon, path, delay, onClick: customOnClick, color = 'var(--color-primary)', bgColor = '#fff7ed', badgeCount = 0 }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={customOnClick || (() => navigate(path))}
            style={{
                width: '100%',
                padding: '1.25rem', // Slightly more padding
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
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color={color} />
            </div>
            {badgeCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9999px',
                    padding: '0 6px',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                    border: '2px solid white',
                    zIndex: 10
                }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                {subtitle && <span style={{ fontSize: '0.875rem', color: '#6b7280', wordBreak: 'break-all', marginTop: '2px' }}>{subtitle}</span>}
            </div>
        </motion.button>
    );
};

const Configuration = () => {
    const navigate = useNavigate();
    const { user, hasAccess } = useAdminAuth();
    const { appVersion } = useGlobalSettings();
    const counts = useUnseenCounts();

    const handleLogout = async () => {
        if (confirm("Are you sure you want to logout?")) {
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Disconnect failed:", dErr);
                    }
                } catch (e) {
                    console.warn("Google SignOut Error", e);
                }
            }
            try {
                await signOut(auth);
                navigate('/', { replace: true });
            } catch (error) {
                console.error("Logout failed", error);
                alert("Failed to logout");
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.25rem', textAlign: 'center' }}>
                        Admin
                    </h1>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', marginBottom: '0.5rem' }}>
                        {user?.email}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: 'var(--color-primary)',
                        textAlign: 'center',
                        marginBottom: '2rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {import.meta.env.MODE} | v{appVersion}
                    </div>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Registration" icon={Shield} path="/admin-review" delay={0.1} badgeCount={counts.registrations} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Purchases" icon={IndianRupee} path="/admin/purchases" delay={0.15} color="#10b981" bgColor="#f0fdf4" badgeCount={counts.purchases} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Donations" icon={Heart} path="/admin/donations" delay={0.17} color="#ef4444" bgColor="#fef2f2" badgeCount={counts.donations} />}

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {hasAccess('ADMIN_REVIEW') && (
                                <ConfigButton
                                    title="Back Office"
                                    subtitle="Reporting, Attendance & Recon"
                                    icon={LayoutDashboard}
                                    path="/admin/back-office"
                                    delay={0.18}
                                    color="#f59e0b"
                                    bgColor="#fffbeb"
                                />
                            )}
                            {(hasAccess('PROGRAM_MANAGEMENT') || hasAccess('ADMIN_REVIEW') || hasAccess('MANAGE_USERS') || hasAccess('CONFIGURATION') || hasAccess('DAILY_ZOOM_MANAGEMENT')) && (
                                <ConfigButton
                                    title="Settings"
                                    subtitle="Management Hub & App Preferences"
                                    icon={Settings}
                                    path="/admin/settings"
                                    delay={0.2}
                                    color="#6366f1"
                                    bgColor="#eef2ff"
                                />
                            )}
                        </div>
                    </div>
                </motion.div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Configuration;
