import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, ChevronLeft, Video } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const OnlineMeetings = () => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const meetingsRef = collection(db, 'online_meetings');
                const q = query(
                    meetingsRef,
                    where('date', '>=', today),
                    orderBy('date', 'asc')
                );

                const snapshot = await getDocs(q);
                setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching meetings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, []);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="Online Meetings"
                leftAction={
                    <button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                    Upcoming Online Meetings
                </h1>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading upcoming meetings...</p>
                ) : meetings.length === 0 ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                        <Video size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>No online meetings scheduled at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {meetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                                    border: '1px solid #f3f4f6'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                                            {meeting.conductedBy}
                                        </h2>
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: '#f97316', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Calendar size={16} />
                                                {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={16} />
                                                {meeting.startTime}
                                            </div>
                                        </div>
                                    </div>
                                    <Video size={24} color="#f97316" />
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => navigate(`/programs/online/${meeting.id}`)}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            backgroundColor: 'white',
                                            color: '#f97316',
                                            border: '1px solid #f97316',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Details
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OnlineMeetings;
