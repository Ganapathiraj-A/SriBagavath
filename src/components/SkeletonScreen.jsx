import React from 'react';
import {
    Calendar,
    BookOpen,
    Mail,
    Heart,
    User,
    LogIn,
    ChevronRight,
    Search
} from 'lucide-react';

const StaticMenuButton = ({ title, icon: Icon }) => (
    <div style={{
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
        textAlign: 'left'
    }}>
        <div style={{
            padding: '0.75rem',
            borderRadius: '9999px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            <Icon size={24} color="#ea580c" />
        </div>
        <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' }}>{title}</span>
    </div>
);

const SkeletonScreen = () => {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2.5rem 1rem'
        }}>
            <div style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '8rem',
                        height: '8rem',
                        margin: '0 auto 1.5rem auto',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '4px solid white',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#e5e7eb',
                        position: 'relative'
                    }}>
                        <img
                            src="/images/bagavath_ayya.png"
                            alt="Bagavath Ayya"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Sri Bagavath Mission</h1>
                    <p style={{ color: '#6b7280' }}>Welcome to the official app</p>

                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#ea580c',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            textDecoration: 'underline'
                        }}>
                            <LogIn size={14} />
                            Sign in for full access
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <StaticMenuButton title="About Bagavath Ayya" icon={User} />
                    <StaticMenuButton title="Programs" icon={Calendar} />
                    <StaticMenuButton title="Books & Media" icon={BookOpen} />
                    <StaticMenuButton title="Donations" icon={Heart} />
                    <StaticMenuButton title="Contact" icon={Mail} />
                </div>
            </div>
        </div>
    );
};

export default SkeletonScreen;
