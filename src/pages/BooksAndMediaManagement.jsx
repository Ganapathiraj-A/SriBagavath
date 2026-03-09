import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Video } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import PageHeader from '@/components/PageHeader';
import { SettingItem } from './AdminSettings';

const BooksAndMediaManagement = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();

    const items = [
        {
            id: 'BOOK_MANAGEMENT',
            title: 'Book Management',
            subtitle: 'Add books, descriptions & covers',
            icon: BookOpen,
            path: '/admin/books',
            permission: 'BANKING',
            color: 'var(--color-accent)',
            bgColor: 'var(--color-accent-transparent)'
        },
        {
            id: 'DIGITAL_BOOKS_LANGUAGES',
            title: 'Digital Books Languages',
            subtitle: 'Manage languages & folder IDs',
            icon: BookOpen,
            path: '/admin/digital-books-settings',
            permission: 'DIGITAL_BOOKS_MANAGEMENT',
            color: 'var(--color-primary)',
            bgColor: 'var(--color-primary-transparent)'
        },
        {
            id: 'RELATED_VIDEO_MANAGEMENT',
            title: 'Related Videos',
            subtitle: 'YouTube playlist links',
            icon: Video,
            path: '/admin/related-videos',
            permission: 'RELATED_VIDEO_MANAGEMENT',
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
                <PageHeader title="Books & Media" />

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
                                onClick={() => navigate(item.path)}
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

export default BooksAndMediaManagement;
