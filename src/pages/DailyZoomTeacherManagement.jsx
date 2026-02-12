import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, Save, X, ChevronLeft, User, Phone, Mail, Image as ImageIcon
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from '@/utils/FirestoreProxy';
import PageHeader from '@/components/PageHeader';
import { compressImage } from '@/utils/imageUtils';

const DailyZoomTeacherManagement = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        image: '',
        googleId: '',
        phoneNumber: ''
    });

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const ref = collection(db, 'daily_zoom_teachers');
            const q = query(ref, orderBy('name', 'asc'));
            const snap = await getDocs(q);
            setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (_err) {
            console.error('Error loading teachers:', _err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const compressedBase64 = await compressImage(reader.result, 400, 400, 0.7);
                    setFormData(prev => ({ ...prev, image: compressedBase64 }));
                } catch (_err) {
                    console.error("Compression failed:", _err);
                    setFormData(prev => ({ ...prev, image: reader.result }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'daily_zoom_teachers', editingId), formData);
                alert('Teacher updated!');
            } else {
                await addDoc(collection(db, 'daily_zoom_teachers'), {
                    ...formData,
                    createdAt: new Date().toISOString()
                });
                alert('Teacher added!');
            }
            resetForm();
            loadTeachers();
        } catch (_err) {
            alert('Error: ' + _err.message);
        }
    };

    const handleEdit = (teacher) => {
        setFormData({
            name: teacher.name || '',
            image: teacher.image || '',
            googleId: teacher.googleId || '',
            phoneNumber: teacher.phoneNumber || ''
        });
        setEditingId(teacher.id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this teacher? This won\'t affect existing meetings.')) {
            try {
                await deleteDoc(doc(db, 'daily_zoom_teachers', id));
                loadTeachers();
            } catch (_err) {
                alert('Error deleting: ' + _err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({ name: '', image: '', googleId: '', phoneNumber: '' });
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Manage Teachers"
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
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Full Name"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="+91 ..."
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Google ID (for admin matching)</label>
                                <input
                                    type="text"
                                    name="googleId"
                                    value={formData.googleId}
                                    onChange={handleInputChange}
                                    placeholder="google-id-string"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Photo</label>
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed #d1d5db' }}>
                                    <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '1rem', backgroundColor: 'white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                                        {formData.image ? <img src={formData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} color="#9ca3af" />}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                        <input
                                            id="teacher-photo"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <label
                                            htmlFor="teacher-photo"
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                backgroundColor: 'white',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: '#374151',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <ImageIcon size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            {formData.image ? 'Change Photo' : 'Choose Photo'}
                                        </label>
                                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                            JPG or PNG recommended
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> {isEditing ? 'Update Teacher' : 'Add Teacher'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Registered Teachers</h2>
                        {loading ? <p>Loading teachers...</p> : teachers.length === 0 ? <p style={{ color: '#6b7280' }}>No teachers registered yet.</p> : (
                            teachers.map(t => (
                                <div key={t.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', border: '1px solid #e5e7eb' }}>
                                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                        {t.image ? <img src={t.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="#9ca3af" /></div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: '#111827' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {t.phoneNumber && <><Phone size={12} /> {t.phoneNumber}</>}
                                            {t.googleId && <><Mail size={12} style={{ marginLeft: t.phoneNumber ? '8px' : '0' }} /> {t.googleId}</>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(t)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #e5e7eb', background: 'none', cursor: 'pointer' }}><Edit2 size={16} color="#4b5563" /></button>
                                        <button onClick={() => handleDelete(t.id)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid #fee2e2', backgroundColor: '#fff1f1', cursor: 'pointer' }}><Trash2 size={16} color="#ef4444" /></button>
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

export default DailyZoomTeacherManagement;
