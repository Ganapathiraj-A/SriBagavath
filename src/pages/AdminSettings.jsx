import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Layers,
    BookOpen,
    Users,
    LayoutDashboard,
    Settings,
    Landmark,
    ChevronRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const SettingItem = ({ title, subtitle, icon: Icon, path, delay, color = '#2563eb', bgColor = '#eff6ff' }) => {
    const navigate = useNavigate();
    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            onClick={() => navigate(path)}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
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
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={18} color="#9ca3af" />
        </motion.button>
    );
};

const AdminSettings = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();
    const { onlineTransactionsEnabled, toggleOnlineTransactions } = useGlobalSettings();
    const [landingPage, setLandingPage] = useState(localStorage.getItem('admin_landing_page') || '/');

    const handleLandingPageChange = (e) => {
        const newValue = e.target.value;
        setLandingPage(newValue);
        localStorage.setItem('admin_landing_page', newValue);
        window.dispatchEvent(new Event('storage'));
    };

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
                    permission: ['PROGRAM_MANAGEMENT', 'PROGRAM_TYPES', 'CONSULTATION_MANAGEMENT'],
                    color: '#f97316',
                    bgColor: '#fff7ed'
                },
                {
                    id: 'BOOK_MANAGEMENT',
                    title: 'Book Management',
                    subtitle: 'Add books, descriptions & covers',
                    icon: BookOpen,
                    path: '/admin/books',
                    permission: 'ADMIN_REVIEW',
                    color: '#8b5cf6',
                    bgColor: '#f5f3ff'
                },
                {
                    id: 'MANAGE_USERS',
                    title: 'Manage Admins',
                    subtitle: 'Permission & Access Control',
                    icon: Users,
                    path: '/manage-users',
                    permission: 'MANAGE_USERS',
                    color: '#ec4899',
                    bgColor: '#fdf2f8'
                }
            ]
        },
        {
            title: 'Analytics & System',
            items: [
                {
                    id: 'ANALYTICS',
                    title: 'Analytics & Health',
                    subtitle: 'Usage stats, storage & system status',
                    icon: LayoutDashboard,
                    path: '/admin-dashboard',
                    permission: 'ADMIN_REVIEW',
                    color: '#06b6d4',
                    bgColor: '#ecfeff'
                }
            ]
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
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
                            return item.permission.some(p => hasAccess(p));
                        }
                        return hasAccess(item.permission);
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem' }}>
                                {section.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {visibleItems.map((item, iIdx) => (
                                    <SettingItem
                                        key={item.id}
                                        {...item}
                                        delay={(sIdx * 0.2) + (iIdx * 0.1)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Preferences Section (Consolidated from AppSettings) */}
                {hasAccess('CONFIGURATION') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0.5rem' }}>
                            General Preferences
                        </h3>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '0.75rem',
                                padding: '1.25rem',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        backgroundColor: onlineTransactionsEnabled ? '#dcfce7' : '#fee2e2',
                                        color: onlineTransactionsEnabled ? '#166534' : '#991b1b'
                                    }}>
                                        <Landmark size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Online Transactions</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            {onlineTransactionsEnabled ? 'Enabled (Standard Mode)' : 'Disabled (Offline Mode)'}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    onClick={() => toggleOnlineTransactions(!onlineTransactionsEnabled)}
                                    style={{
                                        width: '44px',
                                        height: '24px',
                                        backgroundColor: onlineTransactionsEnabled ? '#2563eb' : '#e5e7eb',
                                        borderRadius: '12px',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: onlineTransactionsEnabled ? '22px' : '2px',
                                        transition: 'left 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }} />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '0.75rem',
                                padding: '1.25rem',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    padding: '0.5rem',
                                    borderRadius: '8px',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151'
                                }}>
                                    <Settings size={20} />
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>Landing Page</div>
                            </div>

                            <div>
                                <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                                    Default screen on app launch.
                                </p>
                                <select
                                    value={landingPage}
                                    onChange={handleLandingPageChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: 'white',
                                        fontSize: '0.9375rem',
                                        color: '#1f2937',
                                        cursor: 'pointer',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="/">Default Home Page</option>
                                    <option value="/configuration">Admin Home Screen</option>
                                    <option value="/admin/program-management">Admin - Program Hub</option>
                                    <option value="/admin-dashboard">Analytics Dashboard</option>
                                </select>
                            </div>
                        </motion.div>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                        All settings are stored locally on your device.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
