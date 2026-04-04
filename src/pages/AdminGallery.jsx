import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, ChevronUp, ChevronDown, Share2, Folder, FolderPlus, ArrowLeft } from 'lucide-react';
import { collection, query, getDocs, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp, where } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase';
import { shareImage } from '@/utils/shareUtils';
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
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [events, setEvents] = useState([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [newEventForm, setNewEventForm] = useState({ name: '', order: 0 });
    const [newForm, setNewForm] = useState({ url: '', caption: '', order: 0, category: 'general', eventId: '' });

    useEffect(() => {
        fetchImages();
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const q = query(collection(db, 'gallery_events'), orderBy('order', 'asc'));
            const snapshot = await getDocs(q);
            setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching gallery events:", error);
        }
    };

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
        if (newForm.category === 'events' && !newForm.eventId) return alert("Please select an event folder");
        
        try {
            await addDoc(collection(db, 'gallery'), {
                ...newForm,
                order: parseInt(newForm.order) || 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewForm({ url: '', caption: '', order: images.length, category: 'general', eventId: '' });
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

    const handleMove = async (img, direction) => {
        const currentIndex = images.findIndex(i => i.id === img.id);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        
        if (targetIndex < 0 || targetIndex >= images.length) return;
        
        const neighbor = images[targetIndex];
        
        try {
            // Swap orders
            await updateDoc(doc(db, 'gallery', img.id), { order: neighbor.order, updatedAt: Timestamp.now() });
            await updateDoc(doc(db, 'gallery', neighbor.id), { order: img.order, updatedAt: Timestamp.now() });
            fetchImages();
        } catch (error) {
            console.error("Error moving image:", error);
        }
    };

    const startEdit = (img, e) => {
        if (e) e.stopPropagation();
        setEditingId(img.id);
        setEditForm({ 
            url: img.url, 
            caption: img.caption || '', 
            order: img.order || 0,
            category: img.category || 'general',
            eventId: img.eventId || ''
        });
    };

    const filteredImages = images.filter(img => {
        const cat = img.category || 'general';
        if (activeTab === 'general') return cat === 'general';
        if (activeTab === 'recent') {
            if (cat !== subTab) return false;
            if (subTab === 'events') {
                return img.eventId === selectedEventId;
            }
            return true;
        }
        return false;
    });

    const handleCreateEvent = async () => {
        if (!newEventForm.name) return;
        try {
            await addDoc(collection(db, 'gallery_events'), {
                ...newEventForm,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            setNewEventForm({ name: '', order: events.length });
            setShowEventModal(false);
            fetchEvents();
        } catch (error) {
            alert("Error creating event: " + error.message);
        }
    };

    const handleDeleteEvent = async (id, e) => {
        e?.stopPropagation();
        if (!confirm("Are you sure? This will NOT delete images, but they will be unlinked from this event.")) return;
        try {
            await deleteDoc(doc(db, 'gallery_events', id));
            fetchEvents();
            if (selectedEventId === id) setSelectedEventId(null);
        } catch (error) {
            alert("Error deleting event: " + error.message);
        }
    };

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
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    {activeTab === 'recent' && subTab === 'events' && selectedEventId && (
                        <button
                            onClick={() => setSelectedEventId(null)}
                            style={{
                                padding: '0.8rem',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    
                    <button
                        onClick={() => {
                            const defaultCategory = activeTab === 'recent' ? subTab : 'general';
                            setNewForm(prev => ({ 
                                ...prev, 
                                order: images.length,
                                category: defaultCategory,
                                eventId: selectedEventId || ''
                            }));
                            setShowAddModal(true);
                        }}
                        style={{
                            flex: 1,
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
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={20} /> Image to {activeTab === 'recent' ? (subTab === 'ayya' ? 'Ayya' : 'Current Event') : 'General'}
                    </button>

                    {activeTab === 'recent' && subTab === 'events' && !selectedEventId && (
                        <button
                            onClick={() => setShowEventModal(true)}
                            style={{
                                padding: '1rem',
                                backgroundColor: 'var(--color-success)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            <FolderPlus size={20} /> New Event
                        </button>
                    )}
                </div>

                {/* Event Folder List */}
                {activeTab === 'recent' && subTab === 'events' && !selectedEventId && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {events.map(event => (
                            <motion.div
                                key={event.id}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => setSelectedEventId(event.id)}
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                <Folder size={32} color="var(--color-primary)" fill="var(--color-primary-transparent)" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>{event.name}</span>
                                <button 
                                    onClick={(e) => handleDeleteEvent(event.id, e)}
                                    style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'none', border: 'none', color: 'var(--color-error)' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading gallery...</div>
                ) : activeTab === 'recent' && subTab === 'events' && !selectedEventId ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
                        Select an event folder above to manage its photos.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredImages.map((img) => (
                            <motion.div 
                                key={img.id} 
                                layout
                                whileHover={{ scale: 1.01, backgroundColor: 'var(--color-surface-hover)' }}
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--color-border)',
                                    padding: '1rem',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'center',
                                    transition: 'border-color 0.2s ease'
                                }}
                            >
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
                                            <div style={{ flex: 1 }} />
                                            <button onClick={() => shareImage(img)} style={{ padding: '0.5rem', color: 'var(--color-primary)', background: 'none', border: 'none' }}><Share2 size={20} /></button>
                                            <button onClick={() => handleDelete(img.id)} style={{ padding: '0.5rem', color: 'var(--color-error)', background: 'none', border: 'none' }}><Trash2 size={20} /></button>
                                            <button onClick={() => handleUpdate(img.id)} style={{ padding: '0.5rem', color: 'var(--color-success)', background: 'none', border: 'none' }}><Save size={20} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} style={{ padding: '0.5rem', color: 'var(--color-text-muted)', background: 'none', border: 'none' }}><X size={20} /></button>
                                        </div>
                                        {editForm.category === 'events' && (
                                            <select
                                                value={editForm.eventId}
                                                onChange={e => setEditForm({ ...editForm, eventId: e.target.value })}
                                                style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem', borderRadius: '0.25rem', border: '1px solid var(--color-primary)', fontSize: '0.8rem' }}
                                            >
                                                <option value="">-- Select Event Folder --</option>
                                                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => startEdit(img)}
                                        style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.caption || 'No caption'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.url}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Order: {img.order}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>• {img.category?.replace('_', ' ') || 'General'}</span>
                                        </div>
                                    </div>
                                )}
                                
                                {editingId !== img.id && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <button 
                                            disabled={images.indexOf(img) === 0}
                                            onClick={(e) => { e.stopPropagation(); handleMove(img, 'up'); }} 
                                            style={{ 
                                                padding: '0.25rem', 
                                                color: images.indexOf(img) === 0 ? 'var(--color-border)' : 'var(--color-primary)', 
                                                background: 'none', 
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <ChevronUp size={24} />
                                        </button>
                                        <button 
                                            disabled={images.indexOf(img) === images.length - 1}
                                            onClick={(e) => { e.stopPropagation(); handleMove(img, 'down'); }} 
                                            style={{ 
                                                padding: '0.25rem', 
                                                color: images.indexOf(img) === images.length - 1 ? 'var(--color-border)' : 'var(--color-primary)', 
                                                background: 'none', 
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <ChevronDown size={24} />
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Image Modal */}
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
                                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                        {['general', 'events', 'ayya'].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setNewForm({ ...newForm, category: cat })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem',
                                                    fontSize: '0.85rem',
                                                    borderRadius: '0.4rem',
                                                    border: `1px solid ${newForm.category === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                                    backgroundColor: newForm.category === cat ? 'var(--color-primary-transparent)' : 'var(--color-card)',
                                                    color: newForm.category === cat ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                                    fontWeight: 600,
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    {newForm.category === 'events' && (
                                        <select
                                            value={newForm.eventId}
                                            onChange={e => setNewForm({ ...newForm, eventId: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-primary)', backgroundColor: 'var(--color-surface)' }}
                                        >
                                            <option value="">-- Select Event Folder --</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                        </select>
                                    )}
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

            {/* Event Folder Modal */}
            <AnimatePresence>
                {showEventModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 110, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                        onClick={() => setShowEventModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{ backgroundColor: 'var(--color-card)', padding: '1.5rem', borderRadius: '1rem', width: '100%', maxWidth: '24rem', boxShadow: 'var(--shadow-lg)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>Create Event Folder</h3>
                                <button onClick={() => setShowEventModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)' }}><X size={24} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Folder Name</label>
                                    <input
                                        autoFocus
                                        value={newEventForm.name}
                                        onChange={e => setNewEventForm({ ...newEventForm, name: e.target.value })}
                                        placeholder="e.g. Coimbatore Event 2024"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button 
                                        onClick={() => setShowEventModal(false)} 
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCreateEvent} 
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Create Folder
                                    </button>
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
