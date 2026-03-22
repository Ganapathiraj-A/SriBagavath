import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Edit2, Upload, Link as LinkIcon, Trash2, X, Search, Share2, ChevronDown, Check, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import html2canvas from 'html2canvas';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { db } from '@/firebase';
import { collection, onSnapshot, doc, setDoc, getDocs, query, orderBy, getDoc } from '@/utils/FirestoreProxy';
import { compressImage } from '@/utils/imageUtils';
import { useDriveFiles } from '@/hooks/useDriveFiles';
import LazyImage from '@/components/LazyImage';

const PdfBooks = () => {
  const navigate = useNavigate();
  const { digitalBookLanguages } = useGlobalSettings();
  const { hasAccess, isInitialized } = useAdminAuth();

  // Wait for auth initialization before permitting edit mode
  const canEdit = isInitialized && hasAccess('DIGITAL_BOOKS_MANAGEMENT');
  const [activeTabId, setActiveTabId] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [configs, setConfigs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [printedBooks, setPrintedBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharingFileId, setIsSharingFileId] = useState(null);
  const [sharingData, setSharingData] = useState(null);
  const shareRef = useRef(null);

  const mainTabs = digitalBookLanguages ? digitalBookLanguages.slice(0, 2) : [];
  const otherLanguages = digitalBookLanguages ? digitalBookLanguages.slice(2) : [];

  useEffect(() => {
    if (!activeTabId && mainTabs.length > 0) {
      setActiveTabId(mainTabs[0].id);
    }
  }, [digitalBookLanguages, activeTabId]);

  const activeLang = (digitalBookLanguages || []).find(l => l.id === activeTabId) || mainTabs[0] || {};

  const current = useDriveFiles(activeLang?.folderId, `digital_books_${activeLang?.id}`);

  // Digital book configurations fetched separately using hook

  // Listen to configs
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'digital_book_configs'), (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data();
      });
      setConfigs(data);
    });
    return () => unsub();
  }, []);

  // Load printed books for selection
  const loadPrintedBooks = async () => {
    setBooksLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'books'), orderBy('title', 'asc')));
      const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch covers for these books
      const coverPromises = books.map(async (book) => {
        if (book.hasCover) {
          const snap = await getDoc(doc(db, 'book_covers', book.id));
          if (snap.exists()) return { ...book, cover: snap.data().cover };
        }
        return book;
      });
      const booksWithCovers = await Promise.all(coverPromises);
      setPrintedBooks(booksWithCovers);
    } catch (_err) {
      console.error("Failed to load printed books", _err);
    } finally {
      setBooksLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingFile) return;

    try {
      const base64 = await compressImage(file);
      await setDoc(doc(db, 'digital_book_configs', editingFile.id), {
        cover: base64,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsModalOpen(false);
    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
  };

  const handleLinkBook = async (book) => {
    if (!editingFile) return;
    await setDoc(doc(db, 'digital_book_configs', editingFile.id), {
      linkedBookId: book.id,
      linkedBookCover: book.cover || null,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    setIsModalOpen(false);
  };

  const handleRemoveConfig = async () => {
    if (!editingFile) return;
    if (window.confirm("Remove cover image?")) {
      await setDoc(doc(db, 'digital_book_configs', editingFile.id), {
        cover: null,
        linkedBookId: null,
        linkedBookCover: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setIsModalOpen(false);
    }
  };

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
      console.error("[PdfBooks] fetchAsBase64 failed:", e);
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
          const el = doc.getElementById('pdf-share-container-wrapper');
          if (el) {
            el.style.visibility = 'visible';
          }
        }
      });

      const finalData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      const fileName = `share_pdf_${Date.now()}.jpg`;

      const result = await Filesystem.writeFile({
        path: fileName,
        data: finalData,
        directory: Directory.Cache,
        encoding: 'base64'
      });

      const text = `📗 *${currentData.file.name}*\n🔗 *Book Link:* ${currentData.viewUrl}`;

      // Give filesystem a moment to sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await Share.share({
        title: currentData.file.name,
        text: text,
        url: currentData.viewUrl,
        files: [result.uri]
      });
    } catch (error) {
      console.error("[PdfBooks] captureAndShare error:", error);
    } finally {
      setIsSharingFileId(null);
    }
  };

  const handleShare = async (e, file) => {
    e.stopPropagation();
    e.preventDefault();
    setIsSharingFileId(file.id);
    const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const cover = getBookImage(file.id);

    try {
      const base64Img = await fetchAsBase64(cover);
      const shareInfo = {
        file,
        viewUrl,
        displayImage: base64Img || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII="
      };
      setSharingData(shareInfo);
      setTimeout(() => captureAndShare(shareInfo), 1000);
    } catch (err) {
      console.error("Sharing failed", err);
      setIsSharingFileId(null);
    }
  };

  const getBookImage = (fileId) => {
    const config = configs[fileId];
    if (!config) return null;
    return config.imageUrl || config.cover || config.linkedBookCover;
  };

  const renderPdfLinks = () => {
    const { files, loading, error } = current;

    if (loading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>Loading books...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-error)' }}>
          <p>{error}</p>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p>No books available in this category.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {files.map((file) => {
          const viewUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
          const cover = getBookImage(file.id);

          return (
            <div key={file.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  flex: 1,
                  minWidth: 0,
                  border: editMode ? '1px dashed var(--color-primary)' : '1px solid var(--color-border)',
                  position: 'relative',
                  backgroundColor: 'var(--color-card)',
                  cursor: 'default'
                }}
                whileHover={{ scale: 1.01 }}
              >
                {/* Main clickable area */}
                <div
                  onClick={() => {
                    if (canEdit && editMode) {
                      setEditingFile(file);
                      setIsModalOpen(true);
                      loadPrintedBooks();
                    } else {
                      window.open(viewUrl, '_blank');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flex: 1,
                    cursor: 'pointer',
                    minWidth: 0
                  }}
                >
                  <div style={{
                    width: '50px',
                    height: '65px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-primary-transparent)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)'
                  }}>
                    {cover ? (
                      <LazyImage src={cover} alt="" objectFit="cover" />
                    ) : (
                      <FileText size={20} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--color-text)', fontSize: '1rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                  </div>
                  {editMode && <Edit2 size={18} color="var(--color-primary)" />}
                </div>

                {!editMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!isSharingFileId) handleShare(e, file);
                    }}
                    style={{
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface)',
                      cursor: isSharingFileId ? 'default' : 'pointer',
                      border: 'none',
                      zIndex: 10,
                      flexShrink: 0
                    }}
                  >
                    {isSharingFileId === file.id ? (
                      <Loader2 size={18} color="var(--color-primary)" className="animate-spin" />
                    ) : (
                      <Share2 size={18} color="var(--color-primary)" />
                    )}
                  </button>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', paddingBottom: '30px' }}>
      <PageHeader
        title="Digital Books"
        rightAction={canEdit && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {editMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate('/admin/digital-books-settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary)',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  boxShadow: 'var(--shadow-sm)'
                }}
                title="Configure Languages"
              >
                <SettingsIcon size={18} />
              </motion.button>
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? "Save Changes" : "Edit Books"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                borderRadius: '50%',
                border: '1px solid var(--color-primary)',
                backgroundColor: editMode ? 'var(--color-primary)' : 'var(--color-primary-transparent)',
                color: editMode ? 'var(--color-text-on-primary)' : 'var(--color-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {editMode ? <Check size={18} /> : <Edit2 size={18} />}
            </button>
          </div>
        )}
      />

      {/* Tabs & Edit Toggle */}
      <div style={{
        display: 'flex',
        margin: '0 16px',
        borderBottom: '1px solid var(--color-border)',
        gap: '20px',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '16px', overflow: 'visible', flexWrap: 'wrap' }}>
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTabId(tab.id);
                setIsLangDropdownOpen(false);
              }}
              style={{
                padding: '12px 4px',
                border: 'none',
                borderBottom: activeTabId === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTabId === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: activeTabId === tab.id ? '600' : '500',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.name}
            </button>
          ))}

          {otherLanguages.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                style={{
                  padding: '12px 4px',
                  border: 'none',
                  borderBottom: otherLanguages.some(l => l.id === activeTabId) ? '2px solid var(--color-primary)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: otherLanguages.some(l => l.id === activeTabId) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontWeight: otherLanguages.some(l => l.id === activeTabId) ? '600' : '500',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {otherLanguages.some(l => l.id === activeTabId) ? otherLanguages.find(l => l.id === activeTabId)?.name : 'Other Languages'}
                <ChevronDown size={14} style={{ transform: isLangDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isLangDropdownOpen && (
                <div style={{
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
                }}>
                  {otherLanguages.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTabId(tab.id);
                        setIsLangDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: activeTabId === tab.id ? 'var(--color-primary-transparent)' : 'transparent',
                        color: activeTabId === tab.id ? 'var(--color-primary)' : 'var(--color-text)',
                        fontSize: '0.9rem',
                        fontWeight: activeTabId === tab.id ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div style={{ maxWidth: '30rem', margin: '0 auto' }}>
        {renderPdfLinks()}
      </div>

      {/* Image Configuration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsModalOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--color-card)',
                maxWidth: '90%',
                width: '400px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                borderRadius: '20px',
                gap: '15px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Configure Cover</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none' }}><X size={24} color="var(--color-text-muted)" /></button>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>{editingFile?.name}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '15px',
                  border: '2px dashed var(--color-border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)'
                }}>
                  <Upload size={24} color="var(--color-primary)" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Upload Phone</span>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                </label>

                <button
                  onClick={handleRemoveConfig}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '15px',
                    border: '1px solid var(--color-error-transparent)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: 'var(--color-error-transparent)',
                    color: 'var(--color-error)'
                  }}
                >
                  <Trash2 size={24} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Remove Cover</span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', backgroundColor: 'var(--color-surface)', padding: '8px 12px', borderRadius: '10px' }}>
                  <Search size={16} color="var(--color-text-muted)" />
                  <input
                    type="text"
                    placeholder="Search printed books..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'none', width: '100%', fontSize: '0.9rem', outline: 'none', color: 'var(--color-text)' }}
                  />
                </div>

                <div style={{ maxHeight: '30vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {booksLoading && <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading printed books...</p>}
                  {printedBooks
                    .filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(book => (
                      <button
                        key={book.id}
                        onClick={() => handleLinkBook(book)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          backgroundColor: 'var(--color-card)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--color-text)'
                        }}
                      >
                        <div style={{ width: '35px', height: '45px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                          {book.cover ? (
                            <LazyImage src={book.cover} alt="" objectFit="cover" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-surface)' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</span>
                        <LinkIcon size={14} color="var(--color-primary)" />
                      </button>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Shareable Template */}
      <div style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        width: '800px',
        zIndex: -1000,
        opacity: 1,
        pointerEvents: 'none',
        visibility: 'visible'
      }}>
        {sharingData && (
          <div
            id="pdf-share-container-wrapper"
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
                Sri Bagavath Digital Library
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
                  <FileText size={80} color="#f97316" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '32px', color: '#111827', margin: '0 0 15px 0', fontWeight: 800, lineHeight: 1.2 }}>
                {sharingData.file.name}
              </h2>
              <div style={{ display: 'inline-block', backgroundColor: '#fff7ed', padding: '12px 24px', borderRadius: '30px', border: '1px solid #ffedd5' }}>
                <p style={{ margin: 0, color: '#f97316', fontWeight: 700, fontSize: '18px' }}>
                  Read Online / Download PDF
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

export default PdfBooks;
