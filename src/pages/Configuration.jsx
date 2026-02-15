import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Shield, IndianRupee, LogOut, Users, LayoutDashboard,
    Video, Layers, Settings, BookOpen, Heart, Landmark,
    BarChart3, Phone, Link as LinkIcon, ArrowRightLeft, RefreshCw
} from 'lucide-react';
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
                padding: '1.25rem',
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
    const { user, hasAccess, role } = useAdminAuth();
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

    const isPowerUser = role === 'POWER_USER';

    const powerUserCategories = [
        {
            title: 'Reviews & Tracking',
            items: [
                { title: 'Registration', icon: Shield, path: '/admin-review', permission: 'ADMIN_REVIEW', badgeCount: counts.registrations },
                { title: 'Purchases', icon: IndianRupee, path: '/admin/purchases', permission: 'ADMIN_REVIEW', color: '#10b981', bgColor: '#f0fdf4', badgeCount: counts.purchases },
                { title: 'Donations', icon: Heart, path: '/admin/donations', permission: 'ADMIN_REVIEW', color: '#ef4444', bgColor: '#fef2f2', badgeCount: counts.donations },
            ]
        },
        {
            title: 'Back Office',
            items: [
                { title: 'Attendance', icon: Layers, path: '/admin/back-office/programs', permission: 'ATTENDANCE', color: '#f59e0b', bgColor: '#fffbeb' },
                { title: 'Reconciliation', icon: Landmark, path: '/admin/back-office/reconciliation', permission: 'BANKING', color: '#10b981', bgColor: '#f0fdf4' },
                { title: 'Reporting', icon: BarChart3, path: '/admin/back-office/reporting', permission: 'REPORTING', color: '#8b5cf6', bgColor: '#f5f3ff' },
                { title: 'Import/Export', icon: ArrowRightLeft, path: '/admin/back-office/import-export', permission: 'IMPORT_EXPORT', color: '#10b981', bgColor: '#d1fae5' },
            ]
        },
        {
            title: 'Program Management',
            items: [
                { title: 'Retreats', icon: Calendar, path: '/program', permission: 'PROGRAM_MANAGEMENT', color: '#f97316', bgColor: '#fff7ed' },
                { title: 'Online Meetings', icon: Video, path: '/admin/online-meetings', permission: 'PROGRAM_MANAGEMENT', color: '#3b82f6', bgColor: '#eff6ff' },
                { title: 'Satsangs', icon: Users, path: '/admin/satsang', permission: 'PROGRAM_MANAGEMENT', color: '#06b6d4', bgColor: '#ecfeff' },
                { title: 'Program Types', icon: Layers, path: '/configuration/program-types', permission: 'PROGRAM_MANAGEMENT', color: '#8b5cf6', bgColor: '#f5f3ff' },
                { title: 'Daily Zoom', icon: Video, path: '/admin/daily-zoom', permission: 'DAILY_ZOOM_MANAGEMENT', color: '#6366f1', bgColor: '#eef2ff' },
                { title: 'Consultation', icon: Phone, path: '/admin/consultation', permission: 'CONSULTATION_MANAGEMENT', color: '#ec4899', bgColor: '#fdf2f8' },
                { title: 'Schedules', icon: Calendar, path: '/schedule/manage', permission: 'SCHEDULE_MANAGEMENT', color: '#f59e0b', bgColor: '#fffbeb' },
                { title: 'Related Videos', icon: Video, path: '/admin/related-videos', permission: 'RELATED_VIDEO_MANAGEMENT', color: '#ef4444', bgColor: '#fef2f2' },
            ]
        },
        {
            title: 'Offline Entry',
            items: [
                { title: 'Offline Registration', icon: Shield, path: '/admin/back-office/offline-registration', permission: 'OFFLINE_ENTRY', color: '#3b82f6', bgColor: '#eff6ff' },
                { title: 'Offline Books', icon: BookOpen, path: '/admin/back-office/offline-books', permission: 'OFFLINE_ENTRY', color: '#10b981', bgColor: '#f0fdf4' },
                { title: 'Offline Donation', icon: Heart, path: '/admin/back-office/offline-donation', permission: 'OFFLINE_ENTRY', color: '#ef4444', bgColor: '#fef2f2' },
            ]
        },
        {
            title: 'System & Books',
            items: [
                { title: 'Book Management', icon: BookOpen, path: '/admin/books', permission: 'BANKING', color: '#10b981', bgColor: '#f0fdf4' },
                { title: 'Manage Admins', icon: Users, path: '/manage-users', permission: 'MANAGE_USERS', color: '#ef4444', bgColor: '#fef2f2' },
                { title: 'Analytics & Health', icon: LayoutDashboard, path: '/admin-dashboard', permission: 'REPORTING', color: '#06b6d4', bgColor: '#ecfeff' },
                {
                    title: 'Maintenance',
                    icon: RefreshCw,
                    onClick: () => {
                        if (window.confirm('Clear cache and reload?')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    },
                    permission: 'REPORTING',
                    color: '#ef4444',
                    bgColor: '#fef2f2'
                },
                { title: 'URL Settings', icon: LinkIcon, path: '/admin/url-settings', permission: 'SUPER_ADMIN', color: '#3b82f6', bgColor: '#eff6ff' },
            ]
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: isPowerUser ? '42rem' : '28rem', margin: '0 auto' }}>

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


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {!isPowerUser ? (
                            // Hierarchical View for Admin/SuperAdmin
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
                        ) : (
                            // Flattened Categorized View for Power Users
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {powerUserCategories.map((category, catIdx) => {
                                    const visibleItems = category.items.filter(item => {
                                        if (item.permission === 'SUPER_ADMIN') return role === 'SUPER_ADMIN';
                                        return hasAccess(item.permission);
                                    });

                                    if (visibleItems.length === 0) return null;

                                    return (
                                        <div key={catIdx}>
                                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                                                {category.title}
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                                                {visibleItems.map((item, itemIdx) => (
                                                    <ConfigButton
                                                        key={itemIdx}
                                                        {...item}
                                                        delay={0.1 + (catIdx * 0.1) + (itemIdx * 0.05)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </motion.div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        onClick={handleLogout}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <LogOut size={18} /> Logout
                    </button>
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
