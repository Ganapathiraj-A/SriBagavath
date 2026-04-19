import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Maximize2, Edit2, Share2, Folder, ArrowLeft, Download, Loader2, ChevronDown } from 'lucide-react';
import { collection, query, getDocs, orderBy, onSnapshot } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { shareImage } from '@/utils/shareUtils';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const Gallery = () => {
    const navigate = useNavigate();
    const { isAdmin, hasAccess, loading: authLoading } = useAdminAuth();
    const { t, galleryTabLabels } = useGlobalSettings();
    const [images, setImages] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [galleryCategories, setGalleryCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const qImages = query(collection(db, 'gallery'));
        const unsubscribe = onSnapshot(qImages, (snapshot) => {
            const imgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Tiered Memory Sort (Null-Safe)
            const getTime = (ts) => {
                if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
                if (ts instanceof Date) return ts.getTime();
                if (typeof ts === 'number') return ts;
                if (typeof ts === 'string') return new Date(ts).getTime() || 0;
                return 0;
            };

            imgs.sort((a, b) => {
                const timeA = getTime(a.createdAt);
                const timeB = getTime(b.createdAt);
                if (timeB !== timeA) return timeB - timeA;
                
                const orderA = parseInt(a.order) || 0;
                const orderB = parseInt(b.order) || 0;
                if (orderA !== orderB) return orderA - orderB;
                
                return String(a.id).localeCompare(String(b.id));
            });

            setImages(imgs);
            setLoading(false);
        }, (error) => {
            console.error("Gallery images real-time sync failed:", error);
            setLoading(false);
        });

        // Other non-real-time fetches can stay as-is for now or also be snapshots
        const fetchMeta = async () => {
            try {
                const qEvents = query(collection(db, 'gallery_events'), orderBy('order', 'asc'));
                const eventSnap = await getDocs(qEvents);
                setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const qCats = query(collection(db, 'gallery_categories'), orderBy('order', 'asc'));
                const catSnap = await getDocs(qCats);
                setGalleryCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Meta fetch failed:", e);
            }
        };
        fetchMeta();

        return () => unsubscribe();
    }, []);

    const filteredImages = useMemo(() => {
        return images.filter(img => {
            const cat = (img.category || 'general').toLowerCase().trim();
            const targetTab = activeTab.toLowerCase().trim();
            
            if (targetTab === 'general') return cat === 'general';
            if (targetTab === 'ayya') return cat === 'ayya' || cat === 'ayyas photos';
            if (targetTab === 'events') {
                if (cat !== 'events') return false;
                return String(img.eventId || '') === String(selectedEventId || '');
            }
            if (targetTab === 'others') {
                if (cat !== 'others') return false;
                if (!selectedCategoryId) return true; // Show all 'others' if no sub-cat selected
                return String(img.customCategoryId || '') === String(selectedCategoryId || '');
            }
            return false;
        });
    }, [images, activeTab, selectedEventId, selectedCategoryId]);

    const selectedEvent = events.find(ev => ev.id === selectedEventId);

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

    const handleDownload = async (img) => {
        if (!img || !img.url) return;
        try {
            const response = await fetch(img.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', (img.caption || 'sri-bagavath-gallery').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed:", error);
            window.open(img.url, '_blank');
        }
    };

    if (loading) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <PageHeader title={t('GALLERY')} />
                <div style={{ 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '2rem',
                    gap: '1.5rem'
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ color: 'var(--color-primary)' }}
                    >
                        <Loader2 size={48} />
                    </motion.div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ 
                            fontSize: '1.125rem', 
                            fontWeight: 700, 
                            color: 'var(--color-text)',
                            marginBottom: '0.4rem'
                        }}>
                            {t('LOADING_GALLERY')}
                        </div>
                        <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--color-text-muted)'
                        }}>
                            {t('FETCHING_MOMENTS')}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader 
                title={t('GALLERY')} 
                rightAction={(isAdmin || hasAccess('GALLERY_MANAGEMENT')) ? (
                    <button 
                        onClick={() => navigate('/admin/gallery')}
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
                        {t('EDIT') || 'Edit'}
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
                    { id: 'general', label: galleryTabLabels.general || t('GENERAL_TAB') },
                    { id: 'ayya', label: galleryTabLabels.ayya || t('AYYAS_PHOTOS') },
                    { id: 'events', label: galleryTabLabels.events || t('RECENT_EVENTS') }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSelectedEventId(null);
                                setSelectedCategoryId(null);
                                setSelectedIndex(null);
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

                {galleryCategories.length > 0 && (
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
                            {selectedCategoryId ? (galleryCategories.find(c => c.id === selectedCategoryId)?.name) : (galleryTabLabels.others || t('OTHERS_TAB'))}
                            <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            {activeTab === 'others' && (
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
                                    {galleryCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setActiveTab('others');
                                                setSelectedCategoryId(cat.id);
                                                setSelectedEventId(null);
                                                setIsDropdownOpen(false);
                                                setSelectedIndex(null);
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

            {activeTab === 'events' && selectedEventId && (
                <div style={{
                    padding: '0.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)'
                }}>
                    <button 
                        onClick={() => setSelectedEventId(null)}
                        style={{
                            padding: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: 'var(--color-primary-transparent)',
                            color: 'var(--color-primary)',
                            borderRadius: '0.75rem',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={16} />
                        {t('BACK') || 'Back'}
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        / {selectedEvent?.name}
                    </span>
                </div>
            )}

            {activeTab === 'events' && !selectedEventId ? (
                <div style={{
                    padding: '1rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem',
                    maxWidth: '60rem',
                    margin: '0 auto'
                }}>
                    {events.map(event => (
                        <motion.div
                            key={event.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedEventId(event.id)}
                            style={{
                                backgroundColor: 'var(--color-card)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            <div style={{
                                width: '56px',
                                height: '56px',
                                backgroundColor: 'var(--color-primary-transparent)',
                                borderRadius: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-primary)'
                            }}>
                                <Folder size={28} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text)', marginBottom: '0.2rem' }}>{event.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{images.filter(img => img.eventId === event.id).length} {t('PHOTOS_COUNT')}</div>
                            </div>
                        </motion.div>
                    ))}
                    {events.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            {t('NO_EVENTS_FOUND')}
                        </div>
                    )}
                </div>
            ) : (
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
                                top: '0.6rem',
                                right: '0.6rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                zIndex: 20
                            }}>
                                <motion.div 
                                    whileTap={{ scale: 0.85 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openLightbox(index);
                                    }}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Maximize2 size={16} />
                                </motion.div>
                                <motion.button 
                                    whileTap={{ scale: 0.85 }}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDownload(img); 
                                    }}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Download size={16} />
                                </motion.button>
                                <motion.button 
                                    whileTap={{ scale: 0.85 }}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        shareImage(img).catch(() => {});
                                    }}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <Share2 size={16} />
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                    {filteredImages.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                            {t('NO_IMAGES_FOUND')}
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {selectedIndex !== null && filteredImages[selectedIndex] && (
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
                                onClick={() => handleDownload(filteredImages[selectedIndex])}
                                style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <Download size={28} />
                            </button>
                            <button 
                                onClick={() => shareImage(filteredImages[selectedIndex]).catch(() => {})}
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
