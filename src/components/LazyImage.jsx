import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { doc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { trackImageSource } from '@/utils/imageUtils';

// Global Memory Cache for images (URLs or Base64)
const imageCache = new Map();

/**
 * LazyImage Component
 * 
 * Supports:
 * 1. Immediate src: If `src` is provided, it just handles lazy loading + memory caching.
 * 2. Firestore fetch: If `firestorePath` (e.g., "book_covers/docId") is provided, it fetches on visibility.
 */
const LazyImage = ({
    src,
    firestorePath,
    alt = "",
    placeholder: Placeholder,
    className = "",
    style = {},
    width = "100%",
    height = "100%",
    borderRadius = "0px",
    objectFit = "cover"
}) => {
    // Generate a unique cache key
    const cacheKey = firestorePath || src;
    const [currentSrc, setCurrentSrc] = useState(imageCache.get(cacheKey) || (firestorePath ? null : src));
    const [loading, setLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        // If we already have it in memory, no need to observe
        if (currentSrc) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [currentSrc]);

    useEffect(() => {
        // Fetch from Firestore if needed
        if (isVisible) {
            if (firestorePath && !currentSrc && !loading) {
                const fetchData = async () => {
                    setLoading(true);
                    try {
                        const [collection, docId] = firestorePath.split('/');
                        const snap = await getDocCacheFirst(doc(db, collection, docId));
                        if (snap.exists()) {
                            const data = snap.data().cover || snap.data().image || snap.data().banner;
                            if (data) {
                                setCurrentSrc(data);
                                imageCache.set(cacheKey, data);
                                trackImageSource(data);
                            }
                        }
                    } catch (_err) {
                        console.error("LazyImage fetch failed:", firestorePath, _err);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchData();
            } else if (src && !imageCache.has(src)) {
                // If direct src provided, cache it and track it only when it becomes visible
                imageCache.set(src, src);
                trackImageSource(src);
            } else if (src && imageCache.has(src) && !currentSrc) {
                // If it was already cached but currentSrc is null (shouldn't happen with initial state but safe)
                setCurrentSrc(src);
                trackImageSource(src);
            }
        }
    }, [isVisible, firestorePath, src, currentSrc, cacheKey]);

    const containerStyle = {
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        ...style
    };

    return (
        <div ref={containerRef} style={containerStyle} className={className}>
            {currentSrc ? (
                <img
                    src={currentSrc}
                    alt={alt}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit }}
                />
            ) : (
                Placeholder ? <Placeholder /> : <div style={{ color: '#9ca3af' }}>...</div>
            )}
        </div>
    );
};

export default React.memo(LazyImage);
