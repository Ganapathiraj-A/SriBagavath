import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Calendar, Video, Users, MessageCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const CategoryButton = ({ title, icon: Icon, path, delay }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: '#f9fafb' }}
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
                cursor: 'pointer'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '12px',
                backgroundColor: '#fff7ed',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>{title}</span>
        </motion.button>
    );
};

const ProgramCategories = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Deep Link Redirection: If an 'id' is present, go straight to Retreat details
    useEffect(() => {
        const programId = searchParams.get('id');
        if (programId) {
            navigate(`/programs/retreat?id=${programId}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const categories = [
        { title: "Retreat", icon: Calendar, path: "/programs/retreat", delay: 0.1 },
        { title: "Online Meetings", icon: Video, path: "/programs/online", delay: 0.2 },
        { title: "Sathsang", icon: Users, path: "/programs/sathsang", delay: 0.3 },
        { title: "Consultation", icon: MessageCircle, path: "/programs/consultation", delay: 0.4 }
    ];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Programs"
                leftAction={
                    <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '28rem', margin: '0 auto' }}>
                <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    Select a category to view upcoming programs
                </p>
                {categories.map((cat) => (
                    <CategoryButton
                        key={cat.path}
                        title={cat.title}
                        icon={cat.icon}
                        path={cat.path}
                        delay={cat.delay}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProgramCategories;
