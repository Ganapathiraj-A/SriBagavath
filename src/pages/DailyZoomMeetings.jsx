import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Calendar, User, Youtube, Share2, ChevronRight, Loader2, Clock, Edit2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import PageHeader from '../components/PageHeader';
import LazyImage from '../components/LazyImage';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '../utils/dateUtils';
import { useAdminAuth } from '../context/AdminAuthContext';

const MeetingCard = ({ meeting, delay, isAdmin, onShare }) => {
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
                <LazyImage
                    src={meeting.image}
                    alt={meeting.name}
                    width="4.25rem"
                    height="4.25rem"
                    borderRadius="1rem"
                    placeholder={() => <User size={24} color="#9ca3af" />}
                />

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
                    <button
                        onClick={() => onShare(meeting)}
                        aria-label={`Share ${meeting.name}`}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            padding: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Share2 size={18} />
                    </button>
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

// Module-level cache for teachers to prevent redundant fetches within the same session
let teachersCache = null;

const DailyZoomMeetings = () => {
    const navigate = useNavigate();
    const { isAdmin, hasAccess, loading: authLoading } = useAdminAuth();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [pastMeetings, setPastMeetings] = useState([]);
    const [teachers, setTeachers] = useState(teachersCache || []);
    const [selectedTeacherId, setSelectedTeacherId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMorePast, setHasMorePast] = useState(true);

    const ORANGE = 'var(--color-primary)';

    useEffect(() => {
        if (authLoading) return;
        const loadTeachers = async () => {
            if (teachersCache) {
                setTeachers(teachersCache);
                return;
            }

            try {
                const { collection, query, orderBy, getDocsCacheFirst } = await import('@/utils/FirestoreProxy');
                const ref = collection(db, 'daily_zoom_teachers');
                const q = query(ref, orderBy('name', 'asc'));
                const snap = await getDocsCacheFirst(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                teachersCache = data;
                setTeachers(data);
            } catch (err) {
                console.error("Error loading teachers:", err);
            }
        };
        loadTeachers();
    }, [authLoading]);

    useEffect(() => {
        if (authLoading) return;
        fetchUpcomingMeetings();
    }, [authLoading]);

    useEffect(() => {
        if (authLoading) return;
        if (activeTab === 'past' && pastMeetings.length === 0) {
            fetchPastMeetings();
        }
    }, [authLoading, activeTab]);

    const fetchUpcomingMeetings = async () => {
        setLoading(true);
        try {
            const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
            const today = getLocalDateString();
            const ref = collection(db, 'daily_zoom_meetings');
            const q = query(
                ref,
                where('date', '>=', today),
                orderBy('date', 'asc')
            );

            let snap;
            try {
                snap = await getDocsFromCache(q);
                if (snap.empty) {
                    snap = await getDocsFromServer(q);
                } else {
                    // Silently refresh in background
                    getDocsFromServer(q).then(s => {
                        setUpcomingMeetings(s.docs.map(d => ({ id: d.id, ...d.data() })));
                    }).catch(() => { });
                }
            } catch (e) {
                snap = await getDocsFromServer(q);
            }

            setUpcomingMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching upcoming meetings:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPastMeetings = async () => {
        setLoading(true);
        try {
            const today = getLocalDateString();
            const ref = collection(db, 'daily_zoom_meetings');
            const q = query(
                ref,
                where('date', '<', today),
                orderBy('date', 'desc'),
                limit(10)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPastMeetings(docs);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasMorePast(snap.docs.length === 10);
        } catch (error) {
            console.error("Error fetching past meetings:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMorePast = async () => {
        if (!lastVisible || loadingMore) return;
        setLoadingMore(true);
        try {
            const today = getLocalDateString();
            const ref = collection(db, 'daily_zoom_meetings');
            const q = query(
                ref,
                where('date', '<', today),
                orderBy('date', 'desc'),
                startAfter(lastVisible),
                limit(10)
            );
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPastMeetings(prev => [...prev, ...docs]);
            setLastVisible(snap.docs[snap.docs.length - 1]);
            setHasMorePast(snap.docs.length === 10);
        } catch (error) {
            console.error("Error loading more past meetings:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleShareMeeting = async (meeting) => {
        const date = new Date(meeting.date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const text = `
*Daily Zoom Meeting*
*${meeting.name}*
📅 ${date}

🔗 *Zoom Link:* ${meeting.joinUrl}
${meeting.youtubeUrl ? `🎥 *YouTube:* ${meeting.youtubeUrl}` : ''}

${meeting.description ? `\n_${meeting.description}_\n` : ''}
Join us for our daily spiritual gathering.
        `.trim();

        try {
            await Share.share({
                title: `${meeting.name} - Daily Zoom Meeting`,
                text: text,
                url: meeting.joinUrl
            });
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to clipboard if share fails (e.g. on web)
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                alert('Meeting details copied to clipboard!');
            }
        }
    };

    const handleShareList = async () => {
        const currentMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;
        const filtered = currentMeetings.filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId);

        if (filtered.length === 0) {
            alert('No meetings to share.');
            return;
        }

        const listTitle = activeTab === 'upcoming' ? '*Upcoming Daily Zoom Meetings*' : '*Past Daily Zoom Meetings*';
        const teacherName = selectedTeacherId === 'all' ? '' : ` (Speaker: ${teachers.find(t => t.id === selectedTeacherId)?.name})`;

        let text = `${listTitle}${teacherName}\n\n`;

        filtered.forEach(m => {
            const date = new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            text += `• ${date}: *${m.name}*\n  🔗 ${m.joinUrl}\n\n`;
        });

        text += 'Join our daily spiritual gatherings online.';

        try {
            await Share.share({
                title: 'Daily Zoom Meetings List',
                text: text
            });
        } catch (error) {
            console.error('Error sharing list:', error);
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                alert('Meetings list copied to clipboard!');
            }
        }
    };

    const displayedMeetings = (activeTab === 'upcoming' ? upcomingMeetings : pastMeetings)
        .filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Daily Zoom Meeting"
                rightAction={
                    (isAdmin || hasAccess('DAILY_ZOOM_MANAGEMENT')) && (
                        <button
                            onClick={() => navigate('/admin/daily-zoom')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.8rem',
                                backgroundColor: '#fff7ed',
                                color: ORANGE,
                                border: '1px solid #ffedd5',
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Manage
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.95rem' }}>
                        Join our daily spiritual gatherings online
                    </p>
                    <button
                        onClick={handleShareList}
                        aria-label="Share meetings list"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: 'white',
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Share2 size={16} /> Share List
                    </button>
                </div>

                {/* Teacher Filter - Dropdown (Moved above tabs) */}
                {teachers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', paddingLeft: '0.2rem' }}>Filter by Speaker</label>
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

                {/* Tab Switcher - Underlined Style (matching Book Store) */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                    gap: '24px',
                    marginTop: '0.5rem'
                }}>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        style={{
                            padding: '12px 4px',
                            border: 'none',
                            borderBottom: activeTab === 'upcoming' ? `2px solid ${ORANGE}` : '2px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === 'upcoming' ? ORANGE : '#6b7280',
                            fontWeight: activeTab === 'upcoming' ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Calendar size={18} /> Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        style={{
                            padding: '12px 4px',
                            border: 'none',
                            borderBottom: activeTab === 'past' ? `2px solid ${ORANGE}` : '2px solid transparent',
                            backgroundColor: 'transparent',
                            color: activeTab === 'past' ? ORANGE : '#6b7280',
                            fontWeight: activeTab === 'past' ? 700 : 500,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Clock size={18} /> Past
                    </button>
                </div>

                {!loading && (
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 750, color: '#111827', margin: '0.5rem 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {activeTab === 'upcoming' ? <Calendar size={18} color={ORANGE} /> : <Clock size={18} color={ORANGE} />}
                            {activeTab === 'upcoming' ? 'Upcoming Meetings' : 'Past Meetings'}
                        </h2>
                        {displayedMeetings.length > 0 && (
                            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                                {displayedMeetings.length} {displayedMeetings.length === 1 ? 'meeting' : 'meetings'}
                            </span>
                        )}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto' }} />
                        <p>Loading meetings...</p>
                    </div>
                ) : displayedMeetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
                        <Video size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: '#6b7280' }}>No {activeTab} meetings found for the selected criteria.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedMeetings.map((m, idx) => (
                            <MeetingCard
                                key={m.id}
                                meeting={m}
                                delay={idx * 0.05}
                                isAdmin={isAdmin}
                                onShare={handleShareMeeting}
                            />
                        ))}

                        {activeTab === 'past' && hasMorePast && (
                            <button
                                onClick={loadMorePast}
                                disabled={loadingMore}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: 'white',
                                    color: ORANGE,
                                    border: `1px solid #fed7aa`,
                                    borderRadius: '0.75rem',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: loadingMore ? 'default' : 'pointer',
                                    marginTop: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="spin" size={18} /> Loading...
                                    </>
                                ) : (
                                    <>
                                        Load More <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
            {/* Tailwind-like utility for spinning if not present */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default DailyZoomMeetings;
