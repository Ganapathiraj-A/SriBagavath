import { useEffect } from 'react';
import emediaData from '../data/emedia.json';

/**
 * WebImagePrefetcher
 * Throttled background prefetcher to avoid network saturation.
 */
const WebImagePrefetcher = () => {
    useEffect(() => {
        const prefetch = (url) => {
            if (!url || typeof url !== 'string') return;
            if (!url.startsWith('http') && !url.startsWith('/assets/')) return;
            
            const img = new Image();
            img.src = url;
        };

        // 1. CRITICAL ASSETS (Load these immediately but sparingly)
        const staticAssets = [
            '/assets/sri-bagavath-logo.png',
            '/assets/banner-slider-2a.jpg',
            '/assets/bagavath-ayya.png'
        ];
        staticAssets.forEach(prefetch);

        // 2. THROTTLED PREFETCH (Wait for initial visit to settle)
        const timer = setTimeout(() => {
            // Audio Books (Top 5)
            if (emediaData.audioBooks) {
                emediaData.audioBooks.slice(0, 5).forEach(book => prefetch(book.imageUrl));
            }
            
            // Digital Books (Top 5 per language)
            if (emediaData.digitalBooks && emediaData.digitalBooks.languages) {
                emediaData.digitalBooks.languages.forEach(lang => {
                    if (lang.books) {
                        lang.books.slice(0, 5).forEach(book => prefetch(book.cover));
                    }
                });
            }
        }, 4000); // 4-second delay for the first batch

        // 3. LOW PRIORITY (Deep assets)
        const deepTimer = setTimeout(() => {
            if (emediaData.audioBooks) {
                emediaData.audioBooks.slice(5, 20).forEach(book => prefetch(book.imageUrl));
            }
            
            if (emediaData.digitalBooks && emediaData.digitalBooks.languages) {
                emediaData.digitalBooks.languages.forEach(lang => {
                    if (lang.books) {
                        lang.books.slice(5, 25).forEach(book => prefetch(book.cover));
                    }
                });
            }
        }, 10000); // 10-second delay for the rest

        return () => {
            clearTimeout(timer);
            clearTimeout(deepTimer);
        };
    }, []);

    return null;
};

export default WebImagePrefetcher;
