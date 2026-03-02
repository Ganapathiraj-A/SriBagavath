import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Play, Edit2, Music } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { collection, query, orderBy, onSnapshot } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';

const AudioBooks = () => {
  const navigate = useNavigate();
  const { hasAccess } = useAdminAuth();
  const canEdit = hasAccess('AUDIO_BOOKS_MANAGEMENT');
  const [audioBooks, setAudioBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'audio_books'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAudioBooks(books);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching audio books:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleShare = async (e, book) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const appUrl = 'https://play.google.com/store/apps/details?id=com.bhavathpathai.app&pcampaignid=web_share';
      const text = `📲 *Download the Sri Bagavath App:* ${appUrl}\n\n🎧 *${book.title}*\n🔗 *Audio Link:* ${book.link}\n\nDownload the App for the latest updates`;
      await Share.share({
        title: book.title,
        text: text,
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
      <PageHeader
        title="Audio Books"
        rightAction={canEdit && (
          <button
            onClick={() => navigate('/admin/audio-books', { state: { returnPath: '/audio-books' } })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
            title="Edit"
          >
            <Edit2 size={20} color="var(--color-primary)" />
          </button>
        )}
      />

      <div style={{
        padding: '0.75rem 1.25rem',
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: '0.85rem',
        fontStyle: 'italic',
        lineHeight: 1.5
      }}>
        We Thank Smt Radha Kannan for compiling audio books
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading audio books...</div>
      ) : audioBooks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No audio books found.</div>
      ) : (
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
                backgroundColor: 'var(--color-card)',
                borderRadius: '1rem',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Image Aspect Ratio Container */}
              <div style={{ position: 'relative', paddingTop: '140%', backgroundColor: 'var(--color-surface)' }}>
                {book.image ? (
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
                  />
                ) : (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Music size={32} color="var(--color-text-light)" />
                  </div>
                )}

                {/* Play Icon Overlay */}
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
                backgroundColor: 'var(--color-card)',
                borderTop: '1px solid var(--color-border)'
              }}>
                <span style={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  marginRight: '0.5rem'
                }}>
                  {book.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleShare(e, book);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 10
                  }}
                >
                  <Share2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioBooks;
