import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, ExternalLink, Send, ChevronDown, Edit2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { collection, query, onSnapshot, getDocs, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';


const Videos = () => {
    const navigate = useNavigate();
    const { hasAccess } = useAdminAuth();
    const { t } = useGlobalSettings();
    const isAdmin = hasAccess('RELATED_VIDEO_MANAGEMENT');
    const [videos, setVideos] = useState([]);
    const [videoCategories, setVideoCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        // Clear notification badge
        localStorage.setItem('lastVisited_videos', Date.now().toString());

        console.log("Subscribing to related videos (unordered for migration safety)...");
        const q = query(collection(db, 'relatedVideos'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("Public Videos Snapshot:", snapshot.docs.length);
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Sort in memory to ensure visibility of legacy items
            fetched.sort((a, b) => {
                const orderA = a.order ?? 999;
                const orderB = b.order ?? 999;
                return orderA - orderB;
            });

            setVideos(fetched);
            setLoading(false);
        }, (error) => {
            console.error("Error subscribing to related videos:", error);
            setLoading(false);
        });

        // Fetch categories
        const fetchCats = async () => {
            try {
                const qCats = query(collection(db, 'video_categories'), orderBy('order', 'asc'));
                const catSnap = await getDocs(qCats);
                setVideoCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Error fetching video categories:", e);
            }
        };
        fetchCats();

        return () => unsubscribe();
    }, []);

    const filteredVideos = useMemo(() => {
        return videos.filter(v => {
            const cat = v.category || 'general';
            if (cat !== activeTab) return false;
            if (activeTab === 'others') {
                return v.customCategoryId === selectedCategoryId;
            }
            return true;
        });
    }, [videos, activeTab, selectedCategoryId]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', padding: '1.5rem' }}>
            <PageHeader
                title={t('RELATED_VIDEOS')}
                rightAction={isAdmin && (
                    <button
                        onClick={() => navigate('/admin/related-videos', { state: { returnPath: '/videos' } })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.8rem',
                            backgroundColor: 'var(--color-primary-transparent)',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        <Edit2 size={16} />
                        Edit
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
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Tabs UI */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '2rem',
                                marginBottom: '1.5rem',
                                borderBottom: '1px solid var(--color-border)',
                                padding: '0 1rem'
                            }}>
                                {[
                                    { id: 'general', label: t('GENERAL') },
                                    { id: 'teachers', label: t('TEACHERS') }
                                ].map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setSelectedCategoryId(null);
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                padding: '0.75rem 0.25rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                fontSize: '0.875rem',
                                                fontWeight: 700,
                                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'color 0.2s'
                                            }}
                                        >
                                            {tab.label}
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTabUnderline_vids"
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: '3px',
                                                        backgroundColor: 'var(--color-primary)',
                                                        borderRadius: '99px'
                                                    }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}

                                {videoCategories.length > 0 && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            style={{
                                                padding: '0.75rem 0.25rem',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                fontSize: '0.875rem',
                                                fontWeight: 700,
                                                color: activeTab === 'others' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'color 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {selectedCategoryId ? (videoCategories.find(c => c.id === selectedCategoryId)?.name) : t('OTHERS_TAB')}
                                            <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                            {activeTab === 'others' && (
                                                <motion.div
                                                    layoutId="activeTabUnderline_vids"
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: '3px',
                                                        backgroundColor: 'var(--color-primary)',
                                                        borderRadius: '99px'
                                                    }}
                                                />
                                            )}
                                        </button>

                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        right: 0,
                                                        backgroundColor: 'var(--color-surface)',
                                                        border: '1px solid var(--color-border)',
                                                        borderRadius: '8px',
                                                        boxShadow: 'var(--shadow-lg)',
                                                        zIndex: 1000,
                                                        minWidth: '160px',
                                                        marginTop: '4px',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {videoCategories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => {
                                                                setActiveTab('others');
                                                                setSelectedCategoryId(cat.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 16px',
                                                                textAlign: 'left',
                                                                border: 'none',
                                                                backgroundColor: selectedCategoryId === cat.id ? 'var(--color-primary-transparent)' : 'transparent',
                                                                color: selectedCategoryId === cat.id ? 'var(--color-primary)' : 'var(--color-text)',
                                                                fontSize: '0.9rem',
                                                                fontWeight: selectedCategoryId === cat.id ? 600 : 500,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Static Social Links (Only in General Tab) */}
                                {activeTab === 'general' && (
                                    <>
                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
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
                                                    backgroundColor: 'var(--color-primary-transparent)',
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

                                        <motion.button
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
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
                                                    backgroundColor: 'var(--color-primary-transparent)',
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
                                    </>
                                )}

                                {/* Dynamic Playlist Videos (Filtered) */}
                                {filteredVideos.length === 0 && activeTab !== 'general' ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        No videos in this section yet.
                                    </div>
                                ) : (
                                    filteredVideos.map((video, index) => (
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
                                                    {video.title || 'Untitled Playlist'}
                                                </span>
                                            </div>
                                            <ExternalLink size={18} color="var(--color-text-light)" />
                                        </motion.button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Videos;
