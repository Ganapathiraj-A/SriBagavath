import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    BarChart3,
    Layers,
    Landmark,

    ChevronRight,
    ArrowRightLeft,
    CreditCard,
    BookOpen,
    Heart
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const BackOfficeItem = ({ title, subtitle, icon: Icon, path, delay, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)' }) => {
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
                backgroundColor: 'var(--color-card)',
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

const BackOffice = () => {
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
            color: '#8b5cf6',
            bgColor: 'rgba(139, 92, 246, 0.1)'
        },
        {
            title: 'Donation Entry',
            subtitle: 'Record manual donation',
            icon: Heart,
            path: '/admin/back-office/offline-donation',
            color: '#ec4899',
            bgColor: 'rgba(236, 72, 153, 0.1)'
        },
        {
            title: 'Import / Export Data',
            subtitle: 'Manage offline records',
            icon: ArrowRightLeft,
            path: '/admin/back-office/import-export',
            color: 'var(--color-success)',
            bgColor: 'var(--color-success-transparent)'
        },
        {
            title: 'Attendance Tracking',
            subtitle: 'Manage participants & mark presence',
            icon: Layers,
            path: '/admin/back-office/programs',
            color: '#f97316',
            bgColor: 'rgba(249, 115, 22, 0.1)'
        },
        {
            title: 'Bank Reconciliation',
            subtitle: 'Statement matching & reconciliation',
            icon: Landmark,
            path: '/admin/back-office/reconciliation',
            color: 'var(--color-success)',
            bgColor: 'var(--color-success-transparent)'
        },
        {
            title: 'Reporting & Analytics',
            subtitle: 'Financial summaries & statistics',
            icon: BarChart3,
            path: '/admin/back-office/reporting',
            color: '#8b5cf6',
            bgColor: 'rgba(139, 92, 246, 0.1)'
        },
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Back Office"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>


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
