import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import PageHeader from '@/components/PageHeader';
import { SettingItem } from './AdminSettings';

const AnalyticsAndSystem = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();

    const handleAction = async (item) => {
        if (item.action === 'CLEAR_CACHE') {
            if (window.confirm('This will clear all locally cached data and force a full resync from the server. Use this if you are seeing missing or incorrect content. Continue?')) {
                localStorage.clear();
                window.location.reload();
            }
            return;
        }
    };

    const items = [
        {
            id: 'ANALYTICS',
            title: 'Analytics & Health',
            subtitle: 'Usage stats, storage & system status',
            icon: LayoutDashboard,
            path: '/admin-dashboard',
            permission: 'REPORTING',
            color: 'var(--color-info)',
            bgColor: 'var(--color-info-transparent)'
        },
        {
            id: 'MEDIA_MIGRATION',
            title: 'Media Migration Utility',
            subtitle: 'Bulk update legacy images to Cloud Storage',
            icon: Database,
            path: '/admin/media-migration',
            permission: 'REPORTING',
            color: 'var(--color-primary)',
            bgColor: 'var(--color-primary-transparent)'
        },
        {
            id: 'SYSTEM_MAINTENANCE',
            title: 'System Maintenance',
            subtitle: 'Clear local cache & reset sync registry',
            icon: RefreshCw,
            action: 'CLEAR_CACHE',
            permission: 'REPORTING',
            color: 'var(--color-error)',
            bgColor: 'var(--color-error-transparent)'
        }
    ];

    const visibleItems = items.filter(item => {
        if (Array.isArray(item.permission)) {
            return item.permission.some(p => hasAccess(p));
        }
        return hasAccess(item.permission);
    });

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem',
            paddingBottom: '6rem' // Space for bottom nav
        }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
                <PageHeader title="Analytics & Tools" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'var(--color-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}
                >
                    {visibleItems.length > 0 ? (
                        visibleItems.map((item, idx) => (
                            <SettingItem
                                key={item.id}
                                {...item}
                                onClick={() => item.action ? handleAction(item) : navigate(item.path)}
                                delay={idx * 0.1}
                            />
                        ))
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.875rem'
                        }}>
                            You do not have permission to view any settings in this category.
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsAndSystem;
