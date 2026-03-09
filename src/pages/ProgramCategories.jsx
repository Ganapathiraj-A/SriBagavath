import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Video, Users, MessageCircle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useUnseenCounts } from '@/hooks/useUnseenCounts';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useAdminAuth } from '@/context/AdminAuthContext';

const CategoryButton = ({ title, icon: Icon, path, delay, hasNew }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(path)}
            style={{
                width: '100%',
                padding: '1.25rem',
                backgroundColor: 'var(--color-card)',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                cursor: 'pointer',
                position: 'relative'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-transparent)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</span>
            {hasNew && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '12px'
                }}>
                    NEW
                </div>
            )}
        </motion.button>
    );
};

const ProgramCategories = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const counts = useUnseenCounts();
    const { hiddenScreens, devMode } = useGlobalSettings();
    const { isAdmin } = useAdminAuth();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    let currentHiddenScreens = [...(hiddenScreens?.[effectiveRole] || [])];
    
    if (isAdmin && hiddenScreens?.public) {
        currentHiddenScreens = [...new Set([...currentHiddenScreens, ...hiddenScreens.public])];
    }

    // Deep Link Redirection: If an 'id' is present, go straight to Retreat details
    useEffect(() => {
        const programId = searchParams.get('id');
        if (programId) {
            navigate(`/programs/retreat?id=${programId}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const categories = [
        { title: "Programs", icon: Calendar, path: "/programs/retreat", delay: 0.1 },
        { title: "Online Meetings", icon: Video, path: "/programs/online", delay: 0.2 },
        { title: "Satsang", icon: Users, path: "/programs/satsang", delay: 0.3 },
        { title: "Consultation", icon: MessageCircle, path: "/programs/consultation", delay: 0.4 }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Programs"
                leftAction={
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '28rem', margin: '0 auto' }}>
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    Select a category to view upcoming programs
                </p>
                {!currentHiddenScreens.includes('/programs/retreat') && (
                    <CategoryButton
                        title="Programs"
                        icon={Calendar}
                        path="/programs/retreat"
                        delay={0.1}
                        hasNew={counts.hasNewPrograms}
                    />
                )}
                {!currentHiddenScreens.includes('/schedule') && (
                    <CategoryButton
                        title="Ayya's Schedule"
                        icon={Calendar}
                        path="/schedule"
                        delay={0.2}
                        hasNew={counts.hasNewSchedule}
                    />
                )}
                {!currentHiddenScreens.includes('/programs/online/daily') && (
                    <CategoryButton
                        title="Daily Zoom Meeting"
                        icon={Video}
                        path="/programs/online/daily"
                        delay={0.25}
                    />
                )}
                {!currentHiddenScreens.includes('/programs/online') && (
                    <CategoryButton
                        title="Other Online Meetings"
                        icon={Video}
                        path="/programs/online"
                        delay={0.3}
                        hasNew={counts.hasNewMeetings}
                    />
                )}
                {!currentHiddenScreens.includes('/programs/satsang') && (
                    <CategoryButton
                        title="Satsang"
                        subtitle="City-wide spiritual gatherings"
                        icon={Users}
                        path="/programs/satsang"
                        delay={0.4}
                        hasNew={counts.hasNewSatsangs}
                    />
                )}
                {!currentHiddenScreens.includes('/programs/consultation') && (
                    <CategoryButton
                        title="Consultation"
                        icon={MessageCircle}
                        path="/programs/consultation"
                        delay={0.5}
                    />
                )}
            </div>
        </div>
    );
};

export default ProgramCategories;
