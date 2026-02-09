import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, Video, Plus, Edit2, Trash2,
    ChevronLeft, AlertCircle, Save, X, ExternalLink, RefreshCw, Info
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import {
    collection, addDoc, getDocs, deleteDoc, doc,
    updateDoc, serverTimestamp, getDoc, setDoc
} from '@/utils/FirestoreProxy';
import { getLocalDateString } from '../utils/dateUtils';
import { compressImage } from '../utils/imageUtils';
import { bumpServerVersion } from '../utils/SyncManager';

// Helper to expand a master rule into its next upcoming instance
const getNextOccurrence = (master, todayStr) => {
    if (!master.isRecurring) return master;

    let currentDate = new Date(master.date);
    const today = new Date(todayStr);
    const ruleEndDate = master.recurringEndDateType === 'date' ? new Date(master.recurringEndDate) : null;
    const exceptions = master.exceptions || [];

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (currentDate <= maxDate) {
        if (ruleEndDate && currentDate > ruleEndDate) break;

        const d = new Date(currentDate);
        const dateStr = d.toLocaleDateString('en-CA');
        let isMatch = false;

        if (master.frequency === 'daily') isMatch = true;
        else if (master.frequency === 'weekly') {
            if (master.recurringDays?.includes(currentDate.getDay().toString())) isMatch = true;
        } else if (master.frequency === 'monthly') {
            const startDay = new Date(master.date).getDate();
            if (currentDate.getDate() === startDay) isMatch = true;
        }

        if (isMatch && !exceptions.includes(dateStr) && dateStr >= todayStr) {
            return {
                ...master,
                id: `${master.id}_${dateStr}`,
                masterId: master.id,
                date: dateStr,
                isVirtual: true,
                isMasterCard: true
            };
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
        ...master,
        isMasterCard: true
    };
};

const formatRecurrenceRule = (master) => {
    if (!master.isRecurring) return null;
    const daysMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    if (master.frequency === 'daily') return 'Daily';
    if (master.frequency === 'weekly') {
        const days = master.recurringDays?.map(d => daysMap[d]).join(', ');
        return `Weekly on ${days}`;
    }
    if (master.frequency === 'monthly') return 'Monthly';
    return 'Recurring';
};

const OnlineMeetingManagement = () => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [formData, setFormData] = useState({
        conductedBy: '',
        date: '',
        startTime: '',
        endTime: '',
        joinLink: '',
        description: '',
        hasBanner: false,
        banner: null,
        isRecurring: false,
        frequency: 'weekly',
        recurringDays: [],
        recurringEndDateType: 'indefinite',
        recurringEndDate: ''
    });

    const ORANGE = '#f97316';

    useEffect(() => {
        loadMeetings();
    }, []);

    const loadMeetings = async () => {
        try {
            setLoading(true);
            const todayStr = getLocalDateString();
            const querySnapshot = await getDocs(collection(db, 'online_meetings'));
            const rawDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Deduplicate: Group by series attributes and pick the earliest one
            const groups = {};
            rawDocs.forEach(m => {
                // Ignore instances
                if (m.isRecurringInstance || m.masterId) return;

                if (m.isRecurring) {
                    const key = `${m.conductedBy}_${m.startTime}_${m.frequency}_${(m.recurringDays || []).sort().join(',')}`;
                    if (!groups[key] || new Date(m.date) < new Date(groups[key].date)) {
                        groups[key] = m;
                    }
                } else {
                    // Non-recurring are unique
                    groups[m.id] = m;
                }
            });

            const processed = Object.values(groups).map(m => getNextOccurrence(m, todayStr));
            processed.sort((a, b) => a.date.localeCompare(b.date));
            setMeetings(processed);
        } catch (error) {
            console.error("Error loading meetings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                setUploading(true);
                const compressed = await compressImage(file);
                setFormData({ ...formData, banner: compressed, hasBanner: true });
            } catch (error) {
                console.error("Compression error:", error);
                alert("Failed to process image");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const dataToSave = {
                conductedBy: formData.conductedBy,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                joinLink: formData.joinLink,
                description: formData.description,
                hasBanner: formData.hasBanner,
                isRecurring: formData.isRecurring,
                updatedAt: serverTimestamp()
            };

            if (formData.isRecurring) {
                dataToSave.frequency = formData.frequency;
                dataToSave.recurringDays = formData.recurringDays;
                dataToSave.recurringEndDateType = formData.recurringEndDateType;
                dataToSave.recurringEndDate = formData.recurringEndDate;
            }

            let masterId;
            if (editingId) {
                const actualMasterId = editingId.includes('_') ? editingId.split('_')[0] : editingId;
                await updateDoc(doc(db, 'online_meetings', actualMasterId), dataToSave);
                masterId = actualMasterId;
            } else {
                dataToSave.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, 'online_meetings'), dataToSave);
                masterId = docRef.id;
            }

            if (formData.hasBanner && formData.banner) {
                await setDoc(doc(db, 'online_meeting_banners', masterId), {
                    banner: formData.banner,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            setIsAdding(false);
            setEditingId(null);
            setFormData({
                conductedBy: '', date: '', startTime: '', endTime: '',
                joinLink: '', description: '', hasBanner: false, banner: null,
                isRecurring: false, frequency: 'weekly', recurringDays: [],
                recurringEndDateType: 'indefinite', recurringEndDate: ''
            });
            await bumpServerVersion('online_meetings');
            loadMeetings();
        } catch (error) {
            console.error("Error saving meeting:", error);
            alert("Failed to save meeting");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (meeting) => {
        const masterId = meeting.masterId || meeting.id;
        const masterDoc = await getDoc(doc(db, 'online_meetings', masterId));
        if (masterDoc.exists()) {
            const masterData = masterDoc.data();
            let bannerData = null;
            if (masterData.hasBanner) {
                const bSnap = await getDoc(doc(db, 'online_meeting_banners', masterId));
                if (bSnap.exists()) bannerData = bSnap.data().banner;
            }
            setFormData({
                ...masterData,
                banner: bannerData
            });
            setEditingId(meeting.id);
            setIsAdding(true);
        }
    };

    const confirmDelete = (meeting) => {
        setDeleteTarget(meeting);
        setShowDeleteModal(true);
    };

    const handleDelete = async (type) => {
        if (!deleteTarget) return;
        try {
            setLoading(true);
            const masterId = deleteTarget.masterId || deleteTarget.id;

            if (type === 'series') {
                await deleteDoc(doc(db, 'online_meetings', masterId));
                if (deleteTarget.hasBanner) {
                    await deleteDoc(doc(db, 'online_meeting_banners', masterId));
                }
            } else if (type === 'instance') {
                const masterDoc = await getDoc(doc(db, 'online_meetings', masterId));
                if (masterDoc.exists()) {
                    const currentExceptions = masterDoc.data().exceptions || [];
                    const instanceDate = deleteTarget.date;
                    if (!currentExceptions.includes(instanceDate)) {
                        await updateDoc(doc(db, 'online_meetings', masterId), {
                            exceptions: [...currentExceptions, instanceDate]
                        });
                    }
                }
            }

            setShowDeleteModal(false);
            setDeleteTarget(null);
            await bumpServerVersion('online_meetings');
            loadMeetings();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader title="Online Meeting Management" />

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>
                {!isAdding ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '1rem 2rem', backgroundColor: ORANGE,
                                    color: 'white', border: 'none', borderRadius: '1rem',
                                    fontWeight: 600, cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.2)',
                                    fontSize: '1rem'
                                }}
                            >
                                <Plus size={24} /> Add Meeting
                            </button>

                            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Scheduled Meetings</h2>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {meetings.map((meeting) => (
                                <motion.div
                                    key={meeting.id}
                                    layout
                                    style={{
                                        backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem',
                                        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', border: '1px solid #f3f4f6'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                                                    {meeting.conductedBy}
                                                </h3>
                                                {meeting.isRecurring && (
                                                    <span style={{
                                                        fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fff7ed',
                                                        color: ORANGE, padding: '2px 8px', borderRadius: '999px',
                                                        border: '1px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <RefreshCw size={10} /> RECURRING
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: '#4b5563', fontSize: '0.875rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Calendar size={16} color={ORANGE} />
                                                    {meeting.isRecurring ? 'Next: ' : ''}
                                                    {new Date(meeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Clock size={16} color={ORANGE} /> {meeting.startTime}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Video size={16} color={ORANGE} /> Online
                                                </div>
                                            </div>

                                            {meeting.isRecurring && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                                    <Info size={14} />
                                                    Series Rule: {formatRecurrenceRule(meeting)}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEdit(meeting)}
                                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', color: '#4b5563', cursor: 'pointer' }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(meeting)}
                                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{editingId ? 'Edit Meeting' : 'Add New Meeting'}</h2>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Standard Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Conducted By</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.conductedBy}
                                        onChange={(e) => setFormData({ ...formData, conductedBy: e.target.value })}
                                        placeholder="Teacher Name"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Start Time</label>
                                            <input
                                                required
                                                type="time"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>End Time</label>
                                            <input
                                                required
                                                type="time"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Join Link (Zoom/Google Meet)</label>
                                    <input
                                        required
                                        type="url"
                                        value={formData.joinLink}
                                        onChange={(e) => setFormData({ ...formData, joinLink: e.target.value })}
                                        placeholder="https://..."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Meeting details, topics, etc."
                                        rows={4}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none', resize: 'vertical' }}
                                    />
                                </div>

                                {/* Recurring Section */}
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: '#f9fafb' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            id="isRecurring"
                                            checked={formData.isRecurring}
                                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="isRecurring" style={{ fontWeight: 600, color: '#111827', cursor: 'pointer' }}>Make this a Recurring Event</label>
                                    </div>

                                    {formData.isRecurring && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Frequency</label>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    {['daily', 'weekly', 'monthly'].map(f => (
                                                        <button
                                                            key={f}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, frequency: f })}
                                                            style={{
                                                                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid',
                                                                borderColor: formData.frequency === f ? ORANGE : '#d1d5db',
                                                                backgroundColor: formData.frequency === f ? '#fff7ed' : 'white',
                                                                color: formData.frequency === f ? ORANGE : '#4b5563',
                                                                textTransform: 'capitalize', fontWeight: 500, cursor: 'pointer'
                                                            }}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {formData.frequency === 'weekly' && (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Select Days</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {[
                                                            { label: 'Sun', value: '0' }, { label: 'Mon', value: '1' },
                                                            { label: 'Tue', value: '2' }, { label: 'Wed', value: '3' },
                                                            { label: 'Thu', value: '4' }, { label: 'Fri', value: '5' },
                                                            { label: 'Sat', value: '6' }
                                                        ].map(d => (
                                                            <button
                                                                key={d.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = formData.recurringDays || [];
                                                                    const next = current.includes(d.value)
                                                                        ? current.filter(v => v !== d.value)
                                                                        : [...current, d.value];
                                                                    setFormData({ ...formData, recurringDays: next });
                                                                }}
                                                                style={{
                                                                    width: '2.75rem', height: '2.75rem', borderRadius: '0.5rem', border: '1px solid',
                                                                    borderColor: formData.recurringDays?.includes(d.value) ? ORANGE : '#d1d5db',
                                                                    backgroundColor: formData.recurringDays?.includes(d.value) ? '#fff7ed' : 'white',
                                                                    color: formData.recurringDays?.includes(d.value) ? ORANGE : '#4b5563',
                                                                    fontWeight: 500, cursor: 'pointer'
                                                                }}
                                                            >
                                                                {d.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>End Condition</label>
                                                    <select
                                                        value={formData.recurringEndDateType}
                                                        onChange={(e) => setFormData({ ...formData, recurringEndDateType: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                                    >
                                                        <option value="indefinite">Good till cancellation</option>
                                                        <option value="date">Fixed End Date</option>
                                                    </select>
                                                </div>
                                                {formData.recurringEndDateType === 'date' && (
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Ends On</label>
                                                        <input
                                                            type="date"
                                                            value={formData.recurringEndDate}
                                                            onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', outline: 'none' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Event Banner</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ fontSize: '0.875rem' }}
                                        />
                                        {formData.banner && (
                                            <div style={{ position: 'relative', width: '200px' }}>
                                                <img src={formData.banner} alt="Banner Preview" style={{ width: '100%', borderRadius: '0.5rem' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, banner: null, hasBanner: false })}
                                                    style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {uploading && <p style={{ fontSize: '0.875rem', color: ORANGE }}>Processing image...</p>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="submit"
                                    disabled={loading || uploading}
                                    style={{
                                        flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        padding: '1rem', backgroundColor: ORANGE, color: 'white', border: 'none',
                                        borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    <Save size={20} /> {editingId ? 'Update Meeting' : 'Create Meeting'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    style={{
                                        flex: 1, padding: '1rem', backgroundColor: 'white', color: '#374151',
                                        border: '1px solid #d1d5db', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </div>

            {/* Delete Modal */}
            <AnimatePresence>
                {showDeleteModal && (
                    <div style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1.5rem', zIndex: 1000
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '32rem', width: '100%' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444', marginBottom: '1.5rem' }}>
                                <AlertCircle size={32} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Delete Meeting</h3>
                            </div>

                            <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '2rem' }}>
                                Are you sure you want to delete this {deleteTarget?.isRecurring ? 'recurring ' : ''}meeting with <strong>{deleteTarget?.conductedBy}</strong>?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {deleteTarget?.isRecurring ? (
                                    <>
                                        <button
                                            onClick={() => handleDelete('series')}
                                            style={{ width: '100%', padding: '1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Delete Entire Series
                                        </button>
                                        <button
                                            onClick={() => handleDelete('instance')}
                                            style={{ width: '100%', padding: '1rem', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Delete Only This Instance ({deleteTarget.date})
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleDelete('series')}
                                        style={{ width: '100%', padding: '1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Confirm Delete
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{ width: '100%', padding: '1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OnlineMeetingManagement;
