import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlaySquare, ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useAdminAuth } from '@/context/AdminAuthContext';

const HubButton = ({ title, icon: Icon, path, delay }) => {
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
                borderRadius: '0.75rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
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
        </motion.button>
    );
};

const DigitalBooksHub = () => {
    const navigate = useNavigate();
    const { hiddenScreens, devMode } = useGlobalSettings();
    const { isAdmin } = useAdminAuth();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    let currentHiddenScreens = [...(hiddenScreens?.[effectiveRole] || [])];
    
    if (isAdmin && hiddenScreens?.public) {
        currentHiddenScreens = [...new Set([...currentHiddenScreens, ...hiddenScreens.public])];
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <PageHeader
                title="Digital Books"
                leftAction={
                    <button onClick={() => navigate('/books')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!currentHiddenScreens.includes('/digital-books') && <HubButton title="PDF Books" icon={BookOpen} path="/pdf-books" delay={0.1} />}
                        {!currentHiddenScreens.includes('/conversations/recorded-programs') && <HubButton title="Recorded Programs" icon={PlaySquare} path="/conversations/recorded-programs" delay={0.2} />}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default DigitalBooksHub;
