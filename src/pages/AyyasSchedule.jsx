import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Share2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';

const AyyasSchedule = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const schedulesRef = collection(db, 'schedules');
                const q = query(schedulesRef, orderBy('fromDate', 'asc'));
                const querySnapshot = await getDocs(q);

                const schedulesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const today = new Date().toISOString().split('T')[0];

                // Client-side filter: include ongoing or future schedules
                const currentAndUpcoming = schedulesList.filter(s => {
                    const endDate = s.toDate || s.fromDate;
                    return endDate >= today;
                });

                // Already sorted by 'fromDate' due to query
                setSchedules(currentAndUpcoming);
            } catch (error) {
                console.error("Error fetching schedules: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedules();
    }, []);

    const handleShare = async (schedule) => {
        if (!schedule) return;

        const shareData = {
            title: `Ayya's Schedule at ${schedule.place}`,
            text: `
*Ayya's Schedule*

📍 *Place:* ${schedule.place}
📅 *From:* ${new Date(schedule.fromDate).toLocaleDateString()}
📅 *To:* ${new Date(schedule.toDate).toLocaleDateString()}
            `.trim(),
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.text);
                alert('Schedule details copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading schedules...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '9999px',
                            backgroundColor: '#fff7ed',
                            color: 'var(--color-primary)',
                            marginRight: '1rem'
                        }}>
                            <Calendar size={28} />
                        </div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
                            Ayya's Schedule
                        </h1>
                    </div>

                    {schedules.length === 0 ? (
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '3rem',
                            textAlign: 'center',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                        }}>
                            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                                No schedules available at the moment.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {schedules.map((schedule, index) => (
                                <motion.div
                                    key={schedule.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                        border: '1px solid #f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem'
                                    }}
                                >
                                    {/* Date Box */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#fff7ed',
                                        color: 'var(--color-primary)',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        minWidth: '5rem',
                                        flexShrink: 0
                                    }}>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                        <span style={{
                                            fontSize: '1.75rem',
                                            fontWeight: 'bold',
                                            lineHeight: 1
                                        }}>
                                            {new Date(schedule.fromDate).getDate()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        flex: 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <h2 style={{
                                                fontSize: '1.25rem',
                                                fontWeight: 600,
                                                color: '#111827',
                                                margin: 0
                                            }}>
                                                {schedule.place}
                                            </h2>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '0.5rem 1.5rem',
                                            color: '#4b5563',
                                            fontSize: '0.925rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 500, color: '#6b7280', marginRight: '0.375rem' }}>From:</span>
                                                {new Date(schedule.fromDate).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 500, color: '#6b7280', marginRight: '0.375rem' }}>To:</span>
                                                {new Date(schedule.toDate).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleShare(schedule)}
                                        style={{
                                            padding: '0.5rem',
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0.8
                                        }}
                                        title="Share Schedule"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default AyyasSchedule;
