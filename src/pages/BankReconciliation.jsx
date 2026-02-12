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

const HubItem = ({ title, subtitle, icon: Icon, path, delay, color = '#2563eb', bgColor = '#eff6ff' }) => {
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

const BankReconciliation = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: 'Upload Bank Statement',
            subtitle: 'Import PDF/CSV bank records',
            icon: Upload,
            path: '/admin/back-office/reconciliation/upload',
            color: '#3b82f6',
            bgColor: '#eff6ff'
        },
        {
            title: 'Registration / Orders',
            subtitle: 'View pending internal records',
            icon: Search,
            path: '/admin/back-office/reconciliation/registrations',
            color: '#8b5cf6',
            bgColor: '#f5f3ff'
        },
        {
            title: 'Bank Statement',
            subtitle: 'Processed entries & matching',
            icon: Landmark,
            path: '/admin/back-office/reconciliation/view',
            color: '#10b981',
            bgColor: '#f0fdf4'
        }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Bank Reconciliation"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ marginBottom: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
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
