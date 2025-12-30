import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, Code, LogOut, Users, LayoutDashboard, Video, Layers, Settings, BookOpen } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useUnseenCounts } from '../hooks/useUnseenCounts';

const ConfigButton = ({ title, subtitle, icon: Icon, path, delay, onClick: customOnClick, color = 'var(--color-primary)', bgColor = '#fff7ed', badgeCount = 0 }) => {
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
                padding: '1.25rem', // Slightly more padding
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                position: 'relative'
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
            {badgeCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9999px',
                    padding: '0 6px',
                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                    border: '2px solid white',
                    zIndex: 10
                }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </div>
            )}
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
    const counts = useUnseenCounts();

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
                                subtitle="Retreats, Online Meetings, Satsang, Types & Consultation"
                                icon={Layers}
                                path="/admin/program-management"
                                delay={0.1}
                            />
                        )}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Registration" icon={Shield} path="/admin-review" delay={0.2} badgeCount={counts.registrations} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Purchase / Donation" icon={Code} path="/admin/bookstore" delay={0.203} color="#10b981" bgColor="#f0fdf4" badgeCount={counts.transactions} />}
                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Book Management" subtitle="Add books, descriptions & covers" icon={BookOpen} path="/admin/books" delay={0.205} color="#8b5cf6" bgColor="#f5f3ff" />}

                        {hasAccess('ADMIN_REVIEW') && <ConfigButton title="Analytics" icon={LayoutDashboard} path="/admin-dashboard" delay={0.21} />}
                        {hasAccess('MANAGE_USERS') && <ConfigButton title="Manage Admins" icon={Users} path="/manage-users" delay={0.22} />}
                        {hasAccess('CONFIGURATION') && <ConfigButton title="App Settings" subtitle="Landing page & other preferences" icon={Settings} path="/admin/settings" delay={0.23} color="#6366f1" bgColor="#eef2ff" />}

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
