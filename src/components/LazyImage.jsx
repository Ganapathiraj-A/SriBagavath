import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase';
import { doc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { trackImageSource, normalizeImageSrc } from '@/utils/imageUtils';
import { getCachedImage } from '@/utils/PersistentImageCache';

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
    version = '',
    alt = "",
    priority = false, // New prop for above-the-fold assets
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
    // Set to true immediately so images start loading as soon as the component renders,
    // but the loading="lazy" attribute (native) will handle actual network deference.
    const [isVisible, setIsVisible] = useState(true); 
    const containerRef = useRef(null);
    const hasTracked = useRef(false);

    useEffect(() => {
        if (!isVisible) return;

        // TRACKING LOGIC: Track once per component instance when it becomes visible
        const doTrack = (data) => {
            if (!hasTracked.current && data) {
                trackImageSource(data);
                hasTracked.current = true;
            }
        };

        // Fetch from Firestore if needed
        if (firestorePath && !currentSrc && !loading) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [collection, docId] = firestorePath.split('/');
                    const snap = await getDocCacheFirst(doc(db, collection, docId));
                    if (snap.exists()) {
                        const rawData = snap.data().cover || snap.data().image || snap.data().banner || snap.data().imageUrl || snap.data().base64;
                        if (rawData) {
                            const normalized = normalizeImageSrc(rawData);
                            setCurrentSrc(normalized);
                            imageCache.set(cacheKey, normalized);
                        }
                    }
                } catch (_err) {
                    console.error("LazyImage fetch failed:", firestorePath, _err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        } else if (currentSrc) {
            // If it's already in state (either from cache or direct src), 
            // track it now that it's visible.
            doTrack(currentSrc);
        } else if (src) {
            const loadWithCache = async () => {
                // If it's a remote URL, check/populate persistent cache
                const finalSrc = await getCachedImage(src, version);
                const normalized = normalizeImageSrc(finalSrc);
                
                if (normalized !== currentSrc) {
                    setCurrentSrc(normalized);
                    imageCache.set(cacheKey, normalized);
                }
                doTrack(normalized);
            };
            loadWithCache();
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
                    loading={priority ? "eager" : "lazy"}
                    {...(priority ? { fetchPriority: "high" } : {})}
                    style={{ width: '100%', height, objectFit }}
                />
            ) : (
                Placeholder ? <Placeholder /> : <div style={{ color: '#9ca3af' }}>...</div>
            )}
        </div>
    );
};

export default React.memo(LazyImage);
