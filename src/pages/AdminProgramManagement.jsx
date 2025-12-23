import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, Video, Code, Phone, ChevronLeft
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAdminAuth } from '../context/AdminAuthContext';

const ManagementButton = ({ title, subtitle, icon: Icon, path, delay, color = '#f97316', bgColor = '#fff7ed' }) => {
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
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                textAlign: 'left',
                cursor: 'pointer'
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
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>{title}</span>
                {subtitle && <span style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '2px' }}>{subtitle}</span>}
            </div>
        </motion.button>
    );
};

const AdminProgramManagement = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();

    const sections = [
        {
            title: 'Programs',
            subtitle: 'Manage upcoming retreats and events',
            icon: Calendar,
            path: '/program',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: 'Online Meetings',
            subtitle: 'Schedule and manage Zoom/Meet links',
            icon: Video,
            path: '/admin/online-meetings',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: 'Sathsang',
            subtitle: 'Manage city-wide Sathsang events',
            icon: Users,
            path: '/admin/sathsang',
            permission: 'PROGRAM_MANAGEMENT'
        },
        {
            title: 'Program Types',
            subtitle: 'Configure registration formats and fees',
            icon: Code,
            path: '/configuration/program-types',
            permission: 'PROGRAM_TYPES'
        },
        {
            title: 'Manage Consultation',
            subtitle: 'Update teacher contacts and ordering',
            icon: Phone,
            path: '/admin/consultation',
            permission: 'CONSULTATION_MANAGEMENT'
        }
    ].filter(section => hasAccess(section.permission));

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Program Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                        <p>You don't have permission to access any management screens.</p>
                    </div>
                ) : (
                    sections.map((section, index) => (
                        <ManagementButton
                            key={section.path}
                            {...section}
                            delay={index * 0.1}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminProgramManagement;
