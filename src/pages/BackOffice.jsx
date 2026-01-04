import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    BarChart3,
    Layers,
    Landmark,
    Landmark,
    ChevronRight,
    Download,
    Upload
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BackOfficeItem = ({ title, subtitle, icon: Icon, path, delay, color = '#2563eb', bgColor = '#eff6ff' }) => {
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

const BackOffice = () => {
    const navigate = useNavigate();

    const tools = [
        {
            title: 'Attendance Tracking',
            subtitle: 'Manage participants & mark presence',
            icon: Layers,
            path: '/admin/back-office/programs',
            color: '#f97316',
            bgColor: '#fff7ed'
        },
        {
            title: 'Reporting & Analytics',
            subtitle: 'Financial summaries & statistics',
            icon: BarChart3,
            path: '/admin/back-office/reporting',
            color: '#8b5cf6',
            bgColor: '#f5f3ff'
        },
        {
            title: 'Offline Transactions',
            subtitle: 'Manual Entries & Settings',
            icon: Landmark,
            path: '/admin/back-office/offline-hub',
            color: '#ef4444',
            bgColor: '#fee2e2'
        },
        {
            title: 'Export Data',
            subtitle: 'Export offline records',
            icon: Download,
            path: null,
            color: '#10b981', // Green
            bgColor: '#d1fae5'
        },
        {
            title: 'Import Data',
            subtitle: 'Import offline records',
            icon: Upload,
            path: null,
            color: '#f59e0b', // Amber
            bgColor: '#fef3c7'
        },
        {
            title: 'Bank Reconciliation',
            subtitle: 'Coming Soon',
            icon: Landmark,
            path: '/admin/back-office/reconciliation',
            color: '#10b981',
            bgColor: '#f0fdf4'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Back Office"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0.5rem' }}>
                        Operational tools for Back Office.
                    </p>
                </div>

                {tools.map((tool, idx) => (
                    <BackOfficeItem
                        key={tool.path}
                        {...tool}
                        delay={idx * 0.1}
                    />
                ))}
            </div>
        </div>
    );
};

export default BackOffice;
