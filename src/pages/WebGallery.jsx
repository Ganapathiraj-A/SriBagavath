import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, orderBy } from '../utils/FirestoreProxy';
import { db } from '../firebase';
import { X, ChevronLeft, ChevronRight, Maximize2, Share2, Folder, ArrowLeft, Download, Loader2, ChevronDown } from 'lucide-react';
import { shareItem } from '../utils/shareUtils';
import LazyImage from '../components/LazyImage';
import './WebPages.css';

const WebGallery = () => {
    const [images, setImages] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [galleryCategories, setGalleryCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const shareImageCacheRef = useRef(new Map());

    // Helper to pick the correct image URL from multiple possible field names
    const getImageUrl = (img) => {
        if (!img) return null;
        return [img.url, img.imageUrl, img.image, img.photo, img.photoURL, img.cover, img.thumb, img.thumbnail]
            .find(u => u && typeof u === 'string' && u.length > 0) || null;
    };

    useEffect(() => {
        console.log("[WebGallery] Setting up gallery data fetch...");
        
        const fetchGallery = async () => {
            setLoading(true);
            
            // Fetch Images
            try {
                const qImages = query(collection(db, 'gallery'), orderBy('order', 'asc'));
                const imgSnap = await getDocs(qImages);
                const loadedImages = imgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setImages(loadedImages);
            } catch (error) {
                console.error("[WebGallery] Error fetching gallery images:", error);
            }

            // Fetch Events
            try {
                const qEvents = query(collection(db, 'gallery_events'), orderBy('order', 'asc'));
                const eventSnap = await getDocs(qEvents);
                const loadedEvents = eventSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEvents(loadedEvents);
            } catch (error) {
                console.error("[WebGallery] Error fetching gallery events:", error);
            }

            // Fetch Categories
            try {
                const qCats = query(collection(db, 'gallery_categories'), orderBy('order', 'asc'));
                const catSnap = await getDocs(qCats);
                const loadedCats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setGalleryCategories(loadedCats);
            } catch (error) {
                console.error("[WebGallery] Error fetching gallery categories:", error);
            }
            
            setLoading(false);
        };

        fetchGallery();
    }, []);

    const filteredImages = images.filter(img => {
        const cat = img.category || 'general';
        if (cat !== activeTab) return false;
        if (activeTab === 'events') {
            return img.eventId === selectedEventId;
        }
        if (activeTab === 'others') {
            return img.customCategoryId === selectedCategoryId;
        }
        return true;
    });

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

    const cacheShareableImage = async (imageId, imageElement) => {
        if (!imageId || !imageElement || shareImageCacheRef.current.has(imageId)) return;
        if (!imageElement.complete || !imageElement.naturalWidth || !imageElement.naturalHeight) return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.drawImage(imageElement, 0, 0);

            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            });

            if (!blob) return;

            shareImageCacheRef.current.set(imageId, {
                blob,
                mimeType: blob.type || 'image/jpeg'
            });
        } catch (error) {
            console.debug('[WebGallery] Share image cache skipped:', error);
        }
    };

    const handleShareImage = async (img) => {
        if (!img) return;

        const cachedImage = shareImageCacheRef.current.get(img.id);

        await shareItem({
            title: 'Sri Bagavath Gallery',
            text: img.caption || 'Check out this image from Sri Bagavath Gallery',
            url: img.url,
            imageUrl: img.url,
            imageData: cachedImage?.blob,
            mimeType: cachedImage?.mimeType,
            fileNameBase: img.caption || 'gallery-image',
            dialogTitle: 'Share Image'
        });
    };

    const handleDownload = async (img) => {
        const url = getImageUrl(img);
        if (!url) return;
        try {
            // Check if we have a cached blob from share preparation
            const cached = shareImageCacheRef.current.get(img.id);
            let blob;
            
            if (cached && cached.blob) {
                blob = cached.blob;
            } else {
                const response = await fetch(url);
                blob = await response.blob();
            }

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', (img.caption || 'gallery-image').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("[WebGallery] Download failed:", error);
            // Fallback to opening in new window
            window.open(url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="web-gallery-page">
                <div className="web-container" style={{ 
                    minHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ color: 'var(--web-nav-bg)', marginBottom: '1.5rem' }}
                    >
                        <Loader2 size={48} />
                    </motion.div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ color: 'var(--web-header-bg)', marginBottom: '0.5rem' }}>Loading Gallery</h2>
                        <p style={{ color: '#64748b' }}>Preparing beautiful moments for you...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="web-gallery-page">
            <div className="web-container">
                <div className="emedia-header-spacer" />
                
                <header className="page-section-header">
                    <h1>Gallery</h1>
                    <p>Capturing the essence of Sri Bagavath Mission.</p>
                </header>

                <div className="gallery-tabs-container">
                    <div className="emedia-tabs">
                        {[
                            { id: 'general', label: 'General' },
                            { id: 'ayya', label: "Ayyas Photos" },
                            { id: 'events', label: 'Recent Events' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className={`emedia-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedEventId(null);
                                    setSelectedCategoryId(null);
                                    setSelectedIndex(null);
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <span>{tab.label}</span>
                                {activeTab === tab.id && <div className="active-underline" />}
                            </button>
                        ))}

                        {galleryCategories.length > 0 && (
                            <div className="web-dropdown-container" style={{ position: 'relative' }}>
                                <button
                                    className={`emedia-tab-btn ${activeTab === 'others' ? 'active' : ''}`}
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>{selectedCategoryId ? galleryCategories.find(c => c.id === selectedCategoryId)?.name : 'Others'}</span>
                                    <ChevronDown size={16} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    {activeTab === 'others' && <div className="active-underline" />}
                                </button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="web-dropdown-menu"
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                zIndex: 100,
                                                minWidth: '180px',
                                                marginTop: '8px',
                                                overflow: 'hidden',
                                                padding: '4px'
                                            }}
                                        >
                                            {galleryCategories.map(cat => (
                                                <button
                                                    key={cat.id}
                                                    className="dropdown-item"
                                                    onClick={() => {
                                                        setActiveTab('others');
                                                        setSelectedCategoryId(cat.id);
                                                        setSelectedEventId(null);
                                                        setIsDropdownOpen(false);
                                                        setSelectedIndex(null);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 16px',
                                                        textAlign: 'left',
                                                        border: 'none',
                                                        backgroundColor: selectedCategoryId === cat.id ? '#f1f5f9' : 'transparent',
                                                        color: selectedCategoryId === cat.id ? 'var(--web-nav-bg)' : '#475569',
                                                        fontSize: '0.9rem',
                                                        fontWeight: selectedCategoryId === cat.id ? 600 : 500,
                                                        cursor: 'pointer',
                                                        borderRadius: '6px'
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
                        <div className="gallery-breadcrumbs">
                            <button className="back-btn" onClick={() => setSelectedEventId(null)}>
                                <ArrowLeft size={18} /> Back to Events
                            </button>
                            <span className="current-folder">/ {selectedEvent?.name}</span>
                        </div>
                    )}
                </div>

                {activeTab === 'events' && !selectedEventId ? (
                    <div className="events-grid">
                        {events.map(event => (
                            <motion.div
                                key={event.id}
                                className="event-folder-card"
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedEventId(event.id)}
                            >
                                <div className="folder-icon-wrapper">
                                    <Folder size={48} className="folder-icon" />
                                </div>
                                <div className="event-info">
                                    <h3>{event.name}</h3>
                                    <p>{images.filter(img => img.eventId === event.id).length} photos</p>
                                </div>
                            </motion.div>
                        ))}
                        {events.length === 0 && (
                            <div className="web-no-results">
                                <p>No events found.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="gallery-grid">
                            {filteredImages.map((img, index) => (
                                <motion.div
                                    key={img.id}
                                    className="gallery-item"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    onClick={() => openLightbox(index)}
                                >
                                    <LazyImage
                                        src={getImageUrl(img)}
                                        alt={img.caption || 'Sri Bagavath Gallery'}
                                        borderRadius="20px"
                                        placeholder={() => <div style={{ backgroundColor: '#f3f4f6', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" /></div>}
                                    />
                                    <div className="gallery-overlay">
                                        <Maximize2 size={24} />
                                        {img.caption && <p>{img.caption}</p>}
                                        <div className="gallery-action-buttons">
                                            <button
                                                className="gallery-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(img);
                                                }}
                                                title="Download Image"
                                            >
                                                <Download size={20} />
                                            </button>
                                            <button
                                                className="gallery-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareImage(img).catch(() => {});
                                                }}
                                                title="Share Image"
                                            >
                                                <Share2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        {filteredImages.length === 0 && (
                            <div className="web-no-results">
                                <p>No images found in this folder.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {selectedIndex !== null && filteredImages[selectedIndex] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lightbox-overlay"
                        onClick={closeLightbox}
                    >
                        <button className="lightbox-close" onClick={closeLightbox}><X size={32} /></button>
                        
                        <button className="lightbox-nav prev" onClick={prevImage}><ChevronLeft size={48} /></button>
                        
                        <motion.div 
                            className="lightbox-content"
                            key={selectedIndex}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <LazyImage
                                src={getImageUrl(filteredImages[selectedIndex])}
                                alt={filteredImages[selectedIndex].caption}
                                borderRadius="8px"
                                objectFit="contain"
                                style={{
                                    maxWidth: '90vw',
                                    maxHeight: '70vh',
                                    backgroundColor: 'transparent'
                                }}
                            />
                            {filteredImages[selectedIndex].caption && (
                                <div className="lightbox-caption">{filteredImages[selectedIndex].caption}</div>
                            )}
                        </motion.div>

                        <button className="lightbox-nav next" onClick={nextImage}><ChevronRight size={48} /></button>
                        
                        <div className="lightbox-footer">
                            <div className="lightbox-counter">
                                {selectedIndex + 1} / {filteredImages.length}
                            </div>
                            <div className="lightbox-actions">
                                <button
                                    className="lightbox-action"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(filteredImages[selectedIndex]);
                                    }}
                                >
                                    <Download size={24} /> <span>Download</span>
                                </button>
                                <button
                                    className="lightbox-action"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareImage(filteredImages[selectedIndex]).catch(() => {});
                                    }}
                                >
                                    <Share2 size={24} /> <span>Share</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WebGallery;
