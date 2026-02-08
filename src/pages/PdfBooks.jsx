import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, Edit2, Image as ImageIcon, Upload, Link as LinkIcon, Trash2, X, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { DRIVE_CONFIG } from '../data/driveConfig';
import { useAdminAuth } from '../context/AdminAuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, getDocs, query, orderBy, getDoc } from 'firebase/firestore';
import { compressImage } from '../utils/imageUtils';

const { ENGLISH_BOOKS_FOLDER_ID, TAMIL_BOOKS_FOLDER_ID } = DRIVE_CONFIG;

const PdfBooks = () => {
  const { isAdmin } = useAdminAuth();
  const tabs = ['Tamil Books', 'English Books'];
  const [activeTab, setActiveTab] = useState('Tamil Books');
  const [editMode, setEditMode] = useState(false);
  const [configs, setConfigs] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [printedBooks, setPrintedBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const englishData = useDriveFiles(ENGLISH_BOOKS_FOLDER_ID, 'digital_books_english');
  const tamilData = useDriveFiles(TAMIL_BOOKS_FOLDER_ID, 'digital_books_tamil');

  const current = activeTab === 'English Books' ? englishData : tamilData;

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
    } catch (e) {
      console.error("Failed to load printed books", e);
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

  const getBookImage = (fileId) => {
    const config = configs[fileId];
    if (!config) return null;
    return config.cover || config.linkedBookCover;
  };

  const renderPdfLinks = () => {
    const { files, loading, error } = current;

    if (loading) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p>Loading books...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
          <p>{error}</p>
        </div>
      );
    }

    if (files.length === 0) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
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
                onClick={() => {
                  if (isAdmin && editMode) {
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
                  padding: '12px',
                  cursor: 'pointer',
                  flex: 1,
                  minWidth: 0,
                  border: editMode ? '1px dashed var(--color-primary)' : '1px solid #f3f4f6',
                  position: 'relative'
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div style={{
                  width: '50px',
                  height: '65px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: '1px solid #f3f4f6'
                }}>
                  {cover ? (
                    <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileText size={20} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                </div>
                {editMode ? (
                  <Edit2 size={18} color="var(--color-primary)" />
                ) : (
                  <BookOpen size={18} color="#9ca3af" />
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '30px' }}>
      <PageHeader title="Digital Books" />

      {/* Tabs & Edit Toggle */}
      <div style={{
        display: 'flex',
        margin: '0 16px',
        borderBottom: '1px solid #e5e7eb',
        gap: '20px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 4px',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab ? 'var(--color-primary)' : '#6b7280',
                fontWeight: activeTab === tab ? '600' : '500',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            onClick={() => setEditMode(!editMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: editMode ? 'var(--color-primary)' : '#d1d5db',
              backgroundColor: editMode ? '#fff7ed' : 'white',
              color: editMode ? 'var(--color-primary)' : '#6b7280',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Edit2 size={14} />
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div style={{ maxWidth: '30rem', margin: '0 auto' }}>
        {renderPdfLinks()}
      </div>

      {/* Image Configuration Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ zIndex: 2000 }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Configure Cover</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none' }}><X size={24} color="#666" /></button>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>{editingFile?.name}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '15px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb'
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
                    border: '1px solid #fee2e2',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: '#fff1f1',
                    color: '#ef4444'
                  }}
                >
                  <Trash2 size={24} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Remove Cover</span>
                </button>
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '10px' }}>
                  <Search size={16} color="#6b7280" />
                  <input
                    type="text"
                    placeholder="Search printed books..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'none', width: '100%', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div style={{ maxHeight: '30vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {booksLoading && <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>Loading printed books...</p>}
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
                          border: '1px solid #eee',
                          borderRadius: '10px',
                          backgroundColor: 'white',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: '35px', height: '45px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid #eee' }}>
                          {book.cover ? (
                            <img src={book.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</span>
                        <LinkIcon size={14} color="#3b82f6" />
                      </button>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PdfBooks;
