import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Calendar, User, Youtube, Share2, ChevronRight, Loader2, Clock } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { db } from '@/firebase';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';

const MeetingCard = ({ meeting, teacher, delay, isAdmin, onShare, isSharing }) => {
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
                        {date instanceof Date && !isNaN(date) ? date.toLocaleDateString('en-US', { month: 'short' }) : '---'}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1, marginTop: '1px' }}>
                        {date instanceof Date && !isNaN(date) ? date.getDate() : '??'}
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
                        {isSharing ? <Loader2 size={18} className="animate-spin" color="var(--color-primary)" /> : <Share2 size={18} />}
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
    const [isSharingMeetingId, setIsSharingMeetingId] = useState(null);
    const [isSharingList, setIsSharingList] = useState(false);

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
            const { collection, query, where, orderBy, limit, getDocs } = await import('@/utils/FirestoreProxy');
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
            const { collection, query, where, orderBy, startAfter, limit, getDocs } = await import('@/utils/FirestoreProxy');
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

    const saveImageForShare = async (imgData, fileName) => {
        if (!imgData) return null;
        try {
            let base64;
            if (imgData.startsWith('http')) {
                const response = await fetch(imgData);
                const blob = await response.blob();
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } else {
                base64 = imgData.includes(',') ? imgData.split(',')[1] : imgData;
            }
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64,
                directory: Directory.Cache,
                encoding: 'base64'
            });
            return result.uri;
        } catch (err) {
            console.error("Error saving image for share:", err);
            return null;
        }
    };

    const shareRef = useRef(null);
    const [sharingData, setSharingData] = useState(null);

    const captureAndShare = async (dataOverride = null) => {
        if (!shareRef.current) return;
        const currentData = dataOverride || sharingData;
        if (!currentData) {
            console.error("[Share] No sharing data available");
            return;
        }

        try {
            const canvas = await html2canvas(shareRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#ffffff',
                logging: true,
                width: 800,
                onclone: (doc) => {
                    const el = doc.getElementById('share-container-wrapper');
                    if (el) {
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                    }
                }
            });

            console.log("[Share] Canvas generated:", canvas.width, "x", canvas.height);
            const finalData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
            const fileName = `share_${Date.now()}.jpg`;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: finalData,
                directory: Directory.Cache
            });

            console.log("[Share] File written to:", result.uri);

            const shareTitle = currentData.type === 'single' ? currentData.displayName : currentData.title;

            console.log("[Share] Triggering Share.share with:", {
                title: shareTitle,
                text: 'Meeting Details attached',
                files: [result.uri]
            });

            await Share.share({
                title: shareTitle,
                text: 'Meeting Details attached',
                files: [result.uri]
            });
            console.log("[Share] Share complete");
            console.log("[Share] Share complete");
        } catch (error) {
            console.error("[Share] captureAndShare error:", error);
        } finally {
            setIsSharingMeetingId(null);
            setIsSharingList(false);
        }
    };

    const fetchAsBase64 = async (url) => {
        console.log("[DEBUG] fetchAsBase64 starting for URL:", url);
        if (!url || !url.startsWith('http')) {
            console.log("[DEBUG] fetchAsBase64: invalid or non-http URL, returning as is");
            return url;
        }
        try {
            // Some environments require explicitly requesting CORS
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            console.log("[DEBUG] fetchAsBase64: got blob, size:", blob.size);
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log("[DEBUG] fetchAsBase64: conversion complete, length:", reader.result.length);
                    resolve(reader.result);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("[DEBUG] fetchAsBase64 failed:", e);
            // Return a 1x1 transparent PNG if fetch fails, to guarantee we NEVER taint the canvas
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";
        }
    };

    const handleShareMeeting = async (meeting, displayName, displayImage) => {
        console.log("[DEBUG] handleShareMeeting triggered for:", displayName, "Image URL:", displayImage);
        setIsSharingMeetingId(meeting.id);
        setSharingData({ type: 'single', meeting, displayName, displayImage: null }); // Show loader state if needed, but we do invisible render
        try {
            const base64Img = await fetchAsBase64(displayImage);
            console.log("[DEBUG] handleShareMeeting: base64 conversion result length:", base64Img?.length);

            if (base64Img && base64Img.length > 1000) { // Check if image is substantial
                console.log("[DEBUG] handleShareMeeting: sharingData setting to:", {
                    type: 'single',
                    title: meeting.title || meeting.topic,
                    displayImage: base64Img?.substring(0, 50) + "...",
                    speakerName: displayName
                });
                const shareInfo = {
                    type: 'single',
                    meeting: meeting,
                    displayName: displayName,
                    displayImage: base64Img
                };
                setSharingData(shareInfo);
                // Use a much longer timeout to guarantee the DOM is fully constructed and painted with the new Base64 string
                // 1500ms is safer for emulator/slower devices
                setTimeout(() => captureAndShare(shareInfo), 1500);
            } else {
                console.log("[DEBUG] handleShareMeeting: Image already as base64 but shorter than expected or missing.");
                // If image is not substantial, proceed without it or with a placeholder
                const shareInfo = {
                    type: 'single',
                    meeting: meeting,
                    displayName: displayName,
                    displayImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=" // Transparent 1x1 PNG
                };
                setSharingData(shareInfo);
                setTimeout(() => captureAndShare(shareInfo), 1500);
            }
        } catch (error) {
            console.error("[DEBUG] handleShareMeeting error:", error);
        } finally {
            // This finally block will be executed after captureAndShare's finally block,
            // so it might reset isSharingMeetingId prematurely if captureAndShare takes longer.
            // The state reset is now handled within captureAndShare.
            // setIsSharingMeetingId(null);
        }
    };

    const handleExperimentalTextShare = async () => {
        try {
            console.log("[DEBUG] Triggering handleExperimentalTextShare");
            await Share.share({
                title: 'Text Share Test',
                text: 'This is a test message from Sri Bagavath App ' + new Date().toLocaleTimeString(),
            });
            console.log("[DEBUG] handleExperimentalTextShare success");
        } catch (error) {
            console.error("[DEBUG] handleExperimentalTextShare error:", error);
        }
    };

    const handleShareList = async () => {
        const currentMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;
        const filtered = currentMeetings.filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId);

        if (filtered.length === 0) {
            alert('No meetings to share.');
            return;
        }

        setIsSharingList(true);

        const meetingsWithBase64Images = await Promise.all(filtered.map(async m => {
            const teacher = teachers.find(t => t.id === m.teacherId);
            const name = teacher?.name || m.name || 'Unknown Speaker';
            const img = teacher?.image || m.image;
            const b64 = await fetchAsBase64(img);
            return { ...m, _displayName: name, _displayImageB64: b64 };
        }));

        const shareInfo = {
            type: 'list',
            meetings: meetingsWithBase64Images,
            title: activeTab === 'upcoming' ? 'Upcoming Daily Zoom Meetings' : 'Past Daily Zoom Meetings'
        };

        setSharingData(shareInfo);

        // Use a longer timeout for lists since there are multiple images to paint
        setTimeout(() => captureAndShare(shareInfo), 1000);
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
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleShareList}
                        disabled={isSharingList || loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.25rem',
                            backgroundColor: ORANGE,
                            color: 'white',
                            border: 'none',
                            borderRadius: '1rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: (isSharingList || loading) ? 0.6 : 1,
                            boxShadow: 'var(--shadow-md)'
                        }}
                    >
                        {isSharingList ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                        Share meetings list
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
                                isSharing={isSharingMeetingId === m.id}
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

            {/* Hidden Shareable Template */}
            <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '800px',
                zIndex: -1000,
                opacity: 0.01,
                pointerEvents: 'none'
            }}>
                {sharingData && (
                    <div
                        id="share-container-wrapper"
                        ref={shareRef}
                        style={{
                            width: '800px',
                            backgroundColor: '#ffffff',
                            padding: '40px',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h1 style={{ color: '#f97316', margin: '0 0 10px 0', fontSize: '24px', fontWeight: 800 }}>
                                {sharingData.type === 'single' ? 'Daily Zoom Meeting' : sharingData.title}
                            </h1>
                            <div style={{ height: '3px', width: '60px', backgroundColor: '#f97316', margin: '0 auto' }}></div>
                        </div>

                        {/* Content */}
                        {sharingData.type === 'single' ? (
                            <div style={{ textAlign: 'center' }}>
                                {sharingData.displayImage !== "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=" && (
                                    <img
                                        src={sharingData.displayImage}
                                        style={{ width: '200px', height: '200px', borderRadius: '20px', objectFit: 'cover', marginBottom: '20px', border: '5px solid #fff7ed', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        crossOrigin="anonymous"
                                        alt=""
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                )}
                                <h2 style={{ fontSize: '22px', color: '#1f2937', margin: '0 0 10px 0', fontWeight: 750 }}>
                                    {sharingData.displayName}
                                </h2>
                                <p style={{ color: '#f97316', fontSize: '18px', fontWeight: 600, margin: '0 0 15px 0' }}>
                                    {new Date(sharingData.meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: 1.6, margin: '0 0 20px 0', fontStyle: 'italic' }}>
                                    {sharingData.meeting.description || ''}
                                </p>
                                <div style={{ backgroundColor: '#fff7ed', padding: '15px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#9a3412', fontWeight: 700 }}>ZOOM JOIN LINK</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#1f2937', wordBreak: 'break-all' }}>{sharingData.meeting.joinUrl}</p>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                {sharingData.meetings.map((m, idx) => {
                                    return (
                                        <div key={m.id} style={{ display: 'flex', gap: '15px', padding: '15px', backgroundColor: '#fcfcfc', borderRadius: '15px', border: '1px solid #f3f4f6' }}>
                                            {m._displayImageB64 !== "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=" && (
                                                <img
                                                    src={m._displayImageB64}
                                                    style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                                                    crossOrigin="anonymous"
                                                    alt=""
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#f97316', fontWeight: 700 }}>
                                                    {new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </p>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#111827', fontWeight: 750, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {m._displayName}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '11px', color: '#4b5563', wordBreak: 'break-all', opacity: 0.8 }}>
                                                    {m.joinUrl}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #f3f4f6' }}>
                            <p style={{ margin: 0, color: '#f97316', fontSize: '16px', fontWeight: 800 }}>
                                Download Sri Bagavath App for latest updates
                            </p>
                        </div>
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
