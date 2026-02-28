import React from 'react';
import { motion } from 'framer-motion';
import { Youtube, ExternalLink } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const RecordedPrograms = () => {
    const playlistId = 'PLA8L7VKmSnUBIMzyGvxZDkIomb4cjWdOl';
    const embedUrl = `https://www.youtube.com/embed/videoseries?list=${playlistId}`;
    const youtubeUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', padding: '1.5rem' }}>
            <PageHeader title="Recorded Programs" />

            <div style={{ maxWidth: '60rem', margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '1.5rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Responsive Video Container */}
                    <div style={{
                        position: 'relative',
                        paddingBottom: '56.25%', // 16:9 Aspect Ratio
                        height: 0,
                        overflow: 'hidden',
                        borderRadius: '0.75rem',
                        backgroundColor: '#000',
                        marginBottom: '1.5rem'
                    }}>
                        <iframe
                            title="Recorded Programs Playlist"
                            src={embedUrl}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                border: 0
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Watch the recordings of our past programs and sathsangs.
                        </p>

                        <motion.a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#ff0000',
                                color: 'white',
                                borderRadius: '0.5rem',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 6px -1px rgb(239 68 68 / 0.2)'
                            }}
                        >
                            <Youtube size={20} />
                            View Playlist on YouTube
                            <ExternalLink size={16} />
                        </motion.a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default RecordedPrograms;
