import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    CreditCard,
    BookOpen,
    Heart,
    ChevronRight,
    Landmark,
    Download,
    Upload
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const OfflineItem = ({ title, subtitle, icon: Icon, path, delay, color = '#2563eb', bgColor = '#eff6ff' }) => {
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
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
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
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>{title}</div>
                {subtitle && <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>{subtitle}</div>}
            </div>
            <ChevronRight size={20} color="#9ca3af" />
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
            color: '#0ea5e9',
            bgColor: '#e0f2fe'
        },
        {
            title: 'Book Purchase',
            subtitle: 'Create manual book order',
            icon: BookOpen,
            path: '/admin/back-office/offline-books',
            color: '#8b5cf6',
            bgColor: '#f5f3ff'
        },
        {
            title: 'Donation Entry',
            subtitle: 'Record manual donation',
            icon: Heart,
            path: '/admin/back-office/offline-donation',
            color: '#ec4899',
            bgColor: '#fdf2f8'
        },
        {
            title: 'Export Data',
            subtitle: 'Export offline records',
            icon: Download,
            path: null,
            color: '#10b981',
            bgColor: '#d1fae5'
        },
        {
            title: 'Import Data',
            subtitle: 'Import offline records',
            icon: Upload,
            path: null,
            color: '#f59e0b',
            bgColor: '#fef3c7'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Offline Transactions"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0.5rem' }}>
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
