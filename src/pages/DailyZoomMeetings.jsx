import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Calendar, User, Youtube, Share2, ChevronRight, Loader2, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { needsServerSync, markSyncedLocally } from '@/utils/SyncManager';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { shareCanvasImage, shareItem } from '@/utils/shareUtils';
import { Capacitor } from '@capacitor/core';

const MeetingCard = ({ meeting, teacher, delay, onShare, isSharing, language }) => {
    const date = new Date(meeting.date);

    const displayName = language === 'ta' 
        ? (teacher?.nameTamil || teacher?.name || meeting.nameTamil || meeting.name || 'அறியப்படாத பேச்சாளர்')
        : (teacher?.name || meeting.name || 'Unknown Speaker');
    const displayImage = teacher?.imageUrl || teacher?.image || meeting.imageUrl || meeting.image;

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
                    version={teacher?.updatedAt?.seconds || meeting?.updatedAt?.seconds || ''}
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
                    border: 'none'
                }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {date instanceof Date && !isNaN(date) ? date.toLocaleDateString('en-US', { month: 'short' }) : '---'}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1, marginTop: '1px' }}>
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--color-card-transparent)',
                            backdropFilter: 'blur(4px)',
                            color: 'var(--color-primary)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                    </button>
                </div>

                {meeting.description && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0 0 1rem 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {language === 'ta' ? (meeting.descriptionTamil || meeting.description) : meeting.description}
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
                            backgroundColor: 'white',
                            color: 'var(--color-primary)',
                            border: '1.5px solid var(--color-primary)',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-transparent)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
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

const YouTubeVideoCard = ({ video, delay }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            onClick={() => window.open(video.youtubeUrl, '_blank')}
            style={{
                backgroundColor: 'var(--color-card)',
                borderRadius: '1.25rem',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                aspectRatio: '16/9'
            }}
        >
            <LazyImage
                src={video.thumbnail}
                alt={video.title}
                width="100%"
                height="100%"
                objectFit="cover"
                placeholder={() => (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--color-surface)' }}>
                        <Youtube size={32} color="var(--color-text-light)" />
                    </div>
                )}
            />
        </motion.div>
    );
};

// Module-level cache for teachers to prevent redundant fetches within the same session
let teachersCache = null;

const DailyZoomMeetings = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin, hasAccess, loading: authLoading } = useAdminAuth();
    const { hiddenScreens, devMode, t, language } = useGlobalSettings();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

    const [activeTab, setActiveTab] = useState('upcoming');
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);
    const [teachers, setTeachers] = useState(teachersCache || []);
    const [selectedTeacherId, setSelectedTeacherId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isSharingMeetingId, setIsSharingMeetingId] = useState(null);
    const [isSharingList, setIsSharingList] = useState(false);

    const ORANGE = 'var(--color-primary)';

    useEffect(() => {
        if (authLoading) return;
        const loadTeachers = async () => {
            if (teachersCache) {
                setTeachers(teachersCache);
                // Background refresh to pick up new teachers
                (async () => {
                    try {
                        const { collection, query, orderBy, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                        const ref = collection(db, 'teachers');
                        const q = query(ref, orderBy('name', 'asc'));
                        const snap = await getDocsFromServer(q);
                        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        teachersCache = data;
                        setTeachers(data);
                    } catch (err) {
                        console.error("Background teacher refresh failed:", err);
                    }
                })();
                return;
            }

            try {
                const { collection, query, orderBy, getDocsCacheFirst } = await import('@/utils/FirestoreProxy');
                const ref = collection(db, 'teachers');
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
        
        // 1. Mark as visited to clear notifications
        localStorage.setItem('lastVisited_daily_zoom', new Date().toISOString());

        // 2. Setup Real-time Listener for Upcoming Meetings
        const today = getLocalDateString();
        const ref = collection(db, 'daily_zoom_meetings');
        const q = query(
            ref,
            where('date', '>=', today),
            orderBy('date', 'asc')
        );

        needsServerSync('daily_zoom_meetings');
        setLoading(true);

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUpcomingMeetings(data);
            setLoading(false);
            
            // Mark as synced if this was a fresh server update or we were explicitly checking
            if (!snapshot.metadata.fromCache) {
                markSyncedLocally('daily_zoom_meetings');
            }
        }, (error) => {
            console.error("Error with Daily Zoom listener:", error);
            setLoading(false);
        });

        return () => unsub();
    }, [authLoading]);

    // fetchUpcomingMeetings is no longer needed as we use a real-time listener above.

    useEffect(() => {
        if (authLoading) return;
        if (activeTab === 'past' && youtubeVideos.length === 0) {
            fetchYouTubePlaylist();
        }
    }, [authLoading, activeTab, youtubeVideos.length]);

    const fetchYouTubePlaylist = async (pageToken = null) => {
        if (!pageToken) setIsYoutubeLoading(true);
        else setLoadingMore(true);

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
            const playlistId = 'PL5FJK16aj_FK4ZbqeOkaFw2pCivvE6BU0';
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${playlistId}&key=${apiKey}`;
            
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.items) {
                const formattedVideos = data.items.map(item => ({
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    date: item.snippet.publishedAt,
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    youtubeUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                    joinUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`, // Fallback for Zoom button
                    type: 'youtube'
                }));

                if (pageToken) {
                    setYoutubeVideos(prev => [...prev, ...formattedVideos]);
                } else {
                    setYoutubeVideos(formattedVideos);
                }
                setNextPageToken(data.nextPageToken || null);
            }
        } catch (error) {
            console.error("Error fetching YouTube playlist:", error);
        } finally {
            setIsYoutubeLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMorePast = async () => {
        if (nextPageToken) {
            await fetchYouTubePlaylist(nextPageToken);
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
            const shareTitle = currentData.type === 'single' ? currentData.displayName : currentData.title;

            console.log("[Share] Triggering Share.share with:", {
                title: shareTitle,
                text: currentData.caption || 'Meeting Details attached'
            });

            await shareCanvasImage(canvas, {
                title: shareTitle,
                text: currentData.caption || 'Meeting Details attached',
                fileNameBase: shareTitle || 'daily-zoom-share',
                mimeType: 'image/jpeg',
                quality: 0.95
            });
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
        console.log("[DEBUG] handleShareMeeting triggered for:", displayName);
        
        // PWA/Web: Share only as text to avoid image processing overhead for daily meetings
        if (!Capacitor.isNativePlatform()) {
            await shareItem({
                title: 'Daily Zoom Meeting',
                text: `🎦 *Daily Zoom Meeting*\n\n👤 *Speaker:* ${displayName}\n📅 *Date:* ${new Date(meeting.date).toLocaleDateString()}\n\n*Join Link:*`,
                url: meeting.joinUrl
            });
            return;
        }

        setIsSharingMeetingId(meeting.id);
        setSharingData({ type: 'single', meeting, displayName, displayImage: null }); 
        try {
            const base64Img = await fetchAsBase64(displayImage);
            console.log("[DEBUG] handleShareMeeting: base64 conversion result length:", base64Img?.length);

            if (base64Img && base64Img.length > 1000) { // Check if image is substantial
                console.log("[DEBUG] handleShareMeeting: sharingData setting to:", {
                    type: 'single',
                    title: meeting.title || meeting.topic,
                    displayImage: base64Img?.substring(0, 50) + "...",
                    speakerName: displayName,
                    caption: `Zoom Meeting: ${displayName}\nDate: ${new Date(meeting.date).toLocaleDateString()}\n\nJoin link: ${meeting.joinUrl}`
                });
                const shareInfo = {
                    type: 'single',
                    meeting: meeting,
                    displayName: displayName,
                    displayImage: base64Img,
                    caption: `🎦 *Daily Zoom Meeting*\n\n👤 *Speaker:* ${displayName}`
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
                    displayImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=", // Transparent 1x1 PNG
                    caption: `🎦 *Daily Zoom Meeting*\n\n👤 *Speaker:* ${displayName}`
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

    const handleShareList = async () => {
        const currentMeetings = activeTab === 'upcoming' ? upcomingMeetings : youtubeVideos;
        const filtered = currentMeetings.filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId);

        if (filtered.length === 0) {
            alert('No meetings to share.');
            return;
        }

        // PWA/Web: Share list as text
        if (!Capacitor.isNativePlatform()) {
            let listText = `🎦 *Daily Zoom Meetings (${activeTab === 'upcoming' ? 'Upcoming' : 'Past'})*\n\n`;
            filtered.forEach((m, i) => {
                const teacher = teachers.find(t => t.id === m.teacherId);
                const name = teacher?.name || m.name || 'Unknown Speaker';
                listText += `${i + 1}. *${name}* - ${new Date(m.date).toLocaleDateString()}\n   Link: ${m.joinUrl}\n\n`;
            });

            await shareItem({
                title: 'Daily Zoom Meetings',
                text: listText.trim()
            });
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
            title: activeTab === 'upcoming' ? 'Upcoming Daily Zoom Meetings' : 'Past Daily Zoom Meetings',
            caption: `🎦 *Daily Zoom Meetings (${activeTab === 'upcoming' ? 'Upcoming' : 'Past'})*`
        };

        setSharingData(shareInfo);

        // Use a longer timeout for lists since there are multiple images to paint
        setTimeout(() => captureAndShare(shareInfo), 1000);
    };

    const displayedMeetings = activeTab === 'upcoming' 
        ? upcomingMeetings.filter(m => selectedTeacherId === 'all' || m.teacherId === selectedTeacherId)
        : youtubeVideos;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title={t('DAILY_ZOOM_MEETING')}
                rightAction={
                    (isAdmin || hasAccess('DAILY_ZOOM_MANAGEMENT')) && !currentHiddenScreens.includes('/admin/daily-zoom') && (
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
                            {language === 'ta' ? 'திருத்து' : 'Edit'}
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Teacher Filter & Share Button Group */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {teachers.length > 0 && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', paddingLeft: '0.2rem' }}>
                                {language === 'ta' ? 'பேச்சாளர் மூலம் வடிகட்டவும்' : 'Filter by Speaker'}
                            </label>
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
                                <option value="all">{language === 'ta' ? 'அனைத்து பேச்சாளர்கள்' : 'All Speakers'}</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {language === 'ta' ? (t.nameTamil || t.name) : t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={handleShareList}
                        disabled={isSharingList || loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'var(--color-card-transparent)',
                            backdropFilter: 'blur(4px)',
                            color: 'var(--color-primary)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            opacity: (isSharingList || loading) ? 0.6 : 1,
                            flexShrink: 0,
                            transition: 'all 0.2s'
                        }}
                        title="Share meetings list"
                    >
                        {isSharingList ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={20} />}
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
                        <Calendar size={18} /> {language === 'ta' ? 'வரவிருப்பவை' : 'Upcoming'}
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
                        <Clock size={18} /> {language === 'ta' ? 'கடந்த கால' : 'Past'}
                    </button>
                </div>

                {!loading && !isYoutubeLoading && (
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--color-text)', margin: '0.5rem 0 0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {activeTab === 'upcoming' ? <Calendar size={18} color={ORANGE} /> : <Youtube size={18} color="#ef4444" />}
                            {activeTab === 'upcoming' ? (language === 'ta' ? 'வரவிருக்கும் கூட்டங்கள்' : 'Upcoming Meetings') : (language === 'ta' ? 'கடந்த கால பதிவுகள் (YouTube)' : 'Past Recordings (YouTube)')}
                        </h2>
                        {displayedMeetings.length > 0 && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                {displayedMeetings.length} {displayedMeetings.length === 1 ? 'item' : 'items'}
                            </span>
                        )}
                    </div>
                )}

                {(loading || isYoutubeLoading) ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 1rem auto' }} />
                        <p>{language === 'ta' ? 'கூட்டங்கள் ஏற்றப்படுகின்றன...' : 'Loading meetings...'}</p>
                    </div>
                ) : displayedMeetings.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--color-card)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                        <Video size={48} color="var(--color-text-light)" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            {language === 'ta' 
                                ? 'தேர்வு செய்தCriteria-க்கு கூட்டங்கள் எதுவும் கிடைக்கவில்லை.' 
                                : `No ${activeTab} meetings found for the selected criteria.`
                            }
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedMeetings.map((m, idx) => {
                            if (m.type === 'youtube') {
                                return (
                                    <YouTubeVideoCard
                                        key={m.id}
                                        video={m}
                                        delay={idx * 0.05}
                                    />
                                );
                            }
                            return (
                                <MeetingCard
                                    key={m.id}
                                    meeting={m}
                                    teacher={teachers.find(t => t.id === m.teacherId)}
                                    delay={idx * 0.05}
                                    onShare={handleShareMeeting}
                                    isSharing={isSharingMeetingId === m.id}
                                    language={language}
                                />
                            );
                        })}

                        {activeTab === 'past' && nextPageToken && (
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
                                        <Loader2 className="spin" size={18} /> {language === 'ta' ? 'ஏற்றப்படுகிறது...' : 'Loading...'}
                                    </>
                                ) : (
                                    <>
                                        {language === 'ta' ? 'மேலும் ஏற்றவும்' : 'Load More'} <ChevronRight size={18} />
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
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        <div style={{ padding: '40px' }}>
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
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                    {sharingData.meetings.map((m) => {
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
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Orange Footer with Zoom Link */}
                        <div style={{
                            backgroundColor: '#f97316',
                            padding: '30px',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <div style={{ marginBottom: '15px' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Zoom Join Link
                                </p>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, wordBreak: 'break-all' }}>
                                    {sharingData.type === 'single' ? sharingData.meeting.joinUrl : sharingData.meetings[0]?.joinUrl}
                                </p>
                            </div>
                            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '20px 0' }}></div>
                            <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                                Download Sri Bagavath App for latest updates
                            </p>
                            <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                                For latest spiritual updates and publications
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
