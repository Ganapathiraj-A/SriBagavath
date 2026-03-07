import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Plus, Edit2, Trash2, AlertCircle, Save, X, RefreshCw, Info, ExternalLink
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { db } from '@/firebase';
import {
    collection, addDoc, getDocs, deleteDoc, doc,
    updateDoc, serverTimestamp, getDoc, setDoc,
    query, orderBy
} from '@/utils/FirestoreProxy';
import { compressImage } from '@/utils/imageUtils';
import { getLocalDateString } from '@/utils/dateUtils';
import { bumpServerVersion } from '@/utils/SyncManager';
import { TransactionService } from '@/services/TransactionService';

// Helper to expand a master rule into its next upcoming instance
const getNextOccurrence = (master, todayStr) => {
    if (!master.isRecurring) return master;

    let currentDate = new Date(master.date);
    const _today = new Date(todayStr);
    const ruleEndDate = master.recurringEndDateType === 'date' ? new Date(master.recurringEndDate) : null;
    const exceptions = master.exceptions || [];

    // Max search window: 1 year
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
                id: `${master.id}_${dateStr}`, // Composite ID for the specific instance
                masterId: master.id,
                date: dateStr,
                isVirtual: true,
                isMasterCard: true // Flag to indicate this is the representative card for a series
            };
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // If no future occurrence found, just return the master with its base date (so it doesn't disappear from admin)
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

const SatsangManagement = () => {
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
        city: '',
        venue: '',
        description: '',
        hasBanner: false,
        banner: null,
        isRecurring: false,
        frequency: 'weekly',
        recurringDays: [],
        recurringEndDateType: 'indefinite',
        recurringEndDate: ''
    });

    const ORANGE = 'var(--color-primary)';

    const loadMeetings = useCallback(async () => {
        setLoading(true);

        try {
            const querySnapshot = await getDocs(
                query(collection(db, 'satsangs'), orderBy('date', 'desc'))
            );
            const loadedMeetings = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Apply expansion logic for virtual occurrences
            const today = getLocalDateString();
            const expanded = loadedMeetings.map(m => getNextOccurrence(m, today));

            // Sort by date ascending to show immediate upcoming
            expanded.sort((a, b) => a.date.localeCompare(b.date));

            setMeetings(expanded);
        } catch (_err) {
            console.error('Error loading meetings:', _err);
        } finally {
            setLoading(false);
        }
    }, [getNextOccurrence]); // Added missing dependency for completeness

    useEffect(() => {
        loadMeetings();
    }, [loadMeetings]);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                setUploading(true);
                const compressed = await compressImage(file);
                setFormData({ ...formData, banner: compressed, hasBanner: true });
            } catch (_err) {
                console.error("Compression error:", _err);
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
                city: formData.city,
                venue: formData.venue,
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
                // If editingId is a composite ID (master_date), get the masterId
                const actualMasterId = editingId.includes('_') ? editingId.split('_')[0] : editingId;
                await updateDoc(doc(db, 'satsangs', actualMasterId), dataToSave);
                masterId = actualMasterId;
            } else {
                dataToSave.createdAt = serverTimestamp();
                const docRef = await addDoc(collection(db, 'satsangs'), dataToSave);
                masterId = docRef.id;
            }

            if (formData.hasBanner && formData.banner) {
                // If it's already a URL, don't re-upload
                if (formData.banner.startsWith('http')) {
                    // Already uploaded
                } else {
                    try {
                        const filename = `satsang_${masterId}_${Date.now()}.jpg`;
                        const bannerUrl = await TransactionService.uploadBase64ToStorage(
                            masterId,
                            formData.banner,
                            'satsang_banners',
                            filename
                        );

                        if (bannerUrl) {
                            await setDoc(doc(db, 'satsang_banners', masterId), {
                                banner: bannerUrl,
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }
                    } catch (uploadErr) {
                        console.error("Cloud Storage upload failed, falling back to Firestore:", uploadErr);
                        await setDoc(doc(db, 'satsang_banners', masterId), {
                            banner: formData.banner,
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                }
            }

            setIsAdding(false);
            setEditingId(null);
            setFormData({
                conductedBy: '', date: '', startTime: '', endTime: '',
                city: '', venue: '', description: '',
                hasBanner: false, banner: null,
                isRecurring: false, frequency: 'weekly', recurringDays: [],
                recurringEndDateType: 'indefinite', recurringEndDate: ''
            });
            await bumpServerVersion('satsangs');
            loadMeetings();
        } catch (_err) {
            console.error("Error saving satsang:", _err);
            alert("Failed to save satsang");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (meeting) => {
        // If it's a virtual instance, we are actually editing the master record
        const masterId = meeting.masterId || meeting.id;
        const masterDoc = await getDoc(doc(db, 'satsangs', masterId));
        if (masterDoc.exists()) {
            const masterData = masterDoc.data();
            let bannerData = null;
            if (masterData.hasBanner) {
                const bSnap = await getDoc(doc(db, 'satsang_banners', masterId));
                if (bSnap.exists()) bannerData = bSnap.data().banner;
            }
            setFormData({
                ...masterData,
                banner: bannerData
            });
            setEditingId(meeting.id); // Keep the ID as is (master or composite) to preserve context
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
                await deleteDoc(doc(db, 'satsangs', masterId));
                if (deleteTarget.hasBanner) {
                    // Try to delete from Cloud Storage if it's a URL
                    const bannerDoc = await getDoc(doc(db, 'satsang_banners', masterId));
                    if (bannerDoc.exists()) {
                        const bannerData = bannerDoc.data().banner;
                        if (bannerData && bannerData.startsWith('http')) {
                            try {
                                await TransactionService.deleteFileFromStorage(bannerData);
                            } catch (delErr) {
                                console.warn("Failed to delete banner from storage:", delErr);
                            }
                        }
                    }
                    await deleteDoc(doc(db, 'satsang_banners', masterId));
                }
            } else if (type === 'instance') {
                // Add exception to master record
                const masterDoc = await getDoc(doc(db, 'satsangs', masterId));
                if (masterDoc.exists()) {
                    const currentExceptions = masterDoc.data().exceptions || [];
                    const instanceDate = deleteTarget.date;
                    if (!currentExceptions.includes(instanceDate)) {
                        await updateDoc(doc(db, 'satsangs', masterId), {
                            exceptions: [...currentExceptions, instanceDate]
                        });
                    }
                }
            }

            setShowDeleteModal(false);
            setDeleteTarget(null);
            await bumpServerVersion('satsangs');
            loadMeetings();
        } catch (_err) {
            console.error("Error deleting:", _err);
            alert("Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '3rem' }}>
            <PageHeader
                title="Satsang Management"
                rightAction={
                    <button
                        onClick={() => navigate('/programs/satsang')}
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
                }
            />

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>
                {!isAdding ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                            <button
                                onClick={() => setIsAdding(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '1rem 2rem', backgroundColor: 'var(--color-primary)',
                                    color: 'white', border: 'none', borderRadius: '1rem',
                                    fontWeight: 600, cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px var(--color-primary-transparent)',
                                    fontSize: '1rem'
                                }}
                            >
                                <Plus size={24} /> Add Satsang
                            </button>

                            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text)' }}>Scheduled Satsangs</h2>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {meetings.map((meeting) => (
                                <motion.div
                                    key={meeting.id}
                                    layout
                                    style={{
                                        backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem',
                                        boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                                                    {meeting.conductedBy}
                                                </h3>
                                                {meeting.isRecurring && (
                                                    <span style={{
                                                        fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'var(--color-warning-transparent)',
                                                        color: 'var(--color-warning)', padding: '2px 8px', borderRadius: '999px',
                                                        border: '1px solid var(--color-warning-transparent)', display: 'flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <RefreshCw size={10} /> RECURRING
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Calendar size={16} color="var(--color-primary)" />
                                                    {meeting.isRecurring ? 'Next: ' : ''}
                                                    {new Date(meeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Clock size={16} color="var(--color-primary)" /> {meeting.startTime}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <MapPin size={16} color="var(--color-primary)" /> {meeting.city}
                                                </div>
                                            </div>

                                            {meeting.isRecurring && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    <Info size={14} />
                                                    Series Rule: {formatRecurrenceRule(meeting)}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEdit(meeting)}
                                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', background: 'var(--color-surface)' }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(meeting)}
                                                style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-error-transparent)', color: 'var(--color-error)', cursor: 'pointer', background: 'var(--color-error-transparent)' }}
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
                        style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '2rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text)' }}>{editingId ? 'Edit Satsang' : 'Add New Satsang'}</h2>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Conducted By</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.conductedBy}
                                        onChange={(e) => setFormData({ ...formData, conductedBy: e.target.value })}
                                        placeholder="Teacher Name"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Start Time</label>
                                            <input
                                                required
                                                type="time"
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>End Time</label>
                                            <input
                                                required
                                                type="time"
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>City</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="e.g. Chennai"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Venue</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.venue}
                                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                            placeholder="Full Address"
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Satsang details, topics, etc."
                                        rows={4}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', resize: 'vertical', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                    />
                                </div>

                                {/* Recurring Section */}
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1.25rem', backgroundColor: 'var(--color-surface)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            id="isRecurring"
                                            checked={formData.isRecurring}
                                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                            style={{ width: '1.125rem', height: '1.125rem', cursor: 'pointer' }}
                                        />
                                        <label htmlFor="isRecurring" style={{ fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>Make this a Recurring Event</label>
                                    </div>

                                    {formData.isRecurring && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Frequency</label>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    {['daily', 'weekly', 'monthly'].map(f => (
                                                        <button
                                                            key={f}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, frequency: f })}
                                                            style={{
                                                                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid',
                                                                borderColor: formData.frequency === f ? 'var(--color-primary)' : 'var(--color-border)',
                                                                backgroundColor: formData.frequency === f ? 'var(--color-primary-transparent)' : 'var(--color-card)',
                                                                color: formData.frequency === f ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
                                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Select Days</label>
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
                                                                    borderColor: formData.recurringDays?.includes(d.value) ? 'var(--color-primary)' : 'var(--color-border)',
                                                                    backgroundColor: formData.recurringDays?.includes(d.value) ? 'var(--color-primary-transparent)' : 'var(--color-card)',
                                                                    color: formData.recurringDays?.includes(d.value) ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
                                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>End Condition</label>
                                                    <select
                                                        value={formData.recurringEndDateType}
                                                        onChange={(e) => setFormData({ ...formData, recurringEndDateType: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                                    >
                                                        <option value="indefinite">Good till cancellation</option>
                                                        <option value="date">Fixed End Date</option>
                                                    </select>
                                                </div>
                                                {formData.recurringEndDateType === 'date' && (
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Ends On</label>
                                                        <input
                                                            type="date"
                                                            value={formData.recurringEndDate}
                                                            onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', outline: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
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
                                                <LazyImage
                                                    src={formData.banner}
                                                    alt="Banner Preview"
                                                    width="100%"
                                                    height="120px"
                                                    borderRadius="0.5rem"
                                                    objectFit="cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, banner: null, hasBanner: false })}
                                                    style={{ position: 'absolute', top: '-0.5rem', right: '-0.5rem', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '1.5rem', height: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                                    <Save size={20} /> {editingId ? 'Update Satsang' : 'Create Satsang'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    style={{
                                        flex: 1, padding: '1rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
                                        border: '1px solid var(--color-border)', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer'
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
                            style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '2rem', maxWidth: '32rem', width: '100%', border: '1px solid var(--color-border)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--color-error)', marginBottom: '1.5rem' }}>
                                <AlertCircle size={32} />
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Delete Satsang</h3>
                            </div>

                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                                Are you sure you want to delete this {deleteTarget?.isRecurring ? 'recurring ' : ''}satsang with <strong>{deleteTarget?.conductedBy}</strong>?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {deleteTarget?.isRecurring ? (
                                    <>
                                        <button
                                            onClick={() => handleDelete('series')}
                                            style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Delete Entire Series
                                        </button>
                                        <button
                                            onClick={() => handleDelete('instance')}
                                            style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Delete Only This Instance ({deleteTarget.date})
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleDelete('series')}
                                        style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Confirm Delete
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
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

export default SatsangManagement;
