import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Edit2, Trash2, GripVertical,
    Save, X, Upload, Eye, Music
} from 'lucide-react';
import {
    collection, onSnapshot, doc, setDoc,
    deleteDoc, query, orderBy, serverTimestamp
} from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import PageHeader from '@/components/PageHeader';
import { compressImage } from '@/utils/imageUtils';

const AdminAudioBookManagement = () => {
    const navigate = useNavigate();
    const [audioBooks, setAudioBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form Stats
    const [formData, setFormData] = useState({
        title: '',
        image: '',
        link: '',
        order: 0
    });

    useEffect(() => {
        const q = query(collection(db, 'audio_books'), orderBy('order', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const books = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAudioBooks(books);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleOpenModal = (book = null) => {
        if (book) {
            setEditingBook(book);
            setFormData({
                title: book.title || '',
                image: book.image || '',
                link: book.link || '',
                order: book.order || 0
            });
        } else {
            setEditingBook(null);
            setFormData({
                title: '',
                image: '',
                link: '',
                order: audioBooks.length
            });
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const base64 = await compressImage(file);
            setFormData(prev => ({ ...prev, image: base64 }));
        } catch (err) {
            alert("Image compression failed: " + err.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const id = editingBook ? editingBook.id : Date.now().toString();
            await setDoc(doc(db, 'audio_books', id), {
                ...formData,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setIsModalOpen(false);
        } catch (err) {
            alert("Save failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this audio book?")) {
            await deleteDoc(doc(db, 'audio_books', id));
        }
    };

    const filteredBooks = audioBooks.filter(b =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '2rem' }}>
            <PageHeader
                title="Audio Book Management"
                rightAction={
                    <button
                        onClick={() => navigate('/audio-books')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Eye size={16} /> View Listing
                    </button>
                }
            />

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem' }}>
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 1rem',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <Search size={18} color="#9ca3af" />
                        <input
                            type="text"
                            placeholder="Search audio books..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 0',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 1.25rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={20} /> Add
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading...</div>
                ) : filteredBooks.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px dashed #d1d5db',
                        color: '#6b7280'
                    }}>
                        <Music size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>No audio books found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {filteredBooks.map((book) => (
                            <motion.div
                                key={book.id}
                                layout
                                style={{
                                    backgroundColor: 'white',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    border: '1px solid #e5e7eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '10px',
                                    backgroundColor: '#f3f4f6',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '1px solid #e5e7eb'
                                }}>
                                    {book.image ? (
                                        <img src={book.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Music size={24} color="#9ca3af" />
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{book.title}</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {book.link}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => handleOpenModal(book)}
                                        style={{ padding: '8px', border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer' }}
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(book.id)}
                                        style={{ padding: '8px', border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div
                        className="modal-overlay"
                        onClick={() => setIsModalOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                backgroundColor: 'white',
                                width: '100%',
                                maxWidth: '450px',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                                    {editingBook ? 'Edit Audio Book' : 'Add Audio Book'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="#6b7280" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                        Image (Square Recommended)
                                    </label>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '10px', backgroundColor: '#f3f4f6', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                            {formData.image ? <img src={formData.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Music size={24} style={{ margin: '20px' }} color="#9ca3af" />}
                                        </div>
                                        <label style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '0.75rem',
                                            backgroundColor: '#f3f4f6',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: 500
                                        }}>
                                            <Upload size={18} />
                                            Upload Image
                                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                        Audio Link (URL)
                                    </label>
                                    <input
                                        type="url"
                                        required
                                        value={formData.link}
                                        onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.order}
                                        onChange={e => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{
                                        marginTop: '1rem',
                                        padding: '1rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save Audio Book'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminAudioBookManagement;
