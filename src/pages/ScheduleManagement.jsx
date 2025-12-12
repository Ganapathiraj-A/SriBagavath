import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import BackButton from '../components/BackButton';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, limit } from 'firebase/firestore';

const ScheduleManagement = () => {
    const [schedules, setSchedules] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'history'

    const [formData, setFormData] = useState({
        fromDate: '',
        toDate: '',
        place: ''
    });

    // Load schedules from Firebase when tab changes
    useEffect(() => {
        loadSchedules();
    }, [activeTab]);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const schedulesRef = collection(db, 'schedules');
            const today = new Date().toISOString().split('T')[0];
            let q;

            if (activeTab === 'upcoming') {
                // Upcoming: fromDate >= today, ascending
                q = query(
                    schedulesRef,
                    where('fromDate', '>=', today),
                    orderBy('fromDate', 'asc')
                );
            } else {
                // History: fromDate < today, descending (newest past first), limit 10
                q = query(
                    schedulesRef,
                    where('fromDate', '<', today),
                    orderBy('fromDate', 'desc'),
                    limit(10)
                );
            }

            const querySnapshot = await getDocs(q);
            const schedulesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSchedules(schedulesList);
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
        // Overlap logic: (StartA < EndB) && (EndA > StartB)
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
            style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                backgroundColor: '#f9fafb'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <MapPin size={20} style={{ color: 'var(--color-primary)', marginRight: '0.5rem' }} />
                        <h3
                            style={{
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                color: '#111827',
                                margin: 0
                            }}
                        >
                            {schedule.place}
                        </h3>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '1.5rem',
                            marginTop: '0.75rem',
                            color: '#4b5563'
                        }}
                    >
                        <div>
                            <span style={{ fontWeight: 500, color: '#6b7280', display: 'block', fontSize: '0.875rem' }}>From</span>
                            <span style={{ color: '#111827' }}>
                                {new Date(schedule.fromDate).toLocaleDateString(undefined, {
                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                })}
                            </span>
                        </div>
                        <div>
                            <span style={{ fontWeight: 500, color: '#6b7280', display: 'block', fontSize: '0.875rem' }}>To</span>
                            <span style={{ color: '#111827' }}>
                                {new Date(schedule.toDate).toLocaleDateString(undefined, {
                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignSelf: 'flex-start'
                    }}
                >
                    <button
                        onClick={() => handleEdit(schedule)}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            border: 'none'
                        }}
                        title="Edit"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(schedule.id)}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            border: 'none'
                        }}
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
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
                padding: '1.5rem'
            }}
        >
            <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
                <BackButton />

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
                        <h1
                            style={{
                                fontSize: '1.875rem',
                                fontWeight: 'bold',
                                color: '#111827',
                                margin: 0,
                                width: '100%'
                            }}
                        >
                            Schedule Management
                        </h1>

                        {/* Tabs */}
                        {!showForm && (
                            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                <button
                                    onClick={() => setActiveTab('upcoming')}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: activeTab === 'upcoming' ? '2px solid var(--color-primary)' : 'none',
                                        color: activeTab === 'upcoming' ? 'var(--color-primary)' : '#6b7280',
                                        fontWeight: activeTab === 'upcoming' ? 600 : 500,
                                        background: 'none',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Upcoming
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : 'none',
                                        color: activeTab === 'history' ? 'var(--color-primary)' : '#6b7280',
                                        fontWeight: activeTab === 'history' ? 600 : 500,
                                        background: 'none',
                                        borderTop: 'none',
                                        borderLeft: 'none',
                                        borderRight: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    History
                                </button>
                            </div>
                        )}

                        {!showForm && activeTab === 'upcoming' && (
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
                                        fontWeight: 500,
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
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        border: 'none'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
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
    );
};

export default ScheduleManagement;
