import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    CreditCard,
    BookOpen,
    Heart,
    ChevronRight,
    Landmark
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const OfflineItem = ({ title, subtitle, icon: Icon, path, delay, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)' }) => {
    const navigate = useNavigate();
    return (
        <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay, duration: 0.3 }}
            onClick={() => path ? navigate(path) : alert('Coming Soon!')}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '0.75rem',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={20} color="var(--color-text-muted)" />
        </motion.button>
    );
};

const BackOfficeOfflineHub = () => {
    const navigate = useNavigate();

    const tools = [
        {
            title: 'Program Registration',
            subtitle: 'Register user for a program',
            icon: CreditCard,
            path: '/admin/back-office/offline-registration',
            color: 'var(--color-primary)',
            bgColor: 'var(--color-primary-transparent)'
        },
        {
            title: 'Book Purchase',
            subtitle: 'Create manual book order',
            icon: BookOpen,
            path: '/admin/back-office/offline-books',
            color: 'var(--color-primary)',
            bgColor: 'var(--color-primary-transparent)'
        },
        {
            title: 'Donation Entry',
            subtitle: 'Record manual donation',
            icon: Heart,
            path: '/admin/back-office/offline-donation',
            color: 'var(--color-primary)',
            bgColor: 'var(--color-primary-transparent)'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Offline Transactions"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0 0.5rem' }}>
                        Manage global transaction settings and enter offline records manually.
                    </p>
                </div>

                <div style={{ height: '10px' }} />

                {tools.map((tool, idx) => (
                    <OfflineItem
                        key={tool.path}
                        {...tool}
                        delay={(idx + 1) * 0.1}
                    />
                ))}
            </div>
        </div>
    );
};

export default BackOfficeOfflineHub;
