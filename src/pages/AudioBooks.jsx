import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Play } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import PageHeader from '@/components/PageHeader';
import audioBooks from '@/data/audioBooks.json';

const AudioBooks = () => {
  const handleShare = async (e, book) => {
    e.stopPropagation();
    try {
      await Share.share({
        title: book.title,
        text: `Listen to ${book.title}`,
        url: book.link,
        dialogTitle: 'Share Audio Book'
      });
    } catch (err) {
      if (!Capacitor.isNativePlatform()) {
        navigator.clipboard.writeText(book.link);
        alert("Link copied to clipboard!");
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
      <PageHeader title="Audio Books" />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '1rem',
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {audioBooks.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => window.open(book.link, '_blank')}
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              cursor: 'pointer',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            whileHover={{ y: -4, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Image Aspect Ratio Container */}
            <div style={{ position: 'relative', paddingTop: '140%', backgroundColor: '#f3f4f6' }}>
              <img
                src={book.image}
                alt={book.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />

              {/* Play Icon Overlay (always visible slightly or on hover) */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                padding: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Play size={16} fill="var(--color-primary)" color="var(--color-primary)" />
              </div>
            </div>

            {/* Info */}
            <div style={{
              padding: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'white',
              borderTop: '1px solid #f3f4f6'
            }}>
              <span style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: '#374151',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                marginRight: '0.5rem'
              }}>
                {book.title}
              </span>
              <button
                onClick={(e) => handleShare(e, book)}
                style={{
                  padding: '6px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Share2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AudioBooks;
