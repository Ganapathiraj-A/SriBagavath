import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Youtube, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { collection, query, getDocs, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Edit2 } from 'lucide-react';

const Videos = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();
    const isAdmin = hasAccess('RELATED_VIDEO_MANAGEMENT');
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const q = query(collection(db, 'relatedVideos'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                setVideos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching related videos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, []);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', padding: '1.5rem' }}>
            <PageHeader
                title="Related Videos"
                rightAction={isAdmin && (
                    <button
                        onClick={() => navigate('/admin/related-videos', { state: { returnPath: '/videos' } })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: '#fff7ed',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '20px',
                            color: 'var(--color-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Edit2 size={16} /> Edit
                    </button>
                )}
            />

            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            Loading videos...
                        </div>
                    ) : videos.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            No videos configured yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {videos.map((video, index) => (
                                <motion.button
                                    key={video.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ scale: 1.01, backgroundColor: '#f9fafb' }}
                                    onClick={() => window.open(video.url, '_blank')}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        backgroundColor: 'white',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        textAlign: 'left',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            padding: '0.5rem',
                                            borderRadius: '9999px',
                                            backgroundColor: '#fef2f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Youtube size={20} color="#ef4444" />
                                        </div>
                                        <span style={{ fontSize: '1rem', color: '#111827', fontWeight: 500 }}>
                                            {video.title}
                                        </span>
                                    </div>
                                    <ExternalLink size={18} color="#9ca3af" />
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Videos;
