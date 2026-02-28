import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Upload,
    Search,
    Landmark,
    ChevronRight
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const HubItem = ({ title, subtitle, icon: Icon, path, delay, color = 'var(--color-primary)', bgColor = 'var(--color-primary-transparent)' }) => {
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

const BankReconciliation = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: 'Upload Bank Statement',
            subtitle: 'Import PDF/CSV bank records',
            icon: Upload,
            path: '/admin/back-office/reconciliation/upload',
            color: 'var(--color-info)',
            bgColor: 'var(--color-info-transparent)'
        },
        {
            title: 'Registration / Orders',
            subtitle: 'View pending internal records',
            icon: Search,
            path: '/admin/back-office/reconciliation/registrations',
            color: 'var(--color-accent)',
            bgColor: 'var(--color-accent-transparent)'
        },
        {
            title: 'Bank Statement',
            subtitle: 'Processed entries & matching',
            icon: Landmark,
            path: '/admin/back-office/reconciliation/view',
            color: 'var(--color-success)',
            bgColor: 'var(--color-success-transparent)'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Bank Reconciliation"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    Select a section to proceed with reconciliation:
                </div>
                {sections.map((section, idx) => (
                    <HubItem
                        key={section.path}
                        {...section}
                        delay={idx * 0.1}
                    />
                ))}
            </div>
        </div>
    );
};

export default BankReconciliation;
