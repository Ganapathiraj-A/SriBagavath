import { useState, useEffect } from 'react';
import { cleanupOldSchedules } from '@/utils/cleanup';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar as CalendarIcon, MapPin, Eye, X, Search } from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, setDoc, serverTimestamp } from '@/utils/FirestoreProxy';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import '../components/RegistrationStyles.css';
import { getLocalDateString } from '@/utils/dateUtils';
import { bumpServerVersion } from '@/utils/SyncManager';
import { TranslationUtils } from '@/utils/TranslationUtils';

const ScheduleManagement = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        fromDate: '',
        toDate: '',
        place: '',
        placeTamil: ''
    });

    useEffect(() => {
        const init = async () => {
            await cleanupOldSchedules();
            loadSchedules();
        };
        init();
    }, []);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const schedulesRef = collection(db, 'schedules');
            const q = query(schedulesRef, orderBy('fromDate', 'asc'));
            const querySnapshot = await getDocs(q);
            const schedulesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const today = getLocalDateString();
            const filteredSchedules = schedulesList.filter(s => s.toDate >= today);
            setSchedules(filteredSchedules);
        } catch (_err) {
            console.error('Error loading schedules:', _err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (name === 'place' && value) {
            // Attempt auto-fill only if placeTamil is empty
            TranslationUtils.getLearnedCity(value).then(tamil => {
                if (tamil) {
                    setFormData(prev => {
                        // Only auto-fill if the Tamil field is currently empty
                        if (!prev.placeTamil) {
                            return { ...prev, placeTamil: tamil };
                        }
                        return prev;
                    });
                }
            });
        }
    };

    const handlePlaceBlur = async () => {
        if (formData.place && !formData.placeTamil) {
        const tamil = await TranslationUtils.getLearnedCity(formData.place);
        if (tamil) {
            setFormData(prev => {
                if (!prev.placeTamil) {
                    return { ...prev, placeTamil: tamil };
                }
                return prev;
            });
        }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.toDate < formData.fromDate) {
            alert('To Date cannot be before From Date');
            return;
        }

        try {
            const scheduleData = {
                fromDate: formData.fromDate,
                toDate: formData.toDate,
                place: formData.place,
                placeTamil: formData.placeTamil || '',
                updatedAt: serverTimestamp()
            };

            // Save learned city
            if (formData.place && formData.placeTamil) {
                await TranslationUtils.saveLearnedCity(formData.place, formData.placeTamil);
            }

            if (editingSchedule) {
                await updateDoc(doc(db, 'schedules', editingSchedule.id), scheduleData);
                alert('Schedule updated!');
            } else {
                await addDoc(collection(db, 'schedules'), {
                    ...scheduleData,
                    createdAt: serverTimestamp()
                });
                alert('Schedule added!');
            }

            await setDoc(doc(db, 'system', 'metadata'), {
                lastUpdated_schedule: serverTimestamp()
            }, { merge: true });

            await bumpServerVersion('schedules');
            resetForm();
            loadSchedules();
        } catch (_err) {
            alert('Error saving: ' + _err.message);
        }
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            fromDate: schedule.fromDate,
            toDate: schedule.toDate,
            place: schedule.place,
            placeTamil: schedule.placeTamil || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (scheduleId) => {
        if (window.confirm('Delete this schedule?')) {
            try {
                await deleteDoc(doc(db, 'schedules', scheduleId));
                await bumpServerVersion('schedules');
                loadSchedules();
                resetForm();
            } catch (_err) {
                alert('Delete failed: ' + _err.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({ fromDate: '', toDate: '', place: '', placeTamil: '' });
        setEditingSchedule(null);
        setShowForm(false);
    };

    const filteredSchedules = schedules.filter(s =>
        s.place.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading schedules...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '2rem' }}>
            <PageHeader
                title="Schedule Management"
                rightAction={
                    <button
                        onClick={() => navigate('/schedule')}
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

            <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 0.85rem',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <Search size={18} color="var(--color-text-muted)" />
                        <input
                            type="text"
                            placeholder="Search city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.65rem 0',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.9rem',
                                backgroundColor: 'transparent',
                                color: 'var(--color-text)'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0 1rem',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredSchedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            onClick={() => handleEdit(schedule)}
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                padding: '1.25rem',
                                borderRadius: '16px',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <MapPin size={20} color="var(--color-primary)" style={{ marginRight: '0.75rem' }} />
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                                    {schedule.place}
                                </h3>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ 
                                    padding: '0.4rem 0.8rem', 
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-background)',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text)'
                                }}>
                                    {new Date(schedule.fromDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                </div>
                                <div style={{ 
                                    padding: '0.4rem 0.8rem', 
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-background)',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text)'
                                }}>
                                    {new Date(schedule.toDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredSchedules.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <CalendarIcon size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>No schedules found</p>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <div className="modal-overlay" onClick={resetForm} style={{ zIndex: 1000 }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                width: '90%',
                                maxWidth: '400px',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                    {editingSchedule ? 'Edit Entry' : 'New Entry'}
                                </h2>
                                <button onClick={resetForm} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                    <X size={24} color="var(--color-text-muted)" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Place/City (English)</label>
                                        <input
                                            type="text"
                                            name="place"
                                            required
                                            value={formData.place}
                                            onChange={handleInputChange}
                                            onBlur={handlePlaceBlur}
                                            placeholder="Enter place..."
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Place/City (Tamil)</label>
                                        <input
                                            type="text"
                                            name="placeTamil"
                                            required
                                            value={formData.placeTamil}
                                            onChange={handleInputChange}
                                            placeholder="திருப்பூர்"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>From Date</label>
                                        <input
                                            type="date"
                                            name="fromDate"
                                            required
                                            value={formData.fromDate}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>To Date</label>
                                        <input
                                            type="date"
                                            name="toDate"
                                            required
                                            value={formData.toDate}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    {editingSchedule && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(editingSchedule.id)}
                                            style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {editingSchedule ? 'Update' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScheduleManagement;
