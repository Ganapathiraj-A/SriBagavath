import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Youtube, ExternalLink, Send } from 'lucide-react';
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
                console.log("Fetching related videos (unordered for migration safety)...");
                const q = query(collection(db, 'relatedVideos'));
                const snapshot = await getDocs(q);
                console.log("Public Videos Snapshot:", snapshot.docs.length);

                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // Sort in memory to ensure visibility of legacy items
                fetched.sort((a, b) => {
                    const orderA = a.order ?? 999;
                    const orderB = b.order ?? 999;
                    return orderA - orderB;
                });

                setVideos(fetched);
            } catch (error) {
                console.error("Error fetching related videos on public page:", error);
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
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'var(--color-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        title="Edit"
                    >
                        <Edit2 size={20} color="var(--color-primary)" />
                    </button>
                )}
            />

            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            Loading videos...
                        </div>
                    ) : videos.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            No videos configured yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Static Social Links (Merged from Conversations) */}
                            <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                whileHover={{ scale: 1.01, backgroundColor: 'var(--color-surface)' }}
                                onClick={() => window.open('https://t.me/Bagavath_conversations', '_blank')}
                                style={{
                                    width: '100%',
                                    padding: '1.25rem',
                                    backgroundColor: 'var(--color-background)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--color-border)',
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
                                        backgroundColor: 'var(--color-primary-transparent)', // Theme from Conversations
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Send size={20} color="var(--color-primary)" />
                                    </div>
                                    <span style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: 500 }}>
                                        Telegram
                                    </span>
                                </div>
                                <ExternalLink size={18} color="var(--color-text-light)" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.01, backgroundColor: 'var(--color-surface)' }}
                                onClick={() => window.open('https://youtube.com/@bagavathpathai?si=F2JEXlLNpDngYujc', '_blank')}
                                style={{
                                    width: '100%',
                                    padding: '1.25rem',
                                    backgroundColor: 'var(--color-background)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--color-border)',
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
                                        backgroundColor: 'var(--color-primary-transparent)', // Theme from Conversations
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Youtube size={20} color="var(--color-primary)" />
                                    </div>
                                    <span style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: 500 }}>
                                        YouTube
                                    </span>
                                </div>
                                <ExternalLink size={18} color="var(--color-text-light)" />
                            </motion.button>

                            {/* Dynamic Playlist Videos */}
                            {videos.map((video, index) => (
                                <motion.button
                                    key={video.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (index + 3) * 0.1 }}
                                    whileHover={{ scale: 1.01, backgroundColor: 'var(--color-surface)' }}
                                    onClick={() => window.open(video.url, '_blank')}
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        backgroundColor: 'var(--color-background)',
                                        borderRadius: '0.75rem',
                                        border: '1px solid var(--color-border)',
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
                                            backgroundColor: 'var(--color-error-transparent)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Youtube size={20} color="var(--color-error)" />
                                        </div>
                                        <span style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: 500 }}>
                                            {video.title}
                                        </span>
                                    </div>
                                    <ExternalLink size={18} color="var(--color-text-light)" />
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
