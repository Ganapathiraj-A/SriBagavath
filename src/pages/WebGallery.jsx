import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, orderBy } from '../utils/FirestoreProxy';
import { db } from '../firebase';
import { X, ChevronLeft, ChevronRight, Maximize2, Share2 } from 'lucide-react';
import { shareItem } from '../utils/shareUtils';
import './WebPages.css';

const WebGallery = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedIndex, setSelectedIndex] = useState(null);
    const shareImageCacheRef = useRef(new Map());

    useEffect(() => {
        console.log("[WebGallery] Setting up gallery snapshot listener...");
        const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("[WebGallery] Snapshot received. Size:", snapshot.docs.length);
            setImages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (error) => {
            console.error("[WebGallery] Error fetching gallery:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredImages = images.filter(img => (img.category || 'general') === activeTab);

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

    if (loading) {
        return (
            <div className="web-gallery-page">
                <div className="web-container">
                    <div className="emedia-header-spacer" />
                    <div className="gallery-grid">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="gallery-skeleton" />
                        ))}
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
                            { id: 'ayya', label: 'Ayya' },
                            { id: 'events', label: 'Recent Events' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className={`emedia-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedIndex(null);
                                }}
                            >
                                <span>{tab.label}</span>
                                {activeTab === tab.id && <div className="active-underline" />}
                            </button>
                        ))}
                    </div>

                </div>

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
                            <img
                                src={img.url}
                                alt={img.caption || 'Sri Bagavath Gallery'}
                                crossOrigin="anonymous"
                                onLoad={(e) => {
                                    cacheShareableImage(img.id, e.currentTarget);
                                }}
                            />
                            <div className="gallery-overlay">
                                <Maximize2 size={24} />
                                {img.caption && <p>{img.caption}</p>}
                                <button
                                    className="gallery-share-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShareImage(img);
                                    }}
                                >
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {filteredImages.length === 0 && (
                    <div className="web-no-results">
                        <p>No images found in this category.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedIndex !== null && (
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
                            <img
                                src={filteredImages[selectedIndex].url}
                                alt={filteredImages[selectedIndex].caption}
                                crossOrigin="anonymous"
                                onLoad={(e) => {
                                    cacheShareableImage(filteredImages[selectedIndex].id, e.currentTarget);
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
                            <button
                                className="lightbox-share"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareImage(filteredImages[selectedIndex]);
                                }}
                            >
                                <Share2 size={24} /> Share
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WebGallery;
