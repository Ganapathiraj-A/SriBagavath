import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Share2, Play, Edit2, Music, Loader2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
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
  const [isSharingAudioBookId, setIsSharingAudioBookId] = useState(null);
  const [sharingData, setSharingData] = useState(null);
  const shareRef = useRef(null);

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

  const fetchAsBase64 = async (url) => {
    if (!url || !url.startsWith('http')) return url;
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("[AudioBooks] fetchAsBase64 failed:", e);
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";
    }
  };

  const captureAndShare = async (currentData) => {
    if (!shareRef.current || !currentData) return;
    try {
      const canvas = await html2canvas(shareRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: '#ffffff',
        width: 800,
        onclone: (doc) => {
          const el = doc.getElementById('audio-share-container-wrapper');
          if (el) {
            el.style.opacity = '1';
            el.style.visibility = 'visible';
          }
        }
      });

      const finalData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      const fileName = `share_audio_${Date.now()}.jpg`;

      const result = await Filesystem.writeFile({
        path: fileName,
        data: finalData,
        directory: Directory.Cache
      });

      const text = `🎧 *${currentData.book.title}*\n🔗 *Audio Link:* ${currentData.book.link}`;

      await Share.share({
        title: currentData.book.title,
        text: text,
        files: [result.uri]
      });
    } catch (error) {
      console.error("[AudioBooks] captureAndShare error:", error);
    } finally {
      setIsSharingAudioBookId(null);
    }
  };

  const handleShare = async (e, book) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSharingAudioBookId(book.id);

    try {
      const base64Img = await fetchAsBase64(book.image);
      const shareInfo = {
        book,
        displayImage: base64Img || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
      };
      setSharingData(shareInfo);
      setTimeout(() => captureAndShare(shareInfo), 1000);
    } catch (err) {
      console.error("Sharing failed", err);
      setIsSharingAudioBookId(null);
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
              style={{
                backgroundColor: 'var(--color-card)',
                borderRadius: '1rem',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'default'
              }}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
            >
              <div
                onClick={() => window.open(book.link, '_blank')}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', flex: 1 }}
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
                  borderTop: '1px solid var(--color-border)',
                  flex: 1
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
                </div>
              </div>

              {/* Share Button (Absolute or inside info but separate click) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!isSharingAudioBookId) handleShare(e, book);
                }}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  padding: '6px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                  cursor: isSharingAudioBookId ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {isSharingAudioBookId === book.id ? (
                  <Loader2 size={16} color="var(--color-primary)" className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Hidden Shareable Template */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '800px',
        zIndex: -1000,
        opacity: 0.01,
        pointerEvents: 'none'
      }}>
        {sharingData && (
          <div
            id="audio-share-container-wrapper"
            ref={shareRef}
            style={{
              width: '800px',
              backgroundColor: '#ffffff',
              padding: '60px 40px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'center'
            }}
          >
            {/* Header branding */}
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ color: '#f97316', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 800 }}>
                Sri Bagavath Audio Library
              </h1>
              <div style={{ height: '4px', width: '80px', backgroundColor: '#f97316', margin: '0 auto' }}></div>
            </div>

            {/* Book Cover */}
            <div style={{ marginBottom: '40px' }}>
              {sharingData.displayImage !== "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=" ? (
                <img
                  src={sharingData.displayImage}
                  style={{
                    width: '320px',
                    height: '450px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    border: '8px solid #ffffff'
                  }}
                  crossOrigin="anonymous"
                  alt=""
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div style={{
                  width: '320px',
                  height: '450px',
                  borderRadius: '20px',
                  backgroundColor: '#fff7ed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  border: '2px dashed #ffedd5'
                }}>
                  <Music size={80} color="#f97316" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '32px', color: '#111827', margin: '0 0 15px 0', fontWeight: 800, lineHeight: 1.2 }}>
                {sharingData.book.title}
              </h2>
              <div style={{ display: 'inline-block', backgroundColor: '#fff7ed', padding: '12px 24px', borderRadius: '30px', border: '1px solid #ffedd5' }}>
                <p style={{ margin: 0, color: '#f97316', fontWeight: 700, fontSize: '18px' }}>
                  Listen to Audio Book
                </p>
              </div>
            </div>

            {/* Footer Branding */}
            <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #f3f4f6' }}>
              <p style={{ margin: 0, color: '#f97316', fontSize: '20px', fontWeight: 800 }}>
                Download Sri Bagavath App for latest updates
              </p>
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                Available on Google Play Store
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AudioBooks;
