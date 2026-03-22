import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { collection, query, getDocs, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import PageHeader from '@/components/PageHeader';

const AdminGallery = () => {
    const [images, setImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ url: '', caption: '', order: 0, category: 'general' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [subTab, setSubTab] = useState('events');
    const [newForm, setNewForm] = useState({ url: '', caption: '', order: 0, category: 'general' });

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            setImages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching gallery:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file, isEdit = false) => {
        if (!file) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `gallery/${fileName}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    console.error("Upload failed:", error);
                    setIsUploading(false);
                    alert("Upload failed: " + error.message);
                    reject(error);
                }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setIsUploading(false);
                    if (isEdit) {
                        setEditForm(prev => ({ ...prev, url: downloadURL, storagePath }));
                    } else {
                        setNewForm(prev => ({ ...prev, url: downloadURL, storagePath }));
                    }
                    resolve(downloadURL);
                }
            );
        });
    };

    const handleAdd = async () => {
        if (!newForm.url) return alert("URL is required");
        try {
            await addDoc(collection(db, 'gallery'), {
                ...newForm,
                order: parseInt(newForm.order) || 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewForm({ url: '', caption: '', order: images.length });
            setShowAddModal(false);
            fetchImages();
        } catch (error) {
            alert("Error adding image: " + error.message);
        }
    };

    const handleUpdate = async (id) => {
        try {
            await updateDoc(doc(db, 'gallery', id), {
                ...editForm,
                order: parseInt(editForm.order) || 0,
                updatedAt: Timestamp.now()
            });
            setEditingId(null);
            fetchImages();
        } catch (error) {
            alert("Error updating image: " + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this image?")) return;
        try {
            await deleteDoc(doc(db, 'gallery', id));
            fetchImages();
        } catch (error) {
            alert("Error deleting image: " + error.message);
        }
    };

    const startEdit = (img) => {
        setEditingId(img.id);
        setEditForm({ 
            url: img.url, 
            caption: img.caption || '', 
            order: img.order || 0,
            category: img.category || 'general'
        });
    };

    const filteredImages = images.filter(img => {
        const cat = img.category || 'general';
        if (activeTab === 'general') return cat === 'general';
        if (activeTab === 'recent') return cat === subTab;
        return false;
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader title="Gallery Management" />

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--color-border)',
                padding: '0 1rem',
                backgroundColor: 'var(--color-surface)',
                position: 'sticky',
                top: '56px',
                zIndex: 10
            }}>
                {[
                    { id: 'general', label: 'General' },
                    { id: 'recent', label: 'Recent' }
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '0.75rem 0.25rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'color 0.2s'
                            }}
                        >
                            {tab.label}
                            {isActive && (
                                <motion.div
                                    layoutId="adminGalleryTabUnderline"
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        backgroundColor: 'var(--color-primary)',
                                        borderRadius: '99px'
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            <AnimatePresence>
                {activeTab === 'recent' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            borderBottom: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            position: 'sticky',
                            top: '109px',
                            zIndex: 9,
                            overflow: 'hidden'
                        }}
                    >
                        {[
                            { id: 'events', label: 'Events' },
                            { id: 'ayya', label: 'Ayya' }
                        ].map(tab => {
                            const isActive = subTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSubTab(tab.id)}
                                    style={{
                                        padding: '0.625rem 0.25rem',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s'
                                    }}
                                >
                                    {tab.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="adminGallerySubTabUnderline"
                                            style={{
                                                position: 'absolute',
                                                bottom: 2,
                                                left: 0,
                                                right: 0,
                                                height: '2px',
                                                backgroundColor: 'var(--color-primary)',
                                                borderRadius: '99px'
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1rem' }}>
                <button
                    onClick={() => {
                        const defaultCategory = activeTab === 'recent' ? subTab : 'general';
                        setNewForm(prev => ({ 
                            ...prev, 
                            order: images.length,
                            category: defaultCategory
                        }));
                        setShowAddModal(true);
                    }}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={20} /> Add to {activeTab === 'recent' ? (subTab === 'ayya' ? 'Ayya' : 'Events') : 'General'}
                </button>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading gallery...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredImages.map((img) => (
                            <div key={img.id} style={{
                                backgroundColor: 'var(--color-card)',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--color-border)',
                                padding: '1rem',
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>

                                {editingId === img.id ? (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.50rem',
                                                    fontSize: '0.875rem',
                                                    borderRadius: '0.4rem',
                                                    border: '1px dashed var(--color-primary)',
                                                    backgroundColor: 'var(--color-primary-transparent)',
                                                    color: 'var(--color-primary)',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isUploading ? `Uploading...` : 'Change Image'}
                                            </button>
                                        </div>
                                        <input
                                            value={editForm.url}
                                            onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                                            placeholder="Image URL"
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)' }}
                                        />
                                        <input
                                            value={editForm.caption}
                                            onChange={e => setEditForm({ ...editForm, caption: e.target.value })}
                                            placeholder="Caption"
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)' }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
                                            {['general', 'events', 'ayya'].map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, category: cat })}
                                                    style={{
                                                        flexShrink: 0,
                                                        padding: '0.4rem 0.6rem',
                                                        fontSize: '0.75rem',
                                                        borderRadius: '0.25rem',
                                                        border: `1px solid ${editForm.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                        backgroundColor: editForm.category === cat ? 'var(--color-primary-transparent)' : 'transparent',
                                                        color: editForm.category === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                        cursor: 'pointer',
                                                        textTransform: 'capitalize',
                                                        fontWeight: editForm.category === cat ? 700 : 500
                                                    }}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="number"
                                                value={editForm.order}
                                                onChange={e => setEditForm({ ...editForm, order: e.target.value })}
                                                placeholder="Order"
                                                style={{ width: '60px', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--color-border)' }}
                                            />
                                            <button onClick={() => handleUpdate(img.id)} style={{ padding: '0.5rem', color: 'var(--color-success)', background: 'none', border: 'none' }}><Save size={20} /></button>
                                            <button onClick={() => setEditingId(null)} style={{ padding: '0.5rem', color: 'var(--color-text-muted)', background: 'none', border: 'none' }}><X size={20} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.caption || 'No caption'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.url}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Order: {img.order}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>• {img.category?.replace('_', ' ') || 'General'}</span>
                                        </div>
                                    </div>
                                )}

                                {editingId !== img.id && (
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button onClick={() => startEdit(img)} style={{ padding: '0.5rem', color: 'var(--color-primary)', background: 'none', border: 'none' }}><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(img.id)} style={{ padding: '0.5rem', color: 'var(--color-error)', background: 'none', border: 'none' }}><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '30rem' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ marginBottom: '1rem' }}>Add New Gallery Image</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Image Source</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px dashed var(--color-primary)',
                                                backgroundColor: 'var(--color-primary-transparent)',
                                                color: 'var(--color-primary)',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <Plus size={18} /> {isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload from Device'}
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={(e) => handleFileUpload(e.target.files[0])}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                        />
                                    </div>
                                    <input
                                        value={newForm.url}
                                        onChange={e => setNewForm({ ...newForm, url: e.target.value })}
                                        placeholder="Or enter URL directly"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                    />
                                    {isUploading && (
                                        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                            <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Caption</label>
                                    <input
                                        value={newForm.caption}
                                        onChange={e => setNewForm({ ...newForm, caption: e.target.value })}
                                        placeholder="Enter image caption"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Display Order</label>
                                    <input
                                        type="number"
                                        value={newForm.order}
                                        onChange={e => setNewForm({ ...newForm, order: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Category</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['general', 'events', 'ayya'].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setNewForm({ ...newForm, category: cat })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    borderRadius: '0.5rem',
                                                    border: `1px solid ${newForm.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                    backgroundColor: newForm.category === cat ? 'var(--color-primary-transparent)' : 'var(--color-card)',
                                                    color: newForm.category === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'none' }}>Cancel</button>
                                    <button onClick={handleAdd} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600 }}>Add Image</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminGallery;
