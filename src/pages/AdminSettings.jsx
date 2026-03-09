import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Layers,
    User,
    RefreshCw,
    BookOpen,
    Users,
    LayoutDashboard,
    Settings,
    Check,
    Video,
    Copy,
    ChevronRight,
    Cpu,
    Cloud,
    Landmark,
    Database,
    Link as LinkIcon,
    Eye,
    EyeOff
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

export const CopyableInput = ({ label, value, onChange, placeholder, type = "text", style = {} }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, ...style }}>
            {label && <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block' }}>{label}</label>}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        padding: '0.625rem',
                        paddingRight: '2.5rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
            </div>
        </div>
    );
};

export const SettingItem = ({ title, subtitle, icon: Icon, delay, onClick, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)' }) => {
    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            <div style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={20} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={18} color="var(--color-text-muted)" />
        </motion.button>
    );
};

const AdminSettings = () => {
    const navigate = useNavigate();
    const { hasAccess, role } = useAdminAuth();

    const {
        deviceId, isDeviceAuthorized, toggleDeviceAuthorization,
        setPublicSettings, hiddenScreens
    } = useGlobalSettings();

    const [showBankPassword, setShowBankPassword] = React.useState(false);

    const sections = [
        {
            title: 'Management Hubs',
            items: [
                {
                    id: 'PROGRAM_MANAGEMENT',
                    title: 'Program Management',
                    subtitle: 'Retreats, Meetings, Satsang, Types & Consultation',
                    icon: Layers,
                    path: '/admin/program-management',
                    permission: ['PROGRAM_MANAGEMENT', 'CONSULTATION_MANAGEMENT', 'DAILY_ZOOM_MANAGEMENT'],
                    color: 'var(--color-primary)',
                    bgColor: 'var(--color-primary-transparent)'
                },
                {
                    id: 'books-and-media',
                    title: 'Books & Media Management',
                    subtitle: 'Books, digital content & related videos',
                    icon: BookOpen,
                    path: '/admin/books-media',
                    permission: ['BANKING', 'DIGITAL_BOOKS_MANAGEMENT', 'RELATED_VIDEO_MANAGEMENT'],
                    color: 'var(--color-accent)',
                    bgColor: 'var(--color-accent-transparent)'
                },
                {
                    id: 'MANAGE_USERS',
                    title: 'Manage Admins',
                    subtitle: 'Permission & Access Control',
                    icon: Users,
                    path: '/manage-users',
                    permission: 'MANAGE_USERS',
                    color: 'var(--color-error)',
                    bgColor: 'var(--color-error-transparent)'
                }
            ]
        },
        {
            title: 'Personal Settings',
            items: [
                {
                    id: 'PERSONAL_PROFILE',
                    title: 'Personal Settings',
                    subtitle: 'Device settings & dev tools',
                    icon: Settings,
                    path: '/admin/personal-profile',
                    permission: [], // Accessible by any admin
                    color: 'var(--color-accent)',
                    bgColor: 'var(--color-accent-transparent)'
                }
            ]
        },
        {
            title: 'System Settings',
            items: [
                {
                    id: 'CLOUD_GLOBAL_SETTINGS',
                    title: 'Cloud Global Settings',
                    subtitle: 'App version, payments & URLs',
                    icon: Cloud,
                    path: '/admin/cloud-settings',
                    permission: 'SUPER_ADMIN',
                    color: 'var(--color-primary)',
                    bgColor: 'var(--color-primary-transparent)'
                }
            ]
        },
        {
            title: 'Tools',
            items: [
                {
                    id: 'analytics-system',
                    title: 'Analytics & Tools',
                    subtitle: 'Dashboard, tools & maintenance',
                    icon: LayoutDashboard,
                    path: '/admin/analytics-system',
                    permission: 'REPORTING',
                    color: 'var(--color-info)',
                    bgColor: 'var(--color-info-transparent)'
                },
                {
                    id: 'HIDE_SCREENS',
                    title: 'Hide Screens',
                    subtitle: 'Manage visibility of App modules',
                    icon: EyeOff,
                    path: '/admin/hide-screens',
                    permission: 'SUPER_ADMIN',
                    color: 'var(--color-warning)',
                    bgColor: 'var(--color-warning-transparent)'
                }
            ]
        }
    ];

    const handleAction = async (item) => {
        if (item.action === 'CLEAR_CACHE') {
            if (window.confirm('This will clear all locally cached data and force a full resync from the server. Use this if you are seeing missing or incorrect content. Continue?')) {
                localStorage.clear();
                window.location.reload();
            }
            return;
        }
        navigate(item.path);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Settings"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {sections.map((section, sIdx) => {
                    const visibleItems = section.items.filter(item => {
                        if (Array.isArray(item.permission)) {
                            return item.permission.length === 0 || item.permission.some(p => hasAccess(p));
                        }
                        return !item.permission || hasAccess(item.permission);
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem' }}>
                                {section.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {visibleItems.map((item, iIdx) => (
                                    <SettingItem
                                        key={item.id}
                                        {...item}
                                        onClick={() => item.action ? handleAction(item) : navigate(item.path)}
                                        delay={(sIdx * 0.2) + (iIdx * 0.1)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Cloud size={12} /> Cloud Synchronized Settings & Profile
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
