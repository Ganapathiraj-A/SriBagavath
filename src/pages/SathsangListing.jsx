import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, ChevronLeft, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const SathsangListing = () => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    const ORANGE = '#f97316';

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const meetingsRef = collection(db, 'sathsangs');
                const q = query(
                    meetingsRef,
                    where('date', '>=', today),
                    orderBy('date', 'asc')
                );

                const snapshot = await getDocs(q);
                setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching sathsangs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, []);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="Sathsang"
                leftAction={
                    <button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                    Upcoming Sathsang
                </h1>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading upcoming Sathsangs...</p>
                ) : meetings.length === 0 ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                        <Users size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>No Sathsang scheduled at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {meetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                                    border: '1px solid #f3f4f6',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    backgroundColor: ORANGE
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                                            {meeting.conductedBy}
                                        </h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: ORANGE, fontWeight: 500 }}>
                                                <Calendar size={16} />
                                                {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4b5563' }}>
                                                <MapPin size={16} />
                                                {meeting.city}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '0.5rem', backgroundColor: '#fff7ed', borderRadius: '9999px', color: ORANGE }}>
                                        <Users size={20} />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => navigate(`/programs/sathsang/${meeting.id}`)}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            backgroundColor: 'white',
                                            color: ORANGE,
                                            border: `1px solid ${ORANGE}`,
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

export default SathsangListing;
