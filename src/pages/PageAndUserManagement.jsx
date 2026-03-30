import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Layers, BookOpen, Users, EyeOff, Image } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { SettingItem } from './AdminSettings';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const PageAndUserManagement = () => {
    const navigate = useNavigate();
    const { hasAccess, isAdmin } = useAdminAuth();
    const { hiddenScreens, devMode } = useGlobalSettings();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

    const items = [
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
            id: 'GALLERY_MANAGEMENT',
            title: 'Gallery Management',
            subtitle: 'Upload and manage organization photos',
            icon: Image,
            path: '/admin/gallery',
            permission: 'GALLERY_MANAGEMENT',
            color: 'var(--color-success)',
            bgColor: 'var(--color-success-transparent)'
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
        },
        {
            id: 'HIDE_SCREENS',
            title: 'Hide Pages',
            subtitle: 'Manage visibility of App modules',
            icon: EyeOff,
            path: '/admin/hide-screens',
            permission: 'SUPER_ADMIN',
            color: 'var(--color-warning)',
            bgColor: 'var(--color-warning-transparent)'
        }
    ].filter(item => {
        const hasPermission = Array.isArray(item.permission)
            ? item.permission.length === 0 || item.permission.some(p => hasAccess(p))
            : !item.permission || hasAccess(item.permission);
        const isHidden = currentHiddenScreens.includes(item.path);
        return hasPermission && !isHidden;
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Page & User Mgmt"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, idx) => (
                    <SettingItem
                        key={item.id}
                        {...item}
                        onClick={() => navigate(item.path)}
                        delay={idx * 0.1}
                    />
                ))}
            </div>
        </div>
    );
};

export default PageAndUserManagement;
