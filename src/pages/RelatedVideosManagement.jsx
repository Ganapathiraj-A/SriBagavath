import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, orderBy } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import PageHeader from '@/components/PageHeader';
import { Plus, Trash2, Edit, Save, X, ExternalLink, Video, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RelatedVideosManagement = () => {
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [isFetching, setIsFetching] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ title: '', url: '', category: 'general' });

    useEffect(() => {
        console.log("Subscribing to relatedVideos (unordered for migration safety)...");
        const q = query(collection(db, 'relatedVideos'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("Firestore Snapshot received. Doc count:", snapshot.docs.length);
            let fetchedVideos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Memory sort for visibility of legacy items
            fetchedVideos.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

            const needsOrder = fetchedVideos.some(v => v.order === undefined);
            if (needsOrder) {
                console.log("Legacy data detected. Initiating order fix...");
                fixLegacyOrdering(fetchedVideos);
            }
            setVideos(fetchedVideos);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Snapshot Error!", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fixLegacyOrdering = async (data) => {
        for (let i = 0; i < data.length; i++) {
            const updates = {};
            if (data[i].order === undefined) updates.order = i;
            if (data[i].category === undefined) updates.category = 'general';

            if (Object.keys(updates).length > 0) {
                await setDoc(doc(db, 'relatedVideos', data[i].id), updates, { merge: true });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.url) return;

        try {
            const docId = editingId || doc(collection(db, 'relatedVideos')).id;
            const videoData = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (!editingId) {
                // New item: put at bottom of its category
                const categoryVideos = videos.filter(v => v.category === formData.category);
                const maxOrder = categoryVideos.length > 0 ? Math.max(...categoryVideos.map(v => v.order || 0)) : -1;
                videoData.order = maxOrder + 1;
                videoData.createdAt = serverTimestamp();
            }

            await setDoc(doc(db, 'relatedVideos', docId), videoData, { merge: true });

            resetForm();
            alert(editingId ? "Video updated successfully!" : "Video added successfully!");
        } catch (error) {
            console.error("Error saving video:", error);
            alert("Failed to save video");
        }
    };

    const handleEdit = (video) => {
        setFormData({ title: video.title, url: video.url, category: video.category || 'general' });
        setEditingId(video.id);
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this video entry?")) return;
        try {
            await deleteDoc(doc(db, 'relatedVideos', id));
        } catch (error) {
            console.error("Error deleting video:", error);
            alert("Failed to delete video");
        }
    };

    const handleMove = async (index, direction) => {
        const categoryVideos = videos.filter(v => (v.category || 'general') === activeTab);
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= categoryVideos.length) return;

        const currentVideo = categoryVideos[index];
        const targetVideo = categoryVideos[targetIndex];

        try {
            // Swap orders
            const currentRef = doc(db, 'relatedVideos', currentVideo.id);
            const targetRef = doc(db, 'relatedVideos', targetVideo.id);

            const tempOrder = currentVideo.order;
            await setDoc(currentRef, { order: targetVideo.order }, { merge: true });
            await setDoc(targetRef, { order: tempOrder }, { merge: true });
        } catch (error) {
            console.error("Error reordering:", error);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', url: '', category: activeTab });
        setIsAdding(false);
        setEditingId(null);
        setIsFetching(false);
    };

    const fetchPlaylistTitle = async (url) => {
        if (!url || formData.title) return; // Don't overwrite existing title

        // Simple regex to check if it's a YouTube URL
        if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) return;

        setIsFetching(true);
        try {
            // Use YouTube oEmbed API to get metadata
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await fetch(oEmbedUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.title && !formData.title) {
                    setFormData(prev => ({ ...prev, title: data.title }));
                }
            }
        } catch (error) {
            console.error("Error fetching playlist title:", error);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
            <PageHeader
                title="Related Videos Management"
                rightAction={
                    <button
                        onClick={() => navigate('/videos')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '20px',
                            color: '#4b5563',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Eye size={16} /> View Listing
                    </button>
                }
            />

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem', paddingBottom: '2rem' }}>

                {/* Add/Edit Button */}
                {!isAdding && (
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAdding(true)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '0.75rem',
                            border: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '2rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        <Plus size={20} /> Add New Playlist
                    </motion.button>
                )}

                {/* Form Section */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                marginBottom: '2rem',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--color-text)' }}>{editingId ? 'Edit Playlist' : 'New Playlist'}</h3>
                                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                                        Title {isFetching && <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 400 }}>Fetching...</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder={isFetching ? "Fetching title..." : "e.g., Monthly Satsang Playlists"}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', opacity: isFetching ? 0.7 : 1 }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>YouTube URL</label>
                                    <input
                                        type="url"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        onBlur={() => fetchPlaylistTitle(formData.url)}
                                        placeholder="https://youtube.com/playlist?list=..."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Category</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {['general', 'teachers'].map(cat => (
                                            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--color-text)' }}>
                                                <input
                                                    type="radio"
                                                    name="category"
                                                    value={cat}
                                                    checked={formData.category === cat}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Save size={18} /> {editingId ? 'Update Entry' : 'Save Entry'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tabs Section */}
                <div style={{ display: 'flex', backgroundColor: 'var(--color-background)', padding: '4px', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
                    {['general', 'teachers'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* List Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Entries
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            {videos.filter(v => (v.category || 'general') === activeTab).length} videos
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading entries...</div>
                    ) : videos.filter(v => (v.category || 'general') === activeTab).length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: '16px',
                            border: '1px dashed var(--color-border)',
                            color: 'var(--color-text-muted)'
                        }}>
                            <Video size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>No playlists in {activeTab} yet.</p>
                        </div>
                    ) : (
                        videos.filter(v => (v.category || 'general') === activeTab).map((video, index, filteredList) => (
                            <motion.div
                                key={video.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    backgroundColor: 'var(--color-surface)',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid var(--color-border)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, overflow: 'hidden' }}>
                                    {/* Reorder Buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button
                                            onClick={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            style={{
                                                padding: '2px',
                                                color: index === 0 ? 'var(--color-text-light)' : 'var(--color-text-muted)',
                                                cursor: index === 0 ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <ChevronUp size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'down')}
                                            disabled={index === filteredList.length - 1}
                                            style={{
                                                padding: '2px',
                                                color: index === filteredList.length - 1 ? 'var(--color-text-light)' : 'var(--color-text-muted)',
                                                cursor: index === filteredList.length - 1 ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                    </div>

                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Video size={16} color="#ef4444" />
                                            {video.title}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>
                                            {video.url}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                                    <button
                                        onClick={() => window.open(video.url, '_blank')}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-primary)', cursor: 'pointer' }}
                                        title="View Link"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(video)}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: '#6366f1', cursor: 'pointer' }}
                                        title="Edit"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: '#ef4444', cursor: 'pointer' }}
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelatedVideosManagement;
