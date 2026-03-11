import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, Video, Code, Phone, ChevronLeft
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';

import { useUnseenCounts } from '@/hooks/useUnseenCounts';

const ManagementButton = ({ title, subtitle, icon: Icon, path, delay, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)', badgeCount = 0 }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(path)}
            style={{
                width: '100%',
                padding: '1.25rem',
                backgroundColor: 'var(--color-card)',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                textAlign: 'left',
                cursor: 'pointer',
                position: 'relative'
            }}
        >
            <div style={{
                padding: '0.875rem',
                borderRadius: '12px',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            {badgeCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: 'var(--color-error)',
                    color: 'var(--color-text-on-primary)',
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
                {subtitle && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{subtitle}</span>}
            </div>
        </motion.button>
    );
};

const AdminProgramManagement = () => {
    const navigate = useNavigate();
    const { hasAccess, isAdmin } = useAdminAuth();
    const { hiddenScreens, devMode } = useGlobalSettings();
    const counts = useUnseenCounts();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

    const sections = [
        {
            title: 'Programs',
            subtitle: 'Manage upcoming retreats and events',
            icon: Calendar,
            path: '/program',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: "Ayya's Schedule",
            subtitle: 'Manage upcoming spiritual schedules',
            icon: Calendar,
            path: '/schedule/manage',
            permission: 'SCHEDULE_MANAGEMENT',
            badgeCount: 0 // No specific unread count for schedule management yet
        },
        {
            title: 'Online Meetings',
            subtitle: 'Schedule and manage Zoom/Meet links',
            icon: Video,
            path: '/admin/online-meetings',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: 'Manage Daily Zoom',
            subtitle: 'Schedule daily spiritual gatherings',
            icon: Video,
            path: '/admin/daily-zoom',
            permission: 'DAILY_ZOOM_MANAGEMENT'
        },
        {
            title: 'Satsang',
            subtitle: 'Manage city-wide Satsang events',
            icon: Users,
            path: '/admin/satsang',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: 'Manage Consultation',
            subtitle: 'Update teacher contacts and ordering',
            icon: Phone,
            path: '/admin/consultation',
            permission: 'CONSULTATION_MANAGEMENT'
        },
        {
            title: 'Program Types',
            subtitle: 'Configure registration formats and fees',
            icon: Code,
            path: '/configuration/program-types',
            permission: 'PROGRAM_MANAGEMENT'
        }
    ].filter(section => hasAccess(section.permission) && !currentHiddenScreens.includes(section.path));

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Program Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                        <p>You don&apos;t have permission to access any management screens.</p>
                    </div>
                ) : (
                    sections.map((section, index) => (
                        <ManagementButton
                            key={section.path}
                            {...section}
                            delay={index * 0.1}
                            badgeCount={section.badgeCount}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminProgramManagement;
