import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Video, FileText, Youtube, ExternalLink } from 'lucide-react';
import { collection, query, getDocs, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';

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
                backgroundColor: '#fff7ed',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' }}>{title}</span>
        </motion.button>
    );
};

const Books = () => {
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(true);

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
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                        Books & Media
                    </h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <BookTypeButton title="Print Books" icon={BookOpen} path="/bookstore" delay={0.1} />
                        <BookTypeButton title="Digital Books" icon={BookOpen} path="/pdf-books" delay={0.2} />
                        <BookTypeButton title="Audio Books" icon={Headphones} path="/audio-books" delay={0.3} />
                        <BookTypeButton title="Recorded Programs" icon={Video} path="/conversations/recorded-programs" delay={0.4} />
                        <BookTypeButton title="Monthly Magazine" icon={FileText} path="/monthly-magazine" delay={0.5} />

                        {relatedVideos.length > 0 && (
                            <div style={{ marginTop: '2rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Youtube size={20} color="#ef4444" /> Related Videos
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {relatedVideos.map((video, index) => (
                                        <motion.button
                                            key={video.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.6 + (index * 0.1) }}
                                            whileHover={{ scale: 1.01, backgroundColor: '#f9fafb' }}
                                            onClick={() => window.open(video.url, '_blank')}
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                backgroundColor: 'white',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #e5e7eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                textAlign: 'left',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span style={{ fontSize: '1rem', color: '#4b5563', fontWeight: 500 }}>{video.title}</span>
                                            <ExternalLink size={16} color="#9ca3af" />
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Books;
