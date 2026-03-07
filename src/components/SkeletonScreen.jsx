import {
    Calendar,
    BookOpen,
    Mail,
    Heart,
    User,
    LogIn,
    LayoutDashboard
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const StaticMenuButton = ({ title, icon: Icon }) => (
    <div style={{
        width: '100%',
        padding: '1rem',
        backgroundColor: 'var(--color-card)',
        borderRadius: '0.75rem',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '1rem',
        textAlign: 'left'
    }}>
        <div style={{
            padding: '0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-primary-transparent)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            <Icon size={24} color="var(--color-primary)" />
        </div>
        <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
    </div>
);

const SkeletonScreen = () => {
    const { user, isAdmin } = useAdminAuth();
    const { appVersion } = useGlobalSettings();
    const isActualUser = user && !user.isAnonymous;

    const baseMenu = [
        { title: "About Bagavath Ayya", icon: User },
        { title: "Programs", icon: Calendar },
        { title: "Books & Media", icon: BookOpen },
        { title: "Donations", icon: Heart },
        { title: "Contact", icon: Mail }
    ];

    const menuItems = isAdmin
        ? [
            { title: "Admin", icon: LayoutDashboard },
            ...baseMenu.slice(1)
        ]
        : [...baseMenu];

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
        }}>
            <div style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '8rem',
                        height: '8rem',
                        margin: '0 auto 1.5rem auto',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '4px solid var(--color-primary)',
                        boxShadow: 'var(--shadow-lg)',
                        backgroundColor: 'var(--color-surface)',
                        position: 'relative'
                    }}>
                        <img
                            src="https://firebasestorage.googleapis.com/v0/b/antigravity-app-5c1ff.firebasestorage.app/o/branding%2Fbagavath_ayya.png?alt=media"
                            alt="Bagavath Ayya"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '0.5rem' }}>Sri Bagavath Mission</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Welcome to the official app</p>

                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isActualUser ? (
                            <div style={{ color: 'var(--color-error)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
                                <LogOut size={14} /> Logout
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: 'var(--color-primary)',
                                fontSize: '0.9rem',
                                fontWeight: 500,
                                textDecoration: 'underline'
                            }}>
                                <LogIn size={14} />
                                Sign in for full access
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {menuItems.map((item, idx) => (
                        <StaticMenuButton key={idx} title={item.title} icon={item.icon} />
                    ))}
                </div>

                {/* Perfect Match Footer */}
                <div style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    paddingBottom: '2.5rem',
                    opacity: 0.5,
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: '500'
                }}>
                    {import.meta.env.MODE} | v{appVersion}
                </div>
            </div>
        </div>
    );
};

// Dummy LogOut icon to avoid import errors if not used but referenced
const LogOut = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);

export default SkeletonScreen;
