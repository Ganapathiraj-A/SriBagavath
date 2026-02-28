import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, Save, ChevronLeft, Circle
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, writeBatch } from '@/utils/FirestoreProxy';
import PageHeader from '@/components/PageHeader';

const DailyZoomLinkManagement = () => {
    const navigate = useNavigate();
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        url: '',
        isDefault: false
    });

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        try {
            setLoading(true);
            const ref = collection(db, 'daily_zoom_links');
            const q = query(ref, orderBy('name', 'asc'));
            const snap = await getDocs(q);
            setLinks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (_err) {
            console.error('Error loading links:', _err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const ref = collection(db, 'daily_zoom_links');

            // If setting as default, unset other defaults first
            if (formData.isDefault) {
                const batch = writeBatch(db);
                links.forEach(l => {
                    if (l.isDefault && l.id !== editingId) {
                        batch.update(doc(db, 'daily_zoom_links', l.id), { isDefault: false });
                    }
                });
                await batch.commit();
            }

            if (editingId) {
                await updateDoc(doc(db, 'daily_zoom_links', editingId), formData);
                alert('Link updated!');
            } else {
                await addDoc(ref, {
                    ...formData,
                    createdAt: new Date().toISOString()
                });
                alert('Link added!');
            }
            resetForm();
            loadLinks();
        } catch (_err) {
            alert('Error: ' + _err.message);
        }
    };

    const toggleDefault = async (link) => {
        try {
            const batch = writeBatch(db);
            links.forEach(l => {
                batch.update(doc(db, 'daily_zoom_links', l.id), { isDefault: l.id === link.id });
            });
            await batch.commit();
            loadLinks();
        } catch (_err) {
            alert('Error updating default: ' + _err.message);
        }
    };

    const handleEdit = (link) => {
        setFormData({
            name: link.name || '',
            url: link.url || '',
            isDefault: link.isDefault || false
        });
        setEditingId(link.id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this meeting link?')) {
            try {
                await deleteDoc(doc(db, 'daily_zoom_links', id));
                loadLinks();
            } catch (_err) {
                alert('Error deleting: ' + _err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({ name: '', url: '', isDefault: false });
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Manage Meeting Links"
                leftAction={
                    <button onClick={() => navigate('/admin/daily-zoom')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', marginBottom: '2rem' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Link Label</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g. Main Zoom Room, Secondary Link"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Meeting URL</label>
                                <input
                                    type="url"
                                    name="url"
                                    value={formData.url}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="https://zoom.us/j/..."
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    name="isDefault"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={handleInputChange}
                                    style={{ width: '1rem', height: '1rem' }}
                                />
                                <label htmlFor="isDefault" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>Set as default link for new meetings</label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> {isEditing ? 'Update Link' : 'Add Link'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Stored Meeting Links</h2>
                        {loading ? <p>Loading links...</p> : links.length === 0 ? <p style={{ color: '#6b7280' }}>No links stored yet.</p> : (
                            links.map(l => (
                                <div key={l.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', border: l.isDefault ? '2px solid #f97316' : '1px solid #e5e7eb' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#111827' }}>{l.name}</span>
                                            {l.isDefault && <span style={{ fontSize: '0.65rem', backgroundColor: '#fff7ed', color: '#f97316', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Default</span>}
                                        </div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: '#6b7280',
                                            overflow: 'hidden',
                                            wordBreak: 'break-all',
                                            overflowWrap: 'anywhere',
                                            whiteSpace: 'normal'
                                        }}>{l.url}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {!l.isDefault && (
                                            <button onClick={() => toggleDefault(l)} title="Set as Default" style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #e5e7eb', background: 'none', cursor: 'pointer' }}>
                                                <Circle size={16} color="#9ca3af" />
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(l)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #e5e7eb', background: 'none', cursor: 'pointer' }}><Edit2 size={16} color="#4b5563" /></button>
                                        <button onClick={() => handleDelete(l.id)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #fee2e2', backgroundColor: '#fff1f1', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default DailyZoomLinkManagement;
