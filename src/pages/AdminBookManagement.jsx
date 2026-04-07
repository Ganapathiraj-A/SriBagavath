import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Image as ImageIcon, BookOpen, X, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, query, orderBy, serverTimestamp, getDoc, where } from '@/utils/FirestoreProxy';
import { StatsService } from '@/services/StatsService';
import { bumpServerVersion } from '@/utils/SyncManager';
import { compressImage } from '@/utils/imageUtils';
import { TransactionService } from '@/services/TransactionService';


const CATEGORIES = [
    'Tamil Books', 'English Books', 'Hindi Books', 'Telugu Books',
    'Malayalam Books', 'Kannada Books', 'Russian Books', 'Hebrew Books',
    'Spanish Books', 'German Books', 'Italian Books'
];

const NATIVE_LABELS = {
    'Tamil Books': 'Tamil',
    'English Books': 'English',
    'Hindi Books': 'Hindi',
    'Telugu Books': 'Telugu',
    'Malayalam Books': 'Malayalam',
    'Kannada Books': 'Kannada',
    'Russian Books': 'Russian',
    'Hebrew Books': 'Hebrew',
    'Spanish Books': 'Spanish',
    'German Books': 'German',
    'Italian Books': 'Italian'
};

const AdminBookManagement = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAdmin, hasAccess } = useAdminAuth();
    const canManage = hasAccess('PRINT_BOOKS_MANAGEMENT');
    const [books, setBooks] = useState([]);
    const [covers, setCovers] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [coverImage, setCoverImage] = useState(null);
    const [activeTab, setActiveTab] = useState('Tamil Books');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

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
        coverUrl: '',
        isActive: true
    });

    const resetForm = useCallback(() => {
        setFormData({
            title: '',
            description: '',
            category: activeTab,
            price: '',
            weight: '',
            hasCover: false,
            coverUrl: '',
            isActive: true
        });
        setCoverImage(null);
    }, [activeTab]);

    const loadBooks = useCallback(async () => {
        setLoading(true);

        try {
            const ref = collection(db, 'books');
            const q = query(
                ref,
                where('category', '==', activeTab),
                orderBy('order', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const loadedBooks = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setBooks(loadedBooks);

        } catch (_err) {
            console.error('Error loading books:', _err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

    useEffect(() => {
        if (editingBook) {
            setFormData({
                title: editingBook.title || '',
                description: editingBook.description || '',
                category: editingBook.category || 'Tamil Books',
                price: editingBook.price || '',
                weight: editingBook.weight || '',
                hasCover: editingBook.hasCover || false,
                coverUrl: '',
                isActive: editingBook.isActive !== false
            });

            if (editingBook.hasCover) {
                const fetchCover = async () => {
                    try {
                        const snap = await getDoc(doc(db, 'book_covers', editingBook.id));
                        if (snap.exists()) {
                            const url = snap.data().cover;
                            setFormData(prev => ({ ...prev, coverUrl: url }));
                        }
                    } catch (_err) {
                        console.error("Cover fetch failed", _err);
                    }
                };
                fetchCover();
            }
        } else if (action === 'add') {
            resetForm();
            setFormData(prev => ({ ...prev, category: activeTab }));
        }
    }, [editingBook, action, activeTab, resetForm]);

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
                isActive: formData.isActive !== false,
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
                // If it's already a URL, don't re-upload
                if (finalCoverUrl.startsWith('http')) {
                    await setDoc(doc(db, 'book_covers', bookId), {
                        cover: finalCoverUrl,
                        updatedAt: serverTimestamp()
                    });
                } else {
                    try {
                        const filename = `book_${bookId}_${Date.now()}.jpg`;
                        const coverUrl = await TransactionService.uploadBase64ToStorage(
                            bookId,
                            finalCoverUrl,
                            'book_covers',
                            filename
                        );

                        if (coverUrl) {
                            await setDoc(doc(db, 'book_covers', bookId), {
                                cover: coverUrl,
                                updatedAt: serverTimestamp()
                            });

                            // Record storage size stats
                            const sizeInBytes = finalCoverUrl.length * 0.75;
                            await StatsService.recordImage(sizeInBytes, 'BOOK_COVER');

                            setCovers(prev => ({ ...prev, [bookId]: coverUrl }));
                        }
                    } catch (uploadErr) {
                        console.error("Cloud Storage upload failed, falling back to Firestore:", uploadErr);
                        await setDoc(doc(db, 'book_covers', bookId), {
                            cover: finalCoverUrl,
                            updatedAt: serverTimestamp()
                        });

                        // Important: Reset flags on the main book document so migration utility can see it
                        await updateDoc(doc(db, 'books', bookId), {
                            imageUrl: '',
                            storage_migrated: false
                        });

                        // Record legacy size stats
                        const sizeInBytes = finalCoverUrl.length * 0.75;
                        await StatsService.recordImage(sizeInBytes, 'BOOK_COVER');

                        setCovers(prev => ({ ...prev, [bookId]: finalCoverUrl }));
                    }
                }
            }

            await bumpServerVersion('books');
            await updateDoc(doc(db, 'system', 'metadata'), {
                lastUpdated_books: serverTimestamp()
            });

            alert(editingBook ? 'Book updated!' : 'Book added!');
            setSearchParams({}, { replace: true });
            resetForm();
            loadBooks();
        } catch (_err) {
            console.error('Error saving book:', _err);
            alert('Error saving book: ' + _err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStatus = async (bookId, currentStatus) => {
        const newStatus = currentStatus === false; // If currently hidden (false), make it active (true/not false)
        try {
            await updateDoc(doc(db, 'books', bookId), {
                isActive: newStatus,
                updatedAt: serverTimestamp()
            });
            await bumpServerVersion('books');
            loadBooks();
        } catch (_err) {
            alert('Status update failed: ' + _err.message);
        }
    };

    const handleDelete = async (bookId) => {
        if (window.confirm('Are you sure you want to delete this book?')) {
            try {
                await deleteDoc(doc(db, 'books', bookId));

                // Try to delete from Cloud Storage if it's a URL
                const coverDoc = await getDoc(doc(db, 'book_covers', bookId));
                if (coverDoc.exists()) {
                    const coverData = coverDoc.data().cover;
                    if (coverData) {
                        // Decrement stats based on whatever data it was
                        const sizeInBytes = coverData.length * 0.75;
                        await StatsService.recordImage(-sizeInBytes, 'BOOK_COVER');

                        if (coverData.startsWith('http')) {
                            try {
                                await TransactionService.deleteFileFromStorage(coverData);
                            } catch (delErr) {
                                console.warn("Failed to delete cover from storage:", delErr);
                            }
                        }
                    }
                }
                await deleteDoc(doc(db, 'book_covers', bookId)).catch(() => { });

                // No need for deletedBook check, bumpServerVersion and updateDoc should always run
                await bumpServerVersion('books');
                await updateDoc(doc(db, 'system', 'metadata'), {
                    lastUpdated_books: serverTimestamp()
                });

                alert('Book deleted!');
                setSearchParams({}, { replace: true });
                loadBooks();
            } catch (_err) {
                alert('Delete failed: ' + _err.message);
            }
        }
    };

    /*
    /*
    const handleLogout = async () => {
        if (window.confirm("Logout?")) {
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Disconnect failed:", dErr);
                    }
                } catch (_err) {
                    console.warn("Google SignOut Error", _err);
                }
            }
            await signOut(auth);
            navigate('/');
        }
    };
    */

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
            } catch (_err) {
                console.error("Reorder failed", _err);
            }
        }
    };

    const filteredBooks = books.filter(b => b.category === activeTab);
    const mainTabs = ['Tamil Books', 'English Books'];
    const otherLanguages = [
        'Hindi Books', 'Telugu Books', 'Malayalam Books', 'Kannada Books',
        'Russian Books', 'Hebrew Books', 'Spanish Books', 'German Books', 'Italian Books'
    ];

    if (loading && !showForm) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading books...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Book Management"
                rightAction={
                    <button
                        onClick={() => navigate('/bookstore')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '20px',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Eye size={16} /> View Listing
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
                                    boxShadow: '0 4px 6px -1px var(--color-primary-transparent)'
                                }}
                            >
                                <Plus size={20} /> Add New {NATIVE_LABELS[activeTab] || activeTab} Book
                            </button>
                        </div>

                        <div style={{
                            display: 'flex',
                            margin: '0 16px',
                            borderBottom: '1px solid var(--color-border)',
                            gap: '20px',
                            alignItems: 'center',
                            backgroundColor: 'var(--color-surface)',
                            paddingTop: '8px',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                {mainTabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            setIsLangDropdownOpen(false);
                                        }}
                                        style={{
                                            padding: '12px 4px',
                                            border: 'none',
                                            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            backgroundColor: 'transparent',
                                            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                            fontWeight: activeTab === tab ? '600' : '500',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {NATIVE_LABELS[tab] || tab}
                                    </button>
                                ))}

                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                        style={{
                                            padding: '12px 4px',
                                            border: 'none',
                                            borderBottom: otherLanguages.includes(activeTab) ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            backgroundColor: 'transparent',
                                            color: otherLanguages.includes(activeTab) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                            fontWeight: otherLanguages.includes(activeTab) ? '600' : '500',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s ease',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {otherLanguages.includes(activeTab) ? NATIVE_LABELS[activeTab] : 'Other Languages'}
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
                                                    key={tab}
                                                    onClick={() => {
                                                        setActiveTab(tab);
                                                        setIsLangDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        textAlign: 'left',
                                                        border: 'none',
                                                        backgroundColor: activeTab === tab ? 'var(--color-primary-transparent)' : 'transparent',
                                                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text)',
                                                        fontSize: '0.9rem',
                                                        fontWeight: activeTab === tab ? 600 : 500,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {NATIVE_LABELS[tab] || tab}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '-0.5rem', fontWeight: 500 }}>
                                    Click book to edit
                                </p>
                                {filteredBooks.map((book, idx) => (
                                    <div
                                        key={book.id}
                                        onClick={() => setSearchParams({ action: 'edit', id: book.id })}
                                        style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-surface)', borderRadius: '1.25rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                                    >
                                        <LazyImage
                                            firestorePath={`book_covers/${book.id}`}
                                            alt={book.title}
                                            width="48px"
                                            height="64px"
                                            borderRadius="8px"
                                            placeholder={() => <BookOpen size={20} color="var(--color-text-light)" />}
                                        />

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</h3>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                ₹{book.price} • {book.weight}g
                                                <span style={{ 
                                                    color: book.isActive !== false ? '#10b981' : 'var(--color-error)',
                                                    fontWeight: 700,
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {book.isActive !== false ? 'Active' : 'Hidden'}
                                                </span>
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReorder(book.id, -1); }}
                                                    disabled={idx === 0}
                                                    style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.2 : 1, color: 'var(--color-primary)', padding: '2px' }}
                                                >
                                                    <ChevronUp size={20} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReorder(book.id, 1); }}
                                                    disabled={idx === filteredBooks.length - 1}
                                                    style={{ border: 'none', background: 'none', cursor: idx === filteredBooks.length - 1 ? 'default' : 'pointer', opacity: idx === filteredBooks.length - 1 ? 0.2 : 1, color: 'var(--color-warning)', padding: '2px' }}
                                                >
                                                    <ChevronDown size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredBooks.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
                                        <BookOpen size={40} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                                        <p style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>No {activeTab.toLowerCase()} found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-lg)', margin: '0 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {editingBook && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(editingBook.id, editingBook.isActive)}
                                            style={{ 
                                                padding: '0.5rem', 
                                                backgroundColor: editingBook.isActive !== false ? 'var(--color-warning-transparent)' : 'var(--color-success-transparent)', 
                                                color: editingBook.isActive !== false ? 'var(--color-warning)' : '#10b981', 
                                                border: `1px solid ${editingBook.isActive !== false ? 'var(--color-warning-light)' : '#10b981'}`, 
                                                borderRadius: '0.5rem', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.25rem', 
                                                fontSize: '0.85rem', 
                                                fontWeight: 600 
                                            }}
                                        >
                                            <Eye size={16} /> {editingBook.isActive !== false ? 'Hide' : 'Show'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(editingBook.id)}
                                            style={{ padding: '0.5rem', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', border: '1px solid var(--color-error-light)', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                                        >
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Book Title *</label>
                                <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Enter book title" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Category *</label>
                                <select name="category" value={formData.category} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{NATIVE_LABELS[cat] || cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Price (₹) *</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Weight (g) *</label>
                                    <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Description</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Enter book description/preface" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }} />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Cover Image</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '2px dashed var(--color-border)', borderRadius: '1rem', backgroundColor: 'var(--color-background)', alignItems: 'center', justifyContent: 'center' }}>
                                    <input type="file" onChange={handleImageChange} accept="image/*" id="cover-upload" style={{ display: 'none' }} />
                                    <label htmlFor="cover-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <ImageIcon size={32} color="var(--color-primary)" />
                                        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{coverImage ? 'Change Image' : 'Click to Upload Cover'}</span>
                                    </label>

                                    {(coverImage || formData.coverUrl) && (
                                        <div style={{ position: 'relative', width: '100px', marginTop: '0.5rem' }}>
                                            <LazyImage
                                                src={coverImage ? URL.createObjectURL(coverImage) : formData.coverUrl}
                                                alt="Cover Preview"
                                                width="100%"
                                                height="150px"
                                                borderRadius="0.75rem"
                                                objectFit="cover"
                                            />
                                            <button type="button" onClick={() => { setCoverImage(null); setFormData(p => ({ ...p, coverUrl: '' })); }} style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: 'var(--color-error)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><X size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setSearchParams({}, { replace: true })} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={uploading} style={{ flex: 2, padding: '1rem', borderRadius: '1rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, boxShadow: '0 4px 6px -1px var(--color-primary-transparent)' }}>
                                    {uploading ? 'Saving...' : (editingBook ? 'Update Book' : 'Add Book')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </div>
        </div >
    );
};

export default AdminBookManagement;
