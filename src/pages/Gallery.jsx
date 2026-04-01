import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Maximize2, Edit2, Share2 } from 'lucide-react';
import { collection, query, getDocs, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { shareImage } from '@/utils/shareUtils';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';

const Gallery = () => {
    const navigate = useNavigate();
    const { isAdmin, hasAccess, loading: authLoading } = useAdminAuth();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [subTab, setSubTab] = useState('events');
    const [selectedIndex, setSelectedIndex] = useState(null);

    useEffect(() => {
        const fetchImages = async () => {
            try {
                const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
                const snapshot = await getDocs(q);
                setImages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching gallery:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchImages();
    }, []);

    const filteredImages = images.filter(img => {
        const cat = img.category || 'general';
        if (activeTab === 'general') return cat === 'general';
        if (activeTab === 'recent') return cat === subTab;
        return false;
    });

    const openLightbox = (index) => setSelectedIndex(index);
    const closeLightbox = () => setSelectedIndex(null);
    const nextImage = (e) => {
        e.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredImages.length);
    };
    const prevImage = (e) => {
        e.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
                <PageHeader title="Gallery" />
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} style={{ aspectRatio: '1', backgroundColor: 'var(--color-border)', borderRadius: '0.75rem', animation: 'pulse 2s infinite' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader 
                title="Gallery" 
                rightAction={(isAdmin || hasAccess('GALLERY_MANAGEMENT')) ? (
                    <button 
                        onClick={() => navigate('/admin/gallery')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}
                    >
                        <Edit2 size={20} />
                    </button>
                ) : null}
            />

            {/* Tabs */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--color-border)',
                padding: '0 1rem',
                backgroundColor: 'var(--color-surface)',
                position: 'sticky',
                top: '56px',
                zIndex: 10
            }}>
                {[
                    { id: 'general', label: 'General' },
                    { id: 'recent', label: 'Recent' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSelectedIndex(null);
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
                                    layoutId="galleryTabUnderline"
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
            </div>

            {/* Sub-Tabs (only for Recent) */}
            <AnimatePresence>
                {activeTab === 'recent' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            position: 'sticky',
                            top: '109px', // 56px PageHeader + 53px MainTabs
                            zIndex: 9,
                            overflow: 'hidden'
                        }}
                    >
                        {[
                            { id: 'events', label: 'Events' },
                            { id: 'ayya', label: 'Ayya' }
                        ].map(tab => {
                            const isActive = subTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setSubTab(tab.id);
                                        setSelectedIndex(null);
                                    }}
                                    style={{
                                        padding: '0.625rem 0.25rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="gallerySubTabUnderline"
                                            style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                left: 0,
                                                right: 0,
                                                height: '2px',
                                                backgroundColor: 'var(--color-primary)',
                                                borderRadius: '99px'
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{
                padding: '1rem',
                columns: '2 200px',
                columnGap: '1rem',
                maxWidth: '60rem',
                margin: '0 auto'
            }}>
                {filteredImages.map((img, index) => (
                    <motion.div
                        key={img.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => openLightbox(index)}
                        style={{
                            marginBottom: '1rem',
                            breakInside: 'avoid',
                            borderRadius: '0.75rem',
                            overflow: 'hidden',
                            backgroundColor: 'var(--color-card)',
                            boxShadow: 'var(--shadow-sm)',
                            cursor: 'pointer',
                            position: 'relative',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        <LazyImage 
                            src={img.url} 
                            alt={img.caption} 
                            width="100%" 
                            height="auto" 
                            objectFit="cover"
                        />
                        {img.caption && (
                            <div style={{
                                padding: '0.5rem',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                textAlign: 'center',
                                backgroundColor: 'var(--color-card)'
                            }}>
                                {img.caption}
                            </div>
                        )}
                        <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            display: 'flex',
                            gap: '0.4rem'
                        }}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); shareImage(img); }}
                                style={{
                                    padding: '0.4rem',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <Share2 size={14} />
                            </button>
                            <div style={{
                                padding: '0.4rem',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Maximize2 size={14} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {selectedIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeLightbox}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 1000,
                            backgroundColor: 'rgba(0,0,0,0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem',
                            touchAction: 'none'
                        }}
                    >
                        <div style={{ position: 'absolute', top: '2rem', right: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => shareImage(filteredImages[selectedIndex])}
                                style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <Share2 size={28} />
                            </button>
                            <button 
                                onClick={closeLightbox}
                                style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={32} />
                            </button>
                        </div>

                        <button 
                            onClick={prevImage}
                            style={{ position: 'absolute', left: '1rem', color: 'white', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }}
                        >
                            <ChevronLeft size={40} />
                        </button>

                        <motion.div
                            key={selectedIndex}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{ maxWidth: '100%', maxHeight: '80vh', position: 'relative' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img 
                                src={filteredImages[selectedIndex].url} 
                                alt={filteredImages[selectedIndex].caption}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '80vh',
                                    borderRadius: '0.5rem',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                                }}
                            />
                            {filteredImages[selectedIndex].caption && (
                                <div style={{
                                    marginTop: '1rem',
                                    color: 'white',
                                    textAlign: 'center',
                                    fontSize: '1.125rem'
                                }}>
                                    {filteredImages[selectedIndex].caption}
                                </div>
                            )}
                        </motion.div>

                        <button 
                            onClick={nextImage}
                            style={{ position: 'absolute', right: '1rem', color: 'white', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', zIndex: 10 }}
                        >
                            <ChevronRight size={40} />
                        </button>

                        <div style={{
                            position: 'absolute',
                            bottom: '2rem',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.875rem'
                        }}>
                            {selectedIndex + 1} / {filteredImages.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Gallery;
