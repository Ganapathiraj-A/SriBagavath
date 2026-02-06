import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Calendar, User, Youtube } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { getLocalDateString } from '../utils/dateUtils';
import { useAdminAuth } from '../context/AdminAuthContext';

const MeetingCard = ({ meeting, delay, isAdmin }) => {
    const navigate = useNavigate();
    const date = new Date(meeting.date);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '1.25rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                gap: '1rem',
                position: 'relative'
            }}
        >
            {/* Left Column: Photo & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '4.5rem', flexShrink: 0 }}>
                {/* Photo Above Date */}
                <div style={{ width: '4.25rem', height: '4.25rem', borderRadius: '1rem', overflow: 'hidden', border: '2px solid #fff7ed', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    {meeting.image ? (
                        <img src={meeting.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={24} color="#9ca3af" />
                        </div>
                    )}
                </div>

                {/* Date Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff7ed',
                    color: '#f97316',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    width: '100%',
                    border: '1px solid #ffedd5'
                }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1, marginTop: '1px' }}>
                        {date.getDate()}
                    </span>
                </div>
            </div>

            {/* Right Column: Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 750, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                        {meeting.name}
                    </h3>

                </div>

                {meeting.description && (
                    <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0 0 1rem 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {meeting.description}
                    </p>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => window.open(meeting.joinUrl, '_blank')}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 0.75rem',
                            backgroundColor: '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Video size={16} /> Zoom
                    </button>

                    {meeting.youtubeUrl && (
                        <button
                            onClick={() => window.open(meeting.youtubeUrl, '_blank')}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                padding: '0.6rem 0.75rem',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Youtube size={16} /> YouTube
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const DailyZoomMeetings = () => {
    const navigate = useNavigate();
    const { isAdmin, hasAccess, loading: authLoading } = useAdminAuth();
    const [meetings, setMeetings] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        const loadTeachers = async () => {
            try {
                const ref = collection(db, 'daily_zoom_teachers');
                const q = query(ref, orderBy('name', 'asc'));
                const snap = await getDocs(q);
                setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error loading teachers:", err);
            }
        };
        loadTeachers();
    }, [authLoading]);

    useEffect(() => {
        if (authLoading) return;
        const fetchMeetings = async () => {
            try {
                const today = getLocalDateString();
                const sevenDaysLater = new Date();
                sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                const endDate = getLocalDateString(sevenDaysLater);

                const ref = collection(db, 'daily_zoom_meetings');
                const q = query(
                    ref,
                    where('date', '>=', today),
                    orderBy('date', 'asc')
                );
                const snap = await getDocs(q);
                setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching daily zoom meetings:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, [authLoading]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Daily Zoom Meeting"
                rightAction={hasAccess('DAILY_ZOOM_MANAGEMENT') && (
                    <button
                        onClick={() => navigate('/admin/daily-zoom')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 0.8rem',
                            backgroundColor: '#fff7ed',
                            color: '#f97316',
                            border: '1px solid #ffedd5',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        Manage
                    </button>
                )}
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                    Join our daily spiritual gatherings online
                </p>

                {/* Teacher Filter - Dropdown */}
                {!loading && teachers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', paddingLeft: '0.2rem' }}>Speaker</label>
                        <select
                            value={selectedTeacherId}
                            onChange={(e) => setSelectedTeacherId(e.target.value)}
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: '#111827',
                                outline: 'none',
                                width: '100%',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 0.75rem center',
                                backgroundSize: '1.25rem'
                            }}
                        >
                            <option value="all">All Speakers</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {!loading && (
                    <h2 style={{ fontSize: '1rem', fontWeight: 750, color: '#111827', margin: '0.5rem 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={18} color="#f97316" /> Upcoming Meetings
                    </h2>
                )}

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>Loading meetings...</p>
                ) : (meetings.filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId)).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
                        <Video size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: '#6b7280' }}>No daily meetings scheduled for the selected criteria.</p>
                    </div>
                ) : (
                    meetings
                        .filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId)
                        .map((m, idx) => (
                            <MeetingCard key={m.id} meeting={m} delay={idx * 0.1} isAdmin={isAdmin} />
                        ))
                )}
            </div>
        </div>
    );
};

export default DailyZoomMeetings;
