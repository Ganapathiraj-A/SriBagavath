import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Edit2, Trash2, Save, ChevronLeft, User, Phone, Mail, Image as ImageIcon, CheckCircle2, Circle
} from 'lucide-react';
import { db, storage } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from '@/utils/FirestoreProxy';
import { ref, deleteObject } from 'firebase/storage';
import { bumpServerVersion } from '@/utils/SyncManager';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { compressImage } from '@/utils/imageUtils';
import { TransactionService } from '@/services/TransactionService';
import { StatsService } from '@/services/StatsService';
import '../components/RegistrationStyles.css';

const TeacherManagementPanel = () => {
    // eslint-disable-next-line no-unused-vars
    const navigate = useNavigate();
    // eslint-disable-next-line no-unused-vars
    const location = useLocation();
    
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        image: '',
        googleId: '',
        phoneNumber: '',
        showInConsultation: false,
        consultationOrder: 999
    });

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const ref = collection(db, 'teachers');
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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
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
                await updateDoc(doc(db, 'teachers', editingId), dataToSave);
                // Backward compatibility: sync to legacy collection
                await updateDoc(doc(db, 'daily_zoom_teachers', editingId), {
                    name: dataToSave.name,
                    image: dataToSave.image,
                    googleId: dataToSave.googleId,
                    phoneNumber: dataToSave.phoneNumber
                }).catch(e => console.warn('Legacy sync failed:', e));
                alert('Teacher updated!');
            } else {
                const docRef = await addDoc(collection(db, 'teachers'), {
                    ...dataToSave,
                    createdAt: new Date().toISOString()
                });
                teacherId = docRef.id;
                // Backward compatibility: sync to legacy collection using same ID
                await updateDoc(doc(db, 'daily_zoom_teachers', teacherId), {
                    name: dataToSave.name,
                    image: dataToSave.image,
                    googleId: dataToSave.googleId,
                    phoneNumber: dataToSave.phoneNumber,
                    createdAt: new Date().toISOString()
                }).catch(async (e) => {
                    const { setDoc } = await import('@/utils/FirestoreProxy');
                    await setDoc(doc(db, 'daily_zoom_teachers', teacherId), {
                        name: dataToSave.name,
                        image: dataToSave.image,
                        googleId: dataToSave.googleId,
                        phoneNumber: dataToSave.phoneNumber,
                        createdAt: new Date().toISOString()
                    });
                });
                alert('Teacher added!');
            }

            if (newImageFile && finalImageUrl && finalImageUrl.startsWith('data:')) {
                try {
                    const downloadUrl = await TransactionService.uploadBase64ToStorage(teacherId, finalImageUrl, 'teachers', 'photo.jpg');
                    await updateDoc(doc(db, 'teachers', teacherId), { image: downloadUrl });
                    await updateDoc(doc(db, 'daily_zoom_teachers', teacherId), { image: downloadUrl }).catch(() => {});
                    const sizeInBytes = finalImageUrl.length * 0.75;
                    StatsService.recordImage(sizeInBytes).catch(() => { });
                } catch (storageErr) {
                    console.error("Teacher photo storage upload failed", storageErr);
                }
            }

            await bumpServerVersion('teachers');
            await bumpServerVersion('daily_zoom_meetings');
            await bumpServerVersion('consultants');

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
            phoneNumber: teacher.phoneNumber || '',
            showInConsultation: teacher.showInConsultation || false,
            consultationOrder: teacher.consultationOrder !== undefined ? teacher.consultationOrder : 999
        });
        setEditingId(teacher.id);
        setIsEditing(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this teacher?')) {
            try {
                await deleteDoc(doc(db, 'teachers', id));
                await deleteDoc(doc(db, 'daily_zoom_teachers', id)).catch(() => {});
                try {
                    const storageRef = ref(storage, `teachers/${id}/photo.jpg`);
                    await deleteObject(storageRef);
                } catch (e) {
                    console.warn("Storage deletion failed", e);
                }
                await bumpServerVersion('teachers');
                loadTeachers();
            } catch (_err) {
                alert('Error deleting: ' + _err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({ 
            name: '', 
            image: '', 
            googleId: '', 
            phoneNumber: '',
            showInConsultation: false,
            consultationOrder: 999
        });
        setIsEditing(false);
        setEditingId(null);
    };

    return (
        <div style={{ padding: '0.5rem 0' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
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
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Phone Number (for Consultation)</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                placeholder="+91 ..."
                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setFormData(prev => ({ ...prev, showInConsultation: !prev.showInConsultation }))}>
                                {formData.showInConsultation ? <CheckCircle2 color="var(--color-primary)" size={20} /> : <Circle color="var(--color-text-muted)" size={20} />}
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Show in Consultation</span>
                            </div>
                            {formData.showInConsultation && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Order:</label>
                                    <input
                                        type="number"
                                        name="consultationOrder"
                                        value={formData.consultationOrder}
                                        onChange={handleInputChange}
                                        style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Google ID (for Zoom admin matching)</label>
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
                                <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: 'var(--color-surface)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                                    {formData.image ? (
                                        <LazyImage src={formData.image} alt="" width="100%" height="100%" objectFit="cover" borderRadius="50%" />
                                    ) : (
                                        <User size={24} color="var(--color-text-muted)" />
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <input id="teacher-photo" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                    <label htmlFor="teacher-photo" style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', textAlign: 'center' }}>
                                        <ImageIcon size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                        {formData.image ? 'Change' : 'Choose'}
                                    </label>
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
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>All Teachers ({teachers.length})</h2>
                    {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p> : teachers.map(t => (
                        <div key={t.id} style={{ backgroundColor: 'var(--color-card)', padding: '0.75rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                {t.image ? <LazyImage src={t.image} alt={t.name} width="100%" height="100%" objectFit="cover" borderRadius="50%" /> : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--color-text-muted)" /></div>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.95rem' }}>{t.name}</div>
                                {t.showInConsultation && <span style={{ fontSize: '0.6rem', backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', padding: '1px 5px', borderRadius: '99px' }}>Consultant</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button onClick={() => handleEdit(t)} style={{ padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(t.id)} style={{ padding: '0.4rem', borderRadius: '0.4rem', border: '1px solid var(--color-error-transparent)', backgroundColor: 'var(--color-error-transparent)', cursor: 'pointer' }}><Trash2 size={14} color="var(--color-error)" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default TeacherManagementPanel;
