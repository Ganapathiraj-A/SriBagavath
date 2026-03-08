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

const ConfigButton = ({ title, subtitle, icon: Icon, path, delay, onClick: customOnClick, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)', badgeCount = 0 }) => {
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
                backgroundColor: 'var(--color-card)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
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
                    backgroundColor: 'var(--color-error)',
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
                    boxShadow: 'var(--shadow-sm)',
                    border: '2px solid var(--color-card)',
                    zIndex: 10
                }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                {subtitle && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', marginTop: '2px' }}>{subtitle}</span>}
            </div>
        </motion.button>
    );
};

const Configuration = () => {
    const navigate = useNavigate();
    const { user, hasAccess, role } = useAdminAuth();
    const { appVersion, hiddenScreens, devMode } = useGlobalSettings();
    const counts = useUnseenCounts();

    const effectiveRole = devMode ? 'dev' : 'admin';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

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
                { title: 'Purchases', icon: IndianRupee, path: '/admin/purchases', permission: 'ADMIN_REVIEW', color: 'var(--color-success)', bgColor: 'var(--color-success-transparent)', badgeCount: counts.purchases },
                { title: 'Donations', icon: Heart, path: '/admin/donations', permission: 'ADMIN_REVIEW', color: 'var(--color-error)', bgColor: 'var(--color-error-transparent)', badgeCount: counts.donations },
            ]
        },
        {
            title: 'Back Office',
            items: [
                { title: 'Attendance', icon: Layers, path: '/admin/back-office/programs', permission: 'ATTENDANCE', color: 'var(--color-warning)', bgColor: 'var(--color-warning-transparent)' },
                { title: 'Reconciliation', icon: Landmark, path: '/admin/back-office/reconciliation', permission: 'BANKING', color: 'var(--color-success)', bgColor: 'var(--color-success-transparent)' },
                { title: 'Reporting', icon: BarChart3, path: '/admin/back-office/reporting', permission: 'REPORTING', color: 'var(--color-accent)', bgColor: 'var(--color-accent-transparent)' },
                { title: 'Import/Export', icon: ArrowRightLeft, path: '/admin/back-office/import-export', permission: 'IMPORT_EXPORT', color: 'var(--color-success)', bgColor: 'var(--color-success-transparent)' },
            ]
        },
        {
            title: 'Program Management',
            items: [
                { title: 'Retreats', icon: Calendar, path: '/program', permission: 'PROGRAM_MANAGEMENT', color: 'var(--color-primary)', bgColor: 'var(--color-primary-transparent)' },
                { title: 'Online Meetings', icon: Video, path: '/admin/online-meetings', permission: 'PROGRAM_MANAGEMENT', color: 'var(--color-info)', bgColor: 'var(--color-info-transparent)' },
                { title: 'Satsangs', icon: Users, path: '/admin/satsang', permission: 'PROGRAM_MANAGEMENT', color: 'var(--color-info)', bgColor: 'var(--color-info-transparent)' },
                { title: 'Program Types', icon: Layers, path: '/configuration/program-types', permission: 'PROGRAM_MANAGEMENT', color: 'var(--color-accent)', bgColor: 'var(--color-accent-transparent)' },
                { title: 'Daily Zoom', icon: Video, path: '/admin/daily-zoom', permission: 'DAILY_ZOOM_MANAGEMENT', color: 'var(--color-accent)', bgColor: 'var(--color-accent-transparent)' },
                { title: 'Consultation', icon: Phone, path: '/admin/consultation', permission: 'CONSULTATION_MANAGEMENT', color: 'var(--color-accent)', bgColor: 'var(--color-accent-transparent)' },
                { title: 'Schedules', icon: Calendar, path: '/schedule/manage', permission: 'SCHEDULE_MANAGEMENT', color: 'var(--color-warning)', bgColor: 'var(--color-warning-transparent)' },
                { title: 'Related Videos', icon: Video, path: '/admin/related-videos', permission: 'RELATED_VIDEO_MANAGEMENT', color: 'var(--color-error)', bgColor: 'var(--color-error-transparent)' },
            ]
        },
        {
            title: 'Offline Entry',
            items: [
                { title: 'Offline Registration', icon: Shield, path: '/admin/back-office/offline-registration', permission: 'OFFLINE_ENTRY', color: 'var(--color-info)', bgColor: 'var(--color-info-transparent)' },
                { title: 'Offline Books', icon: BookOpen, path: '/admin/back-office/offline-books', permission: 'OFFLINE_ENTRY', color: 'var(--color-success)', bgColor: 'var(--color-success-transparent)' },
                { title: 'Offline Donation', icon: Heart, path: '/admin/back-office/offline-donation', permission: 'OFFLINE_ENTRY', color: 'var(--color-error)', bgColor: 'var(--color-error-transparent)' },
            ]
        },
        {
            title: 'System & Books',
            items: [
                { title: 'Book Management', icon: BookOpen, path: '/admin/books', permission: 'BANKING', color: 'var(--color-success)', bgColor: 'var(--color-success-transparent)' },
                { title: 'Manage Admins', icon: Users, path: '/manage-users', permission: 'MANAGE_USERS', color: 'var(--color-error)', bgColor: 'var(--color-error-transparent)' },
                { title: 'Analytics & Health', icon: LayoutDashboard, path: '/admin-dashboard', permission: 'REPORTING', color: 'var(--color-info)', bgColor: 'var(--color-info-transparent)' },
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
                    color: 'var(--color-error)',
                    bgColor: 'var(--color-error-transparent)'
                },
                { title: 'URL Settings', icon: LinkIcon, path: '/admin/url-settings', permission: 'SUPER_ADMIN', color: 'var(--color-info)', bgColor: 'var(--color-info-transparent)' },
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
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid var(--color-border)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '0.25rem', textAlign: 'center' }}>
                        Admin
                    </h1>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.5rem' }}>
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
                                {hasAccess('ADMIN_REVIEW') && !currentHiddenScreens.includes('/configuration-reviews') && !currentHiddenScreens.includes('/admin-review') && <ConfigButton title="Registration" icon={Shield} path="/admin-review" delay={0.1} badgeCount={counts.registrations} />}
                                {hasAccess('ADMIN_REVIEW') && !currentHiddenScreens.includes('/configuration-reviews') && !currentHiddenScreens.includes('/admin/purchases') && <ConfigButton title="Purchases" icon={IndianRupee} path="/admin/purchases" delay={0.15} color="var(--color-success)" bgColor="var(--color-success-transparent)" badgeCount={counts.purchases} />}
                                {hasAccess('ADMIN_REVIEW') && !currentHiddenScreens.includes('/configuration-reviews') && !currentHiddenScreens.includes('/admin/donations') && <ConfigButton title="Donations" icon={Heart} path="/admin/donations" delay={0.17} color="var(--color-error)" bgColor="var(--color-error-transparent)" badgeCount={counts.donations} />}

                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {hasAccess('ADMIN_REVIEW') && !currentHiddenScreens.includes('/admin/back-office') && (
                                        <ConfigButton
                                            title="Back Office"
                                            subtitle="Reporting, Attendance & Recon"
                                            icon={LayoutDashboard}
                                            path="/admin/back-office"
                                            delay={0.18}
                                            color="var(--color-warning)"
                                            bgColor="var(--color-warning-transparent)"
                                        />
                                    )}
                                    {(hasAccess('PROGRAM_MANAGEMENT') || hasAccess('ADMIN_REVIEW') || hasAccess('MANAGE_USERS') || hasAccess('CONFIGURATION') || hasAccess('DAILY_ZOOM_MANAGEMENT')) && !currentHiddenScreens.includes('/configuration-system') && !currentHiddenScreens.includes('/admin/settings') && (
                                        <ConfigButton
                                            title="Settings"
                                            subtitle="Management Hub & App Preferences"
                                            icon={Settings}
                                            path="/admin/settings"
                                            delay={0.2}
                                            color="var(--color-accent)"
                                            bgColor="var(--color-accent-transparent)"
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Flattened Categorized View for Power Users
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {powerUserCategories.map((category, catIdx) => {
                                    // Map category titles to their parent IDs from the hierarchy
                                    let parentId = null;
                                    if (category.title === 'Reviews & Tracking') parentId = '/configuration-reviews';
                                    if (category.title === 'Back Office') parentId = '/admin/back-office';
                                    if (category.title === 'Program Management') parentId = '/configuration-programs';
                                    if (category.title === 'Offline Entry') parentId = '/configuration-offline';
                                    if (category.title === 'System & Books') parentId = '/configuration-system';

                                    // If the entire parent category is hidden, skip it entirely
                                    if (parentId && currentHiddenScreens.includes(parentId)) return null;

                                    const visibleItems = category.items.filter(item => {
                                        if (item.path && currentHiddenScreens.includes(item.path)) return false;
                                        if (item.permission === 'SUPER_ADMIN') return role === 'SUPER_ADMIN';
                                        return hasAccess(item.permission);
                                    });

                                    if (visibleItems.length === 0) return null;

                                    return (
                                        <div key={catIdx}>
                                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
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
                        style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Configuration;
