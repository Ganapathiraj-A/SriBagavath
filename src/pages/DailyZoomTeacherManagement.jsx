import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Edit2, Trash2, Save, ChevronLeft, User, Phone, Mail, Image as ImageIcon
} from 'lucide-react';
import { db, storage } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from '@/utils/FirestoreProxy';
import { ref, deleteObject } from 'firebase/storage';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { compressImage } from '@/utils/imageUtils';
import { TransactionService } from '@/services/TransactionService';
import { StatsService } from '@/services/StatsService';
import '../components/RegistrationStyles.css';

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
                    setFormData(prev => ({ ...prev, image: compressedBase64, newImageFile: file }));
                } catch (_err) {
                    console.error("Compression failed:", _err);
                    setFormData(prev => ({ ...prev, image: reader.result, newImageFile: file }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { newImageFile, ...dataToSave } = formData;
            let teacherId = editingId;
            let finalImageUrl = dataToSave.image;

            if (editingId) {
                await updateDoc(doc(db, 'daily_zoom_teachers', editingId), dataToSave);
                alert('Teacher updated!');
            } else {
                const docRef = await addDoc(collection(db, 'daily_zoom_teachers'), {
                    ...dataToSave,
                    createdAt: new Date().toISOString()
                });
                teacherId = docRef.id;
                alert('Teacher added!');
            }

            // Move image to Cloud Storage if it's new
            if (newImageFile && finalImageUrl && finalImageUrl.startsWith('data:')) {
                try {
                    const downloadUrl = await TransactionService.uploadBase64ToStorage(teacherId, finalImageUrl, 'teachers', 'photo.jpg');
                    await updateDoc(doc(db, 'daily_zoom_teachers', teacherId), { image: downloadUrl });

                    // Update stats
                    const sizeInBytes = finalImageUrl.length * 0.75;
                    StatsService.recordImage(sizeInBytes).catch(() => { });
                } catch (storageErr) {
                    console.error("Teacher photo storage upload failed, keeping as Base64", storageErr);
                }
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

                // Delete photo from storage
                try {
                    const storageRef = ref(storage, `teachers/${id}/photo.jpg`);
                    await deleteObject(storageRef);
                } catch (e) {
                    console.warn("Storage deletion failed or file didn't exist", e);
                }

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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Manage Teachers"
                leftAction={
                    <button onClick={() => navigate('/admin/daily-zoom')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Full Name"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    placeholder="+91 ..."
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Google ID (for admin matching)</label>
                                <input
                                    type="text"
                                    name="googleId"
                                    value={formData.googleId}
                                    onChange={handleInputChange}
                                    placeholder="google-id-string"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Photo</label>
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed var(--color-border)' }}>
                                    <div style={{ width: '4.5rem', height: '4.5rem', borderRadius: '1rem', backgroundColor: 'var(--color-surface)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                                        {formData.image ? (
                                            <LazyImage
                                                src={formData.image}
                                                alt=""
                                                width="100%"
                                                height="100%"
                                                objectFit="cover"
                                                borderRadius="1rem"
                                            />
                                        ) : (
                                            <User size={28} color="var(--color-text-muted)" />
                                        )}
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
                                                backgroundColor: 'var(--color-surface)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text)',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}
                                        >
                                            <ImageIcon size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            {formData.image ? 'Change Photo' : 'Choose Photo'}
                                        </label>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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
                                    <button type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: '0.5rem', border: '1px solid var(--color-border)', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>Registered Teachers</h2>
                        {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Loading teachers...</p> : teachers.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>No teachers registered yet.</p> : (
                            teachers.map(t => (
                                <div key={t.id} style={{ backgroundColor: 'var(--color-card)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                        {t.image ? (
                                            <LazyImage
                                                src={t.image}
                                                alt={t.name}
                                                width="100%"
                                                height="100%"
                                                objectFit="cover"
                                                borderRadius="50%"
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={20} color="var(--color-text-muted)" />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {t.phoneNumber && <><Phone size={12} /> {t.phoneNumber}</>}
                                            {t.googleId && <><Mail size={12} style={{ marginLeft: t.phoneNumber ? '8px' : '0' }} /> {t.googleId}</>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(t)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}><Edit2 size={16} color="var(--color-text-muted)" /></button>
                                        <button onClick={() => handleDelete(t.id)} style={{ padding: '0.5rem', borderRadius: '0.4rem', border: '1px solid var(--color-error-transparent)', backgroundColor: 'var(--color-error-transparent)', cursor: 'pointer' }}><Trash2 size={16} color="var(--color-error)" /></button>
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
