import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, Code, LogOut, Users, LayoutDashboard, Video, Layers } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { useAdminAuth } from '../context/AdminAuthContext';

const ConfigButton = ({ title, subtitle, icon: Icon, path, delay, onClick: customOnClick, color = 'var(--color-primary)', bgColor = '#fff7ed' }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={customOnClick || (() => navigate(path))}
            style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color={color} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                {subtitle && <span style={{ fontSize: '0.875rem', color: '#6b7280', wordBreak: 'break-all', marginTop: '2px' }}>{subtitle}</span>}
            </div>
        </motion.button>
    );
};

const Configuration = () => {
    const navigate = useNavigate();
    const { user, hasAccess } = useAdminAuth();

    const handleLogout = async () => {
        if (confirm("Are you sure you want to logout?")) {
            try {
                await GoogleAuth.signOut();
                try {
                    await GoogleAuth.disconnect();
                } catch (dErr) {
                    console.warn("Disconnect failed:", dErr);
                }
            } catch (e) {
                console.warn("Google SignOut Error", e);
            }
            try {
                await signOut(auth);
                navigate('/', { replace: true });
            } catch (error) {
                console.error("Logout failed", error);
                alert("Failed to logout");
            }
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                        Admin
                    </h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(hasAccess('PROGRAM_MANAGEMENT') || hasAccess('PROGRAM_TYPES') || hasAccess('CONSULTATION_MANAGEMENT')) && (
                            <ConfigButton
                                title="Program Management"
                                subtitle="Retreats, Online Meetings, Sathsang, Types & Consultation"
                                icon={Layers}
                                path="/admin/program-management"
                                delay={0.1}
                            />
                        )}
                        {hasAccess('SCHEDULE_MANAGEMENT') && <ConfigButton title="Ayya's Schedule" icon={Calendar} path="/schedule/manage" delay={0.2} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Registration" icon={Shield} path="/admin-review" delay={0.2} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Analytics Dashboard" icon={LayoutDashboard} path="/admin-dashboard" delay={0.21} />}
                        {hasAccess('MANAGE_USERS') && <ConfigButton title="Manage Admins" icon={Users} path="/manage-users" delay={0.22} />}

                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                            <ConfigButton
                                title="Logout"
                                subtitle={user?.email}
                                icon={LogOut}
                                delay={0.25}
                                onClick={handleLogout}
                                color="#dc2626"
                                bgColor="#fef2f2"
                            />
                        </div>
                    </div>
                </motion.div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Configuration;
