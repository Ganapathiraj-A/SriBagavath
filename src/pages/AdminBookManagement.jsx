import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, ChevronLeft, LogOut, Package, Image as ImageIcon, BookOpen, X, ChevronUp, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { signOut } from 'firebase/auth';

// Helper to compress image to Base64
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith('.heic')) {
            reject(new Error("HEIC format is not supported by the browser. Please use a standard JPEG or PNG image."));
            return;
        }

        const attemptLoad = (src, isBlob) => {
            const img = new Image();
            img.onload = () => {
                if (isBlob) URL.revokeObjectURL(src);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 800;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const TARGET_SIZE = 350000; // 350KB target

                    while (dataUrl.length * 0.75 > TARGET_SIZE && quality > 0.3) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(dataUrl);
                } catch (e) {
                    reject(new Error("Image processing error: " + e.message));
                }
            };

            img.onerror = (e) => {
                if (isBlob) {
                    URL.revokeObjectURL(src);
                    const reader = new FileReader();
                    reader.onload = (re) => attemptLoad(re.target.result, false);
                    reader.onerror = (err) => reject(new Error("Failed to read file: " + err.message));
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error("Unable to load image. Only JPEG/PNG are supported."));
                }
            };

            img.src = src;
        };

        try {
            const objectUrl = URL.createObjectURL(file);
            attemptLoad(objectUrl, true);
        } catch (e) {
            const reader = new FileReader();
            reader.onload = (re) => attemptLoad(re.target.result, false);
            reader.readAsDataURL(file);
        }
    });
};

const CATEGORIES = ['Tamil Books', 'English Books'];

const AdminBookManagement = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [activeTab, setActiveTab] = useState('Tamil Books');
    const [covers, setCovers] = useState({});

    const action = searchParams.get('action');
    const editingId = searchParams.get('id');
    const showForm = action === 'add' || action === 'edit';
    const editingBook = action === 'edit' ? books.find(b => b.id === editingId) : null;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'Tamil Books',
        price: '',
        weight: '',
        hasCover: false,
        coverUrl: ''
    });

    useEffect(() => {
        loadBooks();
    }, []);

    useEffect(() => {
        if (editingBook) {
            setFormData({
                title: editingBook.title || '',
                description: editingBook.description || '',
                category: editingBook.category || 'Tamil Books',
                price: editingBook.price || '',
                weight: editingBook.weight || '',
                hasCover: editingBook.hasCover || false,
                coverUrl: ''
            });

            if (editingBook.hasCover) {
                const fetchCover = async () => {
                    if (covers[editingBook.id]) {
                        setFormData(prev => ({ ...prev, coverUrl: covers[editingBook.id] }));
                        return;
                    }
                    try {
                        const snap = await getDoc(doc(db, 'book_covers', editingBook.id));
                        if (snap.exists()) {
                            const url = snap.data().cover;
                            setFormData(prev => ({ ...prev, coverUrl: url }));
                            setCovers(prev => ({ ...prev, [editingBook.id]: url }));
                        }
                    } catch (e) {
                        console.error("Cover fetch failed", e);
                    }
                };
                fetchCover();
            }
        } else if (action === 'add') {
            resetForm();
            setFormData(prev => ({ ...prev, category: activeTab }));
        }
    }, [editingBook, action, activeTab]);

    const loadBooks = async () => {
        try {
            setLoading(true);
            const querySnapshot = await getDocs(query(collection(db, 'books'), orderBy('order', 'asc')));
            const loadedBooks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBooks(loadedBooks);

            // Fetch covers
            const booksWithCovers = loadedBooks.filter(b => b.hasCover);
            const coverPromises = booksWithCovers.map(async (book) => {
                try {
                    const coverSnap = await getDoc(doc(db, 'book_covers', book.id));
                    if (coverSnap.exists()) {
                        return { id: book.id, cover: coverSnap.data().cover };
                    }
                } catch (e) {
                    console.error(`Error fetching cover for ${book.title}:`, e);
                }
                return null;
            });

            const resolvedCovers = await Promise.all(coverPromises);
            const coverMap = {};
            resolvedCovers.forEach(c => {
                if (c) coverMap[c.id] = c.cover;
            });
            setCovers(coverMap);

        } catch (error) {
            console.error('Error loading books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverImage(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let finalCoverUrl = formData.coverUrl;

            if (coverImage) {
                try {
                    finalCoverUrl = await compressImage(coverImage);
                } catch (compressError) {
                    console.error("Compression failed:", compressError);
                    alert("Image processing failed: " + compressError.message);
                    throw compressError;
                }
            }

            const bookData = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                price: Number(formData.price),
                weight: Number(formData.weight),
                hasCover: !!finalCoverUrl,
                updatedAt: serverTimestamp()
            };

            let bookId;
            if (editingBook) {
                bookId = editingBook.id;
                await updateDoc(doc(db, 'books', bookId), bookData);
            } else {
                const categoryBooks = books.filter(b => b.category === formData.category);
                const nextOrder = categoryBooks.length > 0 ? Math.max(...categoryBooks.map(b => b.order || 0)) + 1 : 0;
                const docRef = await addDoc(collection(db, 'books'), {
                    ...bookData,
                    order: nextOrder,
                    createdAt: serverTimestamp()
                });
                bookId = docRef.id;
            }

            if (finalCoverUrl && (coverImage || finalCoverUrl !== editingBook?.coverUrl)) {
                await setDoc(doc(db, 'book_covers', bookId), {
                    cover: finalCoverUrl,
                    updatedAt: serverTimestamp()
                });
                setCovers(prev => ({ ...prev, [bookId]: finalCoverUrl }));
            }

            alert(editingBook ? 'Book updated!' : 'Book added!');
            setSearchParams({});
            resetForm();
            loadBooks();
        } catch (error) {
            console.error('Error saving book:', error);
            alert('Error saving book: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (bookId) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
            try {
                await deleteDoc(doc(db, 'books', bookId));
                await deleteDoc(doc(db, 'book_covers', bookId)).catch(() => { });
                alert('Book deleted!');
                setSearchParams({});
                loadBooks();
            } catch (error) {
                alert('Delete failed: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            category: activeTab,
            price: '',
            weight: '',
            hasCover: false,
            coverUrl: ''
        });
        setCoverImage(null);
    };

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            await GoogleAuth.signOut();
            await signOut(auth);
            navigate('/');
        }
    };

    const handleReorder = async (bookId, direction) => {
        const categoryBooks = books.filter(b => b.category === activeTab);
        const index = categoryBooks.findIndex(b => b.id === bookId);
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < categoryBooks.length) {
            const currentBook = categoryBooks[index];
            const targetBook = categoryBooks[targetIndex];

            // Swap order
            const currentOrder = currentBook.order || 0;
            const targetOrder = targetBook.order || 0;

            try {
                await Promise.all([
                    updateDoc(doc(db, 'books', currentBook.id), { order: targetOrder }),
                    updateDoc(doc(db, 'books', targetBook.id), { order: currentOrder })
                ]);
                loadBooks();
            } catch (error) {
                console.error("Reorder failed", error);
            }
        }
    };

    const filteredBooks = books.filter(b => b.category === activeTab);
    const tabs = ['Tamil Books', 'English Books'];

    if (loading && !showForm) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading books...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Book Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                        <LogOut size={20} />
                    </button>
                }
            />

            <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
                {!showForm ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div style={{ padding: '1.5rem 1rem 0.5rem 1rem' }}>
                            <button
                                onClick={() => setSearchParams({ action: 'add' })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    borderRadius: '1rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    border: 'none',
                                    width: '100%',
                                    boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)'
                                }}
                            >
                                <Plus size={20} /> Add New {activeTab === 'Tamil Books' ? 'Tamil' : 'English'} Book
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div style={{
                            display: 'flex',
                            margin: '0 16px',
                            borderBottom: '1px solid #e5e7eb',
                            gap: '20px',
                            alignItems: 'center',
                            backgroundColor: 'white',
                            paddingTop: '8px'
                        }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '12px 16px',
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

                        <div style={{ padding: '1.5rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {filteredBooks.map((book, idx) => (
                                    <div key={book.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginRight: '4px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReorder(book.id, -1); }}
                                                    disabled={idx === 0}
                                                    style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.2 : 1, color: '#f97316', padding: '4px' }}
                                                >
                                                    <ChevronUp size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReorder(book.id, 1); }}
                                                    disabled={idx === filteredBooks.length - 1}
                                                    style={{ border: 'none', background: 'none', cursor: idx === filteredBooks.length - 1 ? 'default' : 'pointer', opacity: idx === filteredBooks.length - 1 ? 0.2 : 1, color: '#f97316', padding: '4px' }}
                                                >
                                                    <ChevronDown size={20} />
                                                </button>
                                            </div>
                                            <div style={{ width: '48px', height: '64px', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                                {covers[book.id] ? (
                                                    <img src={covers[book.id]} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <BookOpen size={20} color="#9ca3af" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                                                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '2px 0 0 0' }}>₹{book.price} • {book.weight}g</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                            <button
                                                onClick={() => setSearchParams({ action: 'edit', id: book.id })}
                                                style={{ padding: '0.625rem', backgroundColor: '#fff7ed', color: '#f97316', borderRadius: '0.75rem', border: '1px solid #fed7aa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredBooks.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px dashed #d1d5db' }}>
                                        <BookOpen size={40} color="#d1d5db" style={{ marginBottom: '1rem' }} />
                                        <p style={{ color: '#6b7280', fontWeight: 500 }}>No {activeTab.toLowerCase()} found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', margin: '0 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
                            {editingBook && (
                                <button
                                    onClick={() => handleDelete(editingBook.id)}
                                    style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Book Title *</label>
                                <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Enter book title" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }} />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Category *</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }}>
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Price (₹) *</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }} />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Weight (g) *</label>
                                    <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Description</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Enter book description/preface" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }} />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: '#4b5563', fontSize: '0.9rem' }}>Cover Image</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '2px dashed #fed7aa', borderRadius: '1rem', backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                                    <input type="file" onChange={handleImageChange} accept="image/*" id="cover-upload" style={{ display: 'none' }} />
                                    <label htmlFor="cover-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <ImageIcon size={32} color="#f97316" />
                                        <span style={{ color: '#f97316', fontWeight: 600, fontSize: '0.9rem' }}>{coverImage ? 'Change Image' : 'Click to Upload Cover'}</span>
                                    </label>

                                    {(coverImage || formData.coverUrl) && (
                                        <div style={{ position: 'relative', width: '100px', marginTop: '0.5rem' }}>
                                            <img src={coverImage ? URL.createObjectURL(coverImage) : formData.coverUrl} alt="Cover Preview" style={{ width: '100%', borderRadius: '0.75rem', border: '1px solid #fed7aa', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                            <button type="button" onClick={() => { setCoverImage(null); setFormData(p => ({ ...p, coverUrl: '' })); }} style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><X size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setSearchParams({})} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={uploading} style={{ flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)' }}>
                                    {uploading ? 'Saving...' : (editingBook ? 'Update Book' : 'Add Book')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AdminBookManagement;
