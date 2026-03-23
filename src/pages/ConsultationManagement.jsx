import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Trash2, Save, ChevronUp, ChevronDown, ChevronLeft, User, Phone, ExternalLink, Settings, Plus, CheckCircle2, Circle
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, updateDoc, doc, getDocs, query, orderBy, where } from '@/utils/FirestoreProxy';
import { bumpServerVersion } from '@/utils/SyncManager';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import '../components/RegistrationStyles.css';

const ConsultationManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            setLoading(true);
            const ref = collection(db, 'teachers');
            const q = query(ref, orderBy('name', 'asc'));
            const snap = await getDocs(q);
            const loadedTeachers = snap.docs.map(d => ({ 
                id: d.id, 
                consultationOrder: 999, // Default
                ...d.data() 
            }));
            
            // Sort by consultationOrder, then name
            loadedTeachers.sort((a, b) => {
                const orderA = a.consultationOrder !== undefined ? a.consultationOrder : 999;
                const orderB = b.consultationOrder !== undefined ? b.consultationOrder : 999;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
            
            setTeachers(loadedTeachers);
        } catch (error) {
            console.error('Error loading teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleConsultation = async (teacher) => {
        try {
            const newState = !teacher.showInConsultation;
            await updateDoc(doc(db, 'teachers', teacher.id), { 
                showInConsultation: newState,
                consultationOrder: teacher.consultationOrder !== undefined ? teacher.consultationOrder : 999
            });

            // Backward compatibility: sync to legacy 'consultants' collection
            if (newState) {
                const { setDoc } = await import('@/utils/FirestoreProxy');
                await setDoc(doc(db, 'consultants', teacher.id), {
                    name: teacher.name,
                    number: teacher.phoneNumber || '',
                    order: teacher.consultationOrder !== undefined ? teacher.consultationOrder : 999
                });
            } else {
                const { deleteDoc: delDoc } = await import('@/utils/FirestoreProxy');
                await delDoc(doc(db, 'consultants', teacher.id)).catch(() => {});
            }

            await bumpServerVersion('consultants');
            await bumpServerVersion('teachers');
            loadTeachers();
        } catch (error) {
            alert('Error updating: ' + error.message);
        }
    };

    const handleReorder = async (newList) => {
        const itemsToUpdate = newList.filter(t => t.showInConsultation);
        setTeachers(newList);
        try {
            const updates = itemsToUpdate.map((item, index) => {
                const p1 = updateDoc(doc(db, 'teachers', item.id), { consultationOrder: index });
                // Backward compatibility sync
                const p2 = updateDoc(doc(db, 'consultants', item.id), { order: index }).catch(() => {});
                return Promise.all([p1, p2]);
            });
            await Promise.all(updates.flat());
            await bumpServerVersion('consultants');
            await bumpServerVersion('teachers');
        } catch (error) {
            console.error('Error reordering:', error);
            loadTeachers();
        }
    };

    const moveItem = (index, direction) => {
        const shownItems = teachers.filter(t => t.showInConsultation);
        const item = shownItems[index];
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < shownItems.length) {
            // Find global indices
            const globalIndex = teachers.findIndex(t => t.id === item.id);
            const targetItem = shownItems[targetIndex];
            const targetGlobalIndex = teachers.findIndex(t => t.id === targetItem.id);

            const newList = [...teachers];
            newList[globalIndex] = targetItem;
            newList[targetGlobalIndex] = item;
            handleReorder(newList);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;

    const shownTeachers = teachers.filter(t => t.showInConsultation);
    const otherTeachers = teachers.filter(t => !t.showInConsultation);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Manage Consultation"
                leftAction={
                    <button onClick={() => navigate('/admin/program-management')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => navigate('/admin/daily-zoom/teachers', { state: { returnPath: location.pathname } })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.8rem',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Settings size={16} /> Manage Teachers
                        </button>
                        <button
                            onClick={() => navigate('/programs/consultation')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.8rem',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <ExternalLink size={16} /> View Listing
                        </button>
                    </div>
                }
            />

            <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           Teacher Contacts for Consultation
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {shownTeachers.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem', backgroundColor: 'var(--color-card)', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
                                    No teachers marked for consultation. Select from the list below.
                                </p>
                            ) : (
                                shownTeachers.map((c, index) => (
                                    <motion.div
                                        key={c.id}
                                        layout
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '1rem',
                                            backgroundColor: 'var(--color-card)',
                                            borderRadius: '1rem',
                                            border: '1px solid var(--color-border)',
                                            gap: '1rem',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, color: '#f97316' }}><ChevronUp size={20} /></button>
                                            <button onClick={() => moveItem(index, 1)} disabled={index === shownTeachers.length - 1} style={{ border: 'none', background: 'none', cursor: index === shownTeachers.length - 1 ? 'default' : 'pointer', opacity: index === shownTeachers.length - 1 ? 0.3 : 1, color: '#f97316' }}><ChevronDown size={20} /></button>
                                        </div>

                                        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                                            {c.image ? (
                                                <LazyImage src={c.image} alt={c.name} width="100%" height="100%" objectFit="cover" />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={20} color="var(--color-text-muted)" />
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-text)' }}>{c.name}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Phone size={14} /> {c.phoneNumber || 'No number'}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => toggleConsultation(c)}
                                            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-error-transparent)', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                        >
                                            Remove
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {otherTeachers.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Available Teachers</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))', gap: '1rem' }}>
                                {otherTeachers.map(t => (
                                    <div 
                                        key={t.id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.75rem', 
                                            padding: '0.75rem', 
                                            backgroundColor: 'var(--color-surface)', 
                                            borderRadius: '0.75rem', 
                                            border: '1px solid var(--color-border)' 
                                        }}
                                    >
                                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0 }}>
                                            {t.image ? (
                                                <LazyImage src={t.image} alt={t.name} width="100%" height="100%" objectFit="cover" />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <User size={14} color="var(--color-text-muted)" />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)' }}>{t.name}</div>
                                        <button 
                                            onClick={() => toggleConsultation(t)}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.3rem', 
                                                padding: '0.4rem 0.6rem', 
                                                backgroundColor: 'var(--color-primary-transparent)', 
                                                color: 'var(--color-primary)', 
                                                border: 'none', 
                                                borderRadius: '0.5rem', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 600, 
                                                cursor: 'pointer' 
                                            }}
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </motion.div>
            </div>
        </div>
    );
};

export default ConsultationManagement;
