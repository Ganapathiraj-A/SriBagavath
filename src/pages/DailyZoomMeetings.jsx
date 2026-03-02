import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Calendar, User, Youtube, Share2, ChevronRight, Loader2, Clock, Edit2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { db } from '@/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';

const MeetingCard = ({ meeting, teacher, delay, isAdmin, onShare }) => {
    const navigate = useNavigate();
    const date = new Date(meeting.date);

    const displayName = teacher?.name || meeting.name || 'Unknown Speaker';
    const displayImage = teacher?.image || meeting.image;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            style={{
                backgroundColor: 'var(--color-card)',
                padding: '1rem',
                borderRadius: '1.25rem',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                gap: '1rem',
                position: 'relative'
            }}
        >
            {/* Left Column: Photo & Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', width: '4.5rem', flexShrink: 0 }}>
                {/* Photo Above Date */}
                <LazyImage
                    src={displayImage}
                    alt={displayName}
                    width="4.25rem"
                    height="4.25rem"
                    borderRadius="1rem"
                    placeholder={() => <User size={24} color="var(--color-text-light)" />}
                />

                {/* Date Box */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--color-primary-transparent)',
                    color: 'var(--color-primary)',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    width: '100%',
                    border: '1px solid var(--color-primary)'
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
                    <h3 style={{
                        fontSize: '1.15rem',
                        fontWeight: 750,
                        color: 'var(--color-text)',
                        margin: 0,
                        lineHeight: 1.2,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere'
                    }}>
                        {displayName}
                    </h3>
                    <button
                        onClick={() => onShare(meeting, displayName, displayImage)}
                        aria-label={`Share ${displayName}`}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            padding: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Share2 size={18} />
                    </button>
                </div>

                {meeting.description && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-error)',
                                border: '1px solid var(--color-error)',
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
    const location = useLocation();
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
            } catch (_err) {
                snap = await getDocsFromServer(q);
            }

            setUpcomingMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (_err) {
            console.error("Error fetching upcoming meetings:", _err);
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
        } catch (_err) {
            console.error("Error fetching past meetings:", _err);
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
        } catch (_err) {
            console.error("Error loading more past meetings:", _err);
        } finally {
            setLoadingMore(false);
        }
    };

    const saveBase64ToFile = async (base64Data, fileName) => {
        try {
            const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const result = await Filesystem.writeFile({
                path: fileName,
                data: cleanBase64,
                directory: Directory.Cache
            });
            return result.uri;
        } catch (err) {
            console.error("Error saving image for share:", err);
            return null;
        }
    };

    const handleShareMeeting = async (meeting, displayName, displayImage) => {
        const date = new Date(meeting.date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const name = displayName || meeting.name || 'Unknown Speaker';

        const text = `
✨ *Daily Zoom Meeting* ✨
━━━━━━━━━━━━━━━━━━━━
👤 *Speaker:* ${name}
📅 *Date:* ${date}

🔗 *Join Link:*
${meeting.joinUrl}
${meeting.youtubeUrl ? `\n🎥 *YouTube Live:* \n${meeting.youtubeUrl}` : ''}

${meeting.description ? `\n_${meeting.description}_\n` : ''}
━━━━━━━━━━━━━━━━━━━━
Join us for our daily spiritual gathering.
        `.trim();

        try {
            let files = [];
            if (displayImage) {
                const fileName = `meeting_${meeting.id}_${Date.now()}.jpg`;
                const uri = await saveBase64ToFile(displayImage, fileName);
                if (uri) files.push(uri);
            }

            await Share.share({
                title: `${name} - Daily Zoom Meeting`,
                text: text,
                url: meeting.joinUrl,
                files: files.length > 0 ? files : undefined
            });
        } catch (_err) {
            console.error('Error sharing:', _err);
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

        const listTitle = activeTab === 'upcoming' ? '🗓️ *Upcoming Daily Zoom Meetings*' : '⏳ *Past Daily Zoom Meetings*';
        const teacherName = selectedTeacherId === 'all' ? '' : `\n(Speaker: ${teachers.find(t => t.id === selectedTeacherId)?.name})`;

        let text = `🌟 ${listTitle}${teacherName}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        let imagesToShare = new Map(); // Use Map to track unique images by speaker

        filtered.forEach(m => {
            const date = new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
            const teacher = teachers.find(t => t.id === m.teacherId);
            const name = teacher?.name || m.name || 'Unknown Speaker';
            text += `🔹 *${date}* • ${name}\n🔗 ${m.joinUrl}\n\n`;

            if (teacher?.image && !imagesToShare.has(teacher.id)) {
                imagesToShare.set(teacher.id, { id: teacher.id, image: teacher.image });
            } else if (m.image && !teacher) {
                // Fallback for legacy embedded images
                imagesToShare.set(m.id, { id: m.id, image: m.image });
            }
        });

        text += '━━━━━━━━━━━━━━━━━━━━\nJoin our daily spiritual gatherings online.';

        try {
            let files = [];
            // Only share up to 3 prominent images to avoid overwhelming the share bundle
            const uniqueImages = Array.from(imagesToShare.values()).slice(0, 3);

            for (const item of uniqueImages) {
                const fileName = `teacher_${item.id}_${Date.now()}.jpg`;
                const uri = await saveBase64ToFile(item.image, fileName);
                if (uri) files.push(uri);
            }

            await Share.share({
                title: 'Daily Zoom Meetings List',
                text: text,
                files: files.length > 0 ? files : undefined
            });
        } catch (_err) {
            console.error('Error sharing list:', _err);
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                alert('Meetings list copied to clipboard!');
            }
        }
    };

    const displayedMeetings = (activeTab === 'upcoming' ? upcomingMeetings : pastMeetings)
        .filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Daily Zoom Meeting"
                rightAction={
                    (isAdmin || hasAccess('DAILY_ZOOM_MANAGEMENT')) && (
                        <button
                            onClick={() => navigate('/admin/daily-zoom', { state: { returnPath: location.pathname } })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.8rem',
                                backgroundColor: 'var(--color-primary-transparent)',
                                color: ORANGE,
                                border: '1px solid var(--color-primary)',
                                borderRadius: '0.75rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Edit
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Teacher Filter & Share Button Group */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {teachers.length > 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', paddingLeft: '0.2rem' }}>Filter by Speaker</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--color-border)',
                                    backgroundColor: 'var(--color-card)',
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    color: 'var(--color-text)',
                                    outline: 'none',
                                    width: '100%',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
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
                    <button
                        onClick={handleShareList}
                        aria-label="Share meetings list"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--color-card)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '0.75rem',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            height: '3.15rem' // Match the select height roughly inclusive of padding/border
                        }}
                    >
                        <Share2 size={18} /> Share List
                    </button>
                </div>

                {/* Tab Switcher - Underlined Style (matching Book Store) */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border)',
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
                            color: activeTab === 'upcoming' ? ORANGE : 'var(--color-text-muted)',
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
                            color: activeTab === 'past' ? ORANGE : 'var(--color-text-muted)',
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
                        <h2 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--color-text)', margin: '0.5rem 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {activeTab === 'upcoming' ? <Calendar size={18} color={ORANGE} /> : <Clock size={18} color={ORANGE} />}
                            {activeTab === 'upcoming' ? 'Upcoming Meetings' : 'Past Meetings'}
                        </h2>
                        {displayedMeetings.length > 0 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                {displayedMeetings.length} {displayedMeetings.length === 1 ? 'meeting' : 'meetings'}
                            </span>
                        )}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto' }} />
                        <p>Loading meetings...</p>
                    </div>
                ) : displayedMeetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-card)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                        <Video size={48} color="var(--color-text-light)" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--color-text-muted)' }}>No {activeTab} meetings found for the selected criteria.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedMeetings.map((m, idx) => (
                            <MeetingCard
                                key={m.id}
                                meeting={m}
                                teacher={teachers.find(t => t.id === m.teacherId)}
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
                                    backgroundColor: 'var(--color-card)',
                                    color: ORANGE,
                                    border: `1px solid var(--color-border)`,
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
