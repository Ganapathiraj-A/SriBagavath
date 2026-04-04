import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, onSnapshot, orderBy } from '../utils/FirestoreProxy';
import { db } from '../firebase';
import { X, ChevronLeft, ChevronRight, Maximize2, Share2 } from 'lucide-react';
import { shareItem } from '../utils/shareUtils';
import './WebPages.css';

const WebGallery = () => {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [subTab, setSubTab] = useState('events');
    const [selectedIndex, setSelectedIndex] = useState(null);

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
                            { id: 'recent', label: 'Recent' }
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

                    <AnimatePresence>
                        {activeTab === 'recent' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="gallery-sub-tabs"
                            >
                                {[
                                    { id: 'events', label: 'Events' },
                                    { id: 'ayya', label: 'Ayya' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        className={`sub-tab-btn ${subTab === tab.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSubTab(tab.id);
                                            setSelectedIndex(null);
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                            <div className="gallery-overlay">
                                <Maximize2 size={24} />
                                {img.caption && <p>{img.caption}</p>}
                                <button
                                    className="gallery-share-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        shareItem({
                                            title: 'Sri Bagavath Gallery',
                                            text: img.caption || 'Check out this image from Sri Bagavath Gallery',
                                            url: window.location.href,
                                            imageUrl: img.url,
                                            dialogTitle: 'Share Image'
                                        });
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
                            <img src={filteredImages[selectedIndex].url} alt={filteredImages[selectedIndex].caption} />
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
                                    shareItem({
                                        title: 'Sri Bagavath Gallery',
                                        text: filteredImages[selectedIndex].caption || 'Check out this image from Sri Bagavath Gallery',
                                        url: window.location.href,
                                        imageUrl: filteredImages[selectedIndex].url,
                                        dialogTitle: 'Share Image'
                                    });
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
