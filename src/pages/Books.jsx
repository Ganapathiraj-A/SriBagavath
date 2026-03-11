import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Video, FileText, Youtube } from 'lucide-react';
import { collection, query, getDocs, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useAdminAuth } from '@/context/AdminAuthContext';

const BookTypeButton = ({ title, icon: Icon, path, delay }) => {
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
                padding: '1rem',
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

const Books = () => {
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(true);
    const { hiddenScreens, devMode } = useGlobalSettings();
    const { isAdmin } = useAdminAuth();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    let currentHiddenScreens = [...(hiddenScreens?.[effectiveRole] || [])];
    
    if (isAdmin && hiddenScreens?.public) {
        currentHiddenScreens = [...new Set([...currentHiddenScreens, ...hiddenScreens.public])];
    }

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const q = query(collection(db, 'relatedVideos'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                setRelatedVideos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching related videos:", error);
            } finally {
                setLoadingVideos(false);
            }
        };
        fetchVideos();
    }, []);

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
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '1rem', textAlign: 'center' }}>
                        Books & Media
                    </h1>

                    <motion.a
                        href="https://youtu.be/zyS7ae-P3Nc?t=26"
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem',
                            fontWeight: 500
                        }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <Youtube size={18} />
                        How to choose Books ?
                    </motion.a>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!currentHiddenScreens.includes('/bookstore') && <BookTypeButton title="Print Books" icon={BookOpen} path="/bookstore" delay={0.1} />}
                        {!currentHiddenScreens.includes('/digital-books') && <BookTypeButton title="Digital Books" icon={BookOpen} path="/pdf-books" delay={0.2} />}
                        {!currentHiddenScreens.includes('/audio-books') && <BookTypeButton title="Audio Books" icon={Headphones} path="/audio-books" delay={0.3} />}
                        {!currentHiddenScreens.includes('/conversations/recorded-programs') && <BookTypeButton title="Recorded Programs" icon={Video} path="/conversations/recorded-programs" delay={0.4} />}
                        {!currentHiddenScreens.includes('/monthly-magazine') && <BookTypeButton title="Monthly Magazine" icon={FileText} path="/monthly-magazine" delay={0.5} />}
                        {!currentHiddenScreens.includes('/videos') && <BookTypeButton title="Related Videos" icon={Youtube} path="/videos" delay={0.6} />}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Books;
