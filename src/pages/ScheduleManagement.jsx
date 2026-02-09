import React, { useState, useEffect } from 'react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { cleanupOldSchedules } from '../utils/cleanup';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, MapPin, ChevronLeft } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, limit, setDoc, serverTimestamp } from '@/utils/FirestoreProxy';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import '../components/RegistrationStyles.css';
import { getLocalDateString } from '../utils/dateUtils';
import { bumpServerVersion } from '../utils/SyncManager';

const ScheduleManagement = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Disconnect failed:", dErr);
                    }
                } catch (e) {
                    console.warn("Google SignOut Error", e);
                }
            }
            await signOut(auth);
            navigate('/');
        }
    };
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    // Removed activeTab state as we only show upcoming

    const [formData, setFormData] = useState({
        fromDate: '',
        toDate: '',
        place: ''
    });

    // Load schedules and run cleanup on mount
    useEffect(() => {
        const init = async () => {
            // Run cleanup first to ensure we don't load old data
            await cleanupOldSchedules();
            loadSchedules();
        };
        init();
    }, []);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const schedulesRef = collection(db, 'schedules');
            // Since cleanupOldSchedules() deletes everything where toDate < today,
            // we can simply fetch all remaining schedules sorted by fromDate.
            // This will include ongoing (started in past, ends in future) and strictly future events.
            const q = query(
                schedulesRef,
                orderBy('fromDate', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const schedulesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side strict filter to ensure no history is shown
            // (in case cleanup hasn't finished or failed)
            const today = getLocalDateString();
            const filteredSchedules = schedulesList.filter(s => s.toDate >= today);

            setSchedules(filteredSchedules);
        } catch (error) {
            console.error('Error loading schedules:', error);
            alert('Error loading schedules. Please check Firebase configuration.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation: End date should be >= Start date
        if (formData.toDate < formData.fromDate) {
            alert('To Date cannot be before From Date');
            return;
        }

        // Check for overlaps
        // This allows touching (e.g. EndA === StartB) which represents traveling on the same day.
        const hasOverlap = schedules.some(schedule => {
            // Skip current schedule if editing
            if (editingSchedule && schedule.id === editingSchedule.id) return false;

            const startA = schedule.fromDate;
            const endA = schedule.toDate;
            const startB = formData.fromDate;
            const endB = formData.toDate;

            return (startA < endB) && (endA > startB);
        });

        if (hasOverlap) {
            alert('This schedule overlaps with an existing entry. Please check the dates.');
            return;
        }

        try {
            const scheduleData = {
                fromDate: formData.fromDate,
                toDate: formData.toDate,
                place: formData.place,
                createdAt: new Date().toISOString()
            };

            if (editingSchedule) {
                await updateDoc(doc(db, 'schedules', editingSchedule.id), scheduleData);
                alert('Schedule updated successfully!');
            } else {
                await addDoc(collection(db, 'schedules'), scheduleData);
                alert('Schedule added successfully!');
            }

            // Update Global Metadata for notification badges
            await setDoc(doc(db, 'system', 'metadata'), {
                lastUpdated_schedule: serverTimestamp()
            }, { merge: true });

            await bumpServerVersion('schedules');

            resetForm();
            loadSchedules();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error saving schedule: ' + error.message);
        }
    };

    const handleEdit = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            fromDate: schedule.fromDate,
            toDate: schedule.toDate,
            place: schedule.place
        });
        setShowForm(true);
    };

    const handleDelete = async (scheduleId) => {
        if (window.confirm('Are you sure you want to delete this schedule entry?')) {
            try {
                await deleteDoc(doc(db, 'schedules', scheduleId));
                alert('Schedule deleted successfully!');

                // Update Global Metadata
                await setDoc(doc(db, 'system', 'metadata'), {
                    lastUpdated_schedule: serverTimestamp()
                }, { merge: true });

                await bumpServerVersion('schedules');

                loadSchedules();
            } catch (error) {
                console.error('Error deleting schedule:', error);
                alert('Error deleting schedule: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            fromDate: '',
            toDate: '',
            place: ''
        });
        setEditingSchedule(null);
        setShowForm(false);
    };

    const ScheduleCard = ({ schedule }) => (
        <div
            onClick={() => handleEdit(schedule)}
            style={{
                padding: '1.25rem',
                border: '1px solid #f3f4f6',
                borderRadius: '1rem',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                cursor: 'pointer'
            }}
        >
            {/* Top: City */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <MapPin size={22} style={{ color: 'var(--color-primary)', marginRight: '0.75rem', flexShrink: 0 }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#000', margin: 0 }}>
                    {schedule.place}
                </h3>
            </div>

            {/* Bottom: Dates Row */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                {/* From Date Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff7ed',
                    color: 'var(--color-primary)',
                    padding: '0.75rem',
                    borderRadius: '1rem',
                    minWidth: '5.5rem',
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                        {new Date(schedule.fromDate).getDate()}
                    </span>
                    <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.8, fontWeight: 500 }}>From</span>
                </div>

                {/* To Date Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    padding: '0.75rem',
                    borderRadius: '1rem',
                    minWidth: '5.5rem',
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        {new Date(schedule.toDate).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
                        {new Date(schedule.toDate).getDate()}
                    </span>
                    <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.8, fontWeight: 500 }}>To</span>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading schedules...</p>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                // padding: '1.5rem' // Allow header full width
            }}
        >
            <PageHeader
                title="Schedule Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />
            <div style={{ padding: '1.5rem' }}>
                <div style={{ maxWidth: '56rem', margin: '0 auto' }}>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '2rem',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            marginBottom: '1.5rem'
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                marginBottom: '2rem',
                                gap: '0.75rem'
                            }}
                        >
                            {/* Title handled by PageHeader */}

                            {/* Tabs Removed */}

                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        border: 'none',
                                        width: '100%'
                                    }}
                                >
                                    <Plus size={20} />
                                    Add Schedule
                                </button>
                            )}
                        </div>

                        {showForm ? (
                            <form
                                onSubmit={handleSubmit}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                                    {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                                </h2>

                                {/* From Date */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        From Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="fromDate"
                                        value={formData.fromDate}
                                        onChange={handleInputChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>

                                {/* To Date */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        To Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="toDate"
                                        value={formData.toDate}
                                        onChange={handleInputChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>

                                {/* Place */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Place *
                                    </label>
                                    <input
                                        type="text"
                                        name="place"
                                        value={formData.place}
                                        onChange={handleInputChange}
                                        placeholder="Enter city or venue"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>

                                {/* Form Actions */}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: 'none'
                                        }}
                                    >
                                        {editingSchedule ? 'Update Schedule' : 'Add Schedule'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: '#f3f4f6',
                                            color: '#4b5563',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: '1px solid #d1d5db'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {editingSchedule && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingSchedule.id)}
                                        style={{
                                            padding: '0.75rem',
                                            marginTop: '0.5rem',
                                            backgroundColor: '#fef2f2',
                                            color: '#ef4444',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: '1px solid #fee2e2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Trash2 size={18} />
                                        Delete Schedule
                                    </button>
                                )}
                            </form>
                        ) : (
                            <div>
                                {schedules.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '3rem',
                                            color: '#6b7280'
                                        }}
                                    >
                                        <CalendarIcon
                                            size={48}
                                            style={{ margin: '0 auto 1rem', opacity: 0.5 }}
                                        />
                                        <p style={{ fontSize: '1.125rem' }}>No schedules added yet</p>
                                        <p>Click "Add Schedule" to create the first entry</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '-0.5rem', fontWeight: 500 }}>
                                            Click on the schedule to edit
                                        </p>
                                        {schedules.map(schedule => (
                                            <ScheduleCard key={schedule.id} schedule={schedule} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleManagement;
