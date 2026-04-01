import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Share2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';

import { auth, db } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { collection, query, where, orderBy } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import LazyImage from '@/components/LazyImage';

const Programs = ({ hideHeader = false }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [programs, setPrograms] = useState([]);
    const [specificProgram, setSpecificProgram] = useState(null); // Separate state for linked program
    const [loading, setLoading] = useState(true);
    const [specificLoading, setSpecificLoading] = useState(false);
    const [viewingBanner, setViewingBanner] = useState(null);
    const [activeTab, setActiveTab] = useState('banner'); // 'banner', 'details', 'intro'
    const [lastViewingId, setLastViewingId] = useState(null);

    const getEmbedUrl = (url) => {
        if (!url) return null;
        try {
            let videoId = '';
            if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            } else if (url.includes('youtube.com/watch?v=')) {
                videoId = new URLSearchParams(new URL(url).search).get('v');
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('embed/')[1].split('?')[0];
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch (e) {
            console.error("YouTube URL parsing failed:", e);
            return null;
        }
    };


    const viewingProgramId = searchParams.get('id');
    // Prioritize specificProgram if available, otherwise look in the main list
    const viewingProgram = specificProgram || programs.find(p => p.id === viewingProgramId);

    const [authLoading, setAuthLoading] = useState(false);

    const ensureAuth = async () => {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
            return true;
        }

        setAuthLoading(true);
        try {
            await ensureGoogleAuthInitialized();

            let idToken = null;
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                return true;
            }

            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return true;
        } catch (err) {
            console.error("Auth failed:", err);
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    const { loading: authGlobalLoading, isAdmin, hasAccess } = useAdminAuth();
    const { onlineRegistrationContact } = useGlobalSettings();

    useEffect(() => {
        const fetchPrograms = async () => {
            if (authGlobalLoading) return;
            console.log("[Programs] Starting fetchPrograms...");
            try {
                // Track visit for badge reset
                localStorage.setItem('lastVisited_programs', new Date().toISOString());

                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const today = getLocalDateString();
                const programsRef = collection(db, 'programs');
                const q = query(
                    programsRef,
                    where('programDate', '>=', today),
                    orderBy('programDate', 'asc')
                );

                console.log(`[Programs] Local Date: ${today}`);
                console.log(`[Programs] Query: programDate >= ${today}`);

                // Strategy: Cache-First with Background Refresh
                const { ensureInitialized, needsServerSync, markSyncedLocally, getSyncState } = await import('../utils/SyncManager');
                await ensureInitialized();

                const syncState = getSyncState();
                const needsSync = needsServerSync('programs');
                console.log(`[Programs] Sync Status - needsSync: ${needsSync}, ServerRegistry:`, syncState.serverRegistry['programs'], "LocalRegistry:", syncState.localRegistry['programs']);

                // Try cache first
                let cacheSnap = null;
                try {
                    cacheSnap = await getDocsFromCache(q);
                    if (!cacheSnap.empty) {
                        const list = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setPrograms(list);
                        setLoading(false);
                        console.log(`[Programs] Cache SUCCESS: Found ${list.length} programs`);
                    } else {
                        console.log("[Programs] Cache EMPTY (or query returned nothing from cache)");
                    }
                } catch (_err) {
                    console.warn("[Programs] Cache read failed (expected on first load)", _err);
                }

                // If cache empty OR needs sync, fetch from server
                if (!cacheSnap || cacheSnap.empty || needsSync) {
                    console.log(`[Programs] Triggering Server Refresh (Reason: ${!cacheSnap ? 'NoCacheSnap' : cacheSnap.empty ? 'CacheEmpty' : 'Stale'})`);
                    const serverTask = getDocsFromServer(q).then(serverSnap => {
                        const list = serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        console.log(`[Programs] Server SUCCESS: Returned ${list.length} programs`);
                        setPrograms(list);
                        markSyncedLocally('programs');
                    }).catch(err => {
                        console.error("[Programs] Server refresh FAILED", err);
                    });

                    // If cache was empty, we MUST wait for server to avoid "No programs" flicker
                    if (!cacheSnap || cacheSnap.empty) {
                        console.log("[Programs] Waiting for server task to complete...");
                        await serverTask;
                    }
                }

            } catch (_err) {
                console.error("[Programs] CRITICAL FETCH ERROR: ", _err);
            } finally {
                console.log("[Programs] fetchPrograms completed, setting loading to false");
                setLoading(false);
            }
        };

        fetchPrograms();
    }, [authGlobalLoading]);

    // Specific Fetch for "View Details" (independent of main list)
    useEffect(() => {
        const fetchSpecificProgram = async () => {
            if (!viewingProgramId) {
                setSpecificProgram(null);
                setSpecificLoading(false);
                return;
            }

            setSpecificLoading(true);

            // If already in main list, we don't need to fetch
            if (programs.find(p => p.id === viewingProgramId)) {
                setSpecificLoading(false);
                return;
            }

            // If we already fetched it, don't refetch
            if (specificProgram && specificProgram.id === viewingProgramId) {
                setSpecificLoading(false);
                return;
            }

            try {
                const { doc, getDocCacheFirst } = await import('@/utils/FirestoreProxy');
                const programRef = doc(db, 'programs', viewingProgramId);
                const snap = await getDocCacheFirst(programRef);
                if (snap.exists()) {
                    setSpecificProgram({ id: snap.id, ...snap.data() });
                }
            } catch (_err) {
                console.error("Failed to fetch specific program", _err);
            } finally {
                setSpecificLoading(false);
            }
        };
        fetchSpecificProgram();
    }, [viewingProgramId, programs, specificProgram, authGlobalLoading]);

    // Reset tab when viewing a new program
    useEffect(() => {
        if (viewingProgramId && viewingProgramId !== lastViewingId) {
            setLastViewingId(viewingProgramId);
            // Default to 'banner' if it exists, else 'details'
            // We'll let the banner/intro existence logic handle the default below
        }
    }, [viewingProgramId]);

    // Determine initial active tab based on availability
    useEffect(() => {
        if (viewingProgram && viewingProgram.id !== lastViewingId) {
            const tabParam = searchParams.get('tab');
            if (tabParam && ['banner', 'details', 'intro'].includes(tabParam)) {
                setActiveTab(tabParam);
            } else if (viewingProgram.hasBanner || viewingProgram.programBanner) {
                // Clicking "Details" from listing should land on Invitation (banner) if it exists
                setActiveTab('banner');
            } else if (viewingProgram.introYoutubeUrl) {
                setActiveTab('intro');
            } else {
                setActiveTab('details');
            }
        }
    }, [viewingProgram, searchParams]);

    // Fetch Banner on Demand
    useEffect(() => {
        const fetchBanner = async () => {
            if (!viewingProgram) {
                setViewingBanner(null);
                return;
            }

            // Backward Compatibility: Check if banner is already in program object
            if (viewingProgram.programBanner) {
                setViewingBanner(viewingProgram.programBanner);
                return;
            }

            // New Logic: Fetch from separate collection
            if (viewingProgram.hasBanner) {
                try {
                    const { doc, getDocCacheFirst } = await import('@/utils/FirestoreProxy');
                    const bannerRef = doc(db, 'program_banners', viewingProgram.id);
                    const snap = await getDocCacheFirst(bannerRef);
                    if (snap.exists()) {
                        setViewingBanner(snap.data().banner);
                    }
                } catch (_err) {
                    console.error("Banner fetch failed", _err);
                }
            } else {
                setViewingBanner(null);
            }
        };
        fetchBanner();
    }, [viewingProgram, authGlobalLoading]);



    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert(`Copied ${text} to clipboard!`);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers or if clipboard API fails
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert(`Copied ${text} to clipboard!`);
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
            }
        }
    };

    const handleShareBanner = async (program) => {
        const bannerData = program.programBanner || (program.id === viewingProgram?.id ? viewingBanner : null);

        if (!bannerData) {
            alert('No banner available for this program.');
            return;
        }

        try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({ text: 'Preparing image...' });

            const fileName = `banner_${Date.now()}.jpg`;
            let fileUri = null;

            if (bannerData.startsWith('http')) {
                // Download directly to cache - Bypasses all CORS and Base64 issues
                const downloadResult = await Filesystem.downloadFile({
                    url: bannerData,
                    path: fileName,
                    directory: Directory.Cache
                });
                // Ensure it's a file:// URI for the Share plugin
                fileUri = downloadResult.path.startsWith('file://') 
                    ? downloadResult.path 
                    : `file://${downloadResult.path}`;
            } else {
                // Handle Base64 (legacy or local)
                const cleanBase64 = bannerData.split(',')[1] || bannerData;
                const writeResult = await Filesystem.writeFile({
                    path: fileName,
                    data: cleanBase64,
                    directory: Directory.Cache,
                    encoding: 'base64'
                });
                fileUri = writeResult.uri;
            }

            if (!fileUri) {
                throw new Error("Could not prepare file for sharing");
            }

            // Give filesystem a moment to sync
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await Toast.show({ text: 'Opening Share...' });

            // Share the file URI
            await Share.share({
                title: program.programName,
                text: `Check out this program: ${program.programName}\n\nDownload Sri Bagavath App for more: https://play.google.com/store/apps/details?id=com.bhavathpathai.app`,
                files: [fileUri]
            });

            // Track Share
            import('../utils/Analytics').then(m => {
                m.default.logEvent('share_program_banner', {
                    program_name: program.programName,
                    program_id: program.id
                });
            });
        } catch (_err) {
            console.error('Error sharing banner:', _err);
            // Fallback to clipboard if sharing fails
            try {
                await navigator.clipboard.writeText(bannerData);
                alert('Sharing failed: ' + (_err.message || _err) + '\n\nBanner URL copied to clipboard.');
            } catch (clipErr) {
                alert('Sharing failed completely: ' + (_err.message || _err));
            }
        }
    };

    const handleShareIntro = async (program) => {
        if (!program.introYoutubeUrl) return;
        try {
            await Share.share({
                title: `${program.programName} - Intro Video`,
                text: `Watch the intro video for ${program.programName}: ${program.introYoutubeUrl}\n\nDownload Sri Bagavath App for more: https://play.google.com/store/apps/details?id=com.bhavathpathai.app`,
                url: program.introYoutubeUrl
            });
        } catch (err) {
            console.error("Share intro failed", err);
        }
    };

    const handleShare = async (program) => {
        if (!program) return;

        const text = `
*${program.programName}*

📅 *Date:* ${(() => {
    const startDate = new Date(program.programDate);
    const startDay = startDate.getDate();
    const startMonth = startDate.toLocaleDateString(undefined, { month: 'short' });
    const startWeekday = startDate.toLocaleDateString(undefined, { weekday: 'short' });

    if (program.programEndDate) {
        const endDate = new Date(program.programEndDate);
        const endDay = endDate.getDate();
        const endMonth = endDate.toLocaleDateString(undefined, { month: 'short' });
        const endWeekday = endDate.toLocaleDateString(undefined, { weekday: 'short' });
        return `${startDay} ${startMonth} to ${endDay} ${endMonth} (${startWeekday} - ${endWeekday})`;
    }
    return `${startDay} ${startMonth} (${startWeekday})`;
})()}

🏢 *Venue:* ${program.programVenue}
${program.googleMapsUrl ? `📍 *Location:* ${program.googleMapsUrl}\n` : ''}
${program.programDescription ? `📝 *Description:*\n${program.programDescription}\n\n` : ''}${program.registrationStatus === 'Open' ? `✅ Registration Open until ${new Date(program.lastDateToRegister).toLocaleDateString()}` : '🚫 Registration Closed'}
━━━━━━━━━━━━━━━━━━━━
Download Sri Bagavath App for latest updates`.trim();

        try {
            await Share.share({
                title: program.programName,
                text: text
            });

            // Track Share
            import('../utils/Analytics').then(m => {
                m.default.logEvent('share_program_text', {
                    program_name: program.programName,
                    program_id: program.id
                });
            });
        } catch (_err) {
            console.error('Error sharing:', _err);
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(text + '\n\n' + window.location.href);
                alert('Program details copied to clipboard!');
            } catch (clipError) {
                console.error('Clipboard fallback failed', clipError);
            }
        }
    };

    // Unified Loading State
    if (viewingProgramId ? specificLoading : loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                    {viewingProgramId ? 'Loading program details...' : 'Loading upcoming programs...'}
                </p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            paddingBottom: '2rem'
        }}>
            {!hideHeader && (
                <PageHeader
                    title={viewingProgram ? viewingProgram.programName : "Programs"}
                    rightAction={
                        (isAdmin || hasAccess('PROGRAM_MANAGEMENT')) && (
                            <button
                                onClick={() => navigate('/program', { state: { returnPath: location.pathname + location.search } })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.8rem',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)',
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
            )}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>

                    {/* Tab Switcher - Outside the card, right under header */}
                    {viewingProgram && (viewingBanner || viewingProgram.introYoutubeUrl) && (
                        <div style={{
                            maxWidth: '42rem',
                            margin: '0 auto 1.5rem auto',
                            width: '100%',
                            display: 'flex',
                            borderBottom: '1px solid var(--color-border)',
                            gap: '24px',
                            padding: '0 0.5rem',
                            overflowX: 'auto'
                        }}>
                            {viewingProgram.introYoutubeUrl && (
                                <button
                                    onClick={() => setActiveTab('intro')}
                                    style={{
                                        padding: '12px 4px',
                                        border: 'none',
                                        borderBottom: activeTab === 'intro' ? `2px solid var(--color-primary)` : '2px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeTab === 'intro' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        fontWeight: activeTab === 'intro' ? 700 : 500,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Intro
                                </button>
                            )}
                            {viewingBanner && (
                                <button
                                    onClick={() => setActiveTab('banner')}
                                    style={{
                                        padding: '12px 4px',
                                        border: 'none',
                                        borderBottom: activeTab === 'banner' ? `2px solid var(--color-primary)` : '2px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeTab === 'banner' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        fontWeight: activeTab === 'banner' ? 700 : 500,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Invitation
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('details')}
                                style={{
                                    padding: '12px 4px',
                                    border: 'none',
                                    borderBottom: activeTab === 'details' ? `2px solid var(--color-primary)` : '2px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === 'details' ? 700 : 500,
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Details
                            </button>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {viewingProgram ? (
                            <>
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderRadius: '1rem',
                                        padding: '3rem 1.25rem',
                                        boxShadow: 'var(--shadow-md)',
                                        border: '1px solid var(--color-border)',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Top Right Share Icon */}
                                    <button
                                        onClick={() => handleShare(viewingProgram)}
                                        style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            right: '1rem',
                                            background: 'var(--color-card-transparent)',
                                            backdropFilter: 'blur(4px)',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer',
                                            zIndex: 20,
                                            padding: '0.5rem',
                                            borderRadius: '50%'
                                        }}
                                        title="Share Details"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                {/* Banner (Invitation) Section - Only if Banner tab active */}
                                {activeTab === 'banner' && viewingBanner && (
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                        <LazyImage
                                            src={viewingBanner}
                                            alt="Program Invitation"
                                            height="auto"
                                            borderRadius="0.5rem"
                                            style={{
                                                width: '100%',
                                                maxWidth: '100%',
                                                boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Intro Video Section */}
                                {activeTab === 'intro' && viewingProgram.introYoutubeUrl && (
                                    <div style={{ width: '100%', borderRadius: '0.5rem', overflow: 'hidden', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', backgroundColor: '#000' }}>
                                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={getEmbedUrl(viewingProgram.introYoutubeUrl)}
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                                style={{ position: 'absolute', top: 0, left: 0 }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Details Section - Show if 'details' tab is active OR if no other tabs are possible */}
                                {(activeTab === 'details' || (!viewingBanner && !viewingProgram.introYoutubeUrl)) && (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gap: '1.5rem',
                                            color: 'var(--color-text)',
                                            marginBottom: '1.5rem'
                                        }}
                                    >
                                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 }}>
                                            {viewingProgram.programName}
                                        </h1>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                                                Date & Time
                                            </span>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {(() => {
                                                    const startDate = new Date(viewingProgram.programDate);
                                                    const startDay = startDate.getDate();
                                                    const startMonth = startDate.toLocaleDateString(undefined, { month: 'short' });
                                                    const startWeekday = startDate.toLocaleDateString(undefined, { weekday: 'short' });

                                                    if (viewingProgram.programEndDate) {
                                                        const endDate = new Date(viewingProgram.programEndDate);
                                                        const endDay = endDate.getDate();
                                                        const endMonth = endDate.toLocaleDateString(undefined, { month: 'short' });
                                                        const endWeekday = endDate.toLocaleDateString(undefined, { weekday: 'short' });
                                                        return `${startDay} ${startMonth} to ${endDay} ${endMonth} (${startWeekday} - ${endWeekday})`;
                                                    }
                                                    return `${startDay} ${startMonth} (${startWeekday})`;
                                                })()}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                                                Location
                                            </span>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {viewingProgram.programCity}
                                            </div>
                                            <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div>{viewingProgram.programVenue}</div>
                                                {viewingProgram.googleMapsUrl && (
                                                    <a
                                                        href={viewingProgram.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            color: 'var(--color-primary)',
                                                            textDecoration: 'none',
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        <MapPin size={16} />
                                                        View on Google Maps
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {viewingProgram.isFree && (
                                            <div style={{ 
                                                backgroundColor: 'var(--color-success-transparent)', 
                                                color: 'var(--color-success)', 
                                                padding: '0.75rem', 
                                                borderRadius: '0.5rem', 
                                                fontWeight: 600,
                                                textAlign: 'center',
                                                border: '1px solid var(--color-success-light)'
                                            }}>
                                                FREE PROGRAM
                                            </div>
                                        )}

                                        {viewingProgram.programDescription && (
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                                                    Description
                                                </span>
                                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                    {viewingProgram.programDescription}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                                                Registration Details
                                            </span>
                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                <div>
                                                    Status:{' '}
                                                    <span style={{
                                                        color: viewingProgram.registrationStatus === 'Open' ? '#10b981' : 'var(--color-error)',
                                                        fontWeight: 500
                                                    }}>
                                                        {viewingProgram.registrationStatus}
                                                    </span>
                                                </div>
                                                <div>
                                                    Last Date: {new Date(viewingProgram.lastDateToRegister).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </motion.div>
                            </>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                            >

                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <button
                                        onClick={async () => {
                                            if (await ensureAuth()) {
                                                navigate('/my-registrations');
                                            }
                                        }}
                                        className="btn-primary"
                                        disabled={authLoading}
                                        style={{
                                            width: 'auto', // Override 100% width
                                            padding: '10px 24px',
                                            opacity: authLoading ? 0.7 : 1,
                                            backgroundColor: '#ea580c',
                                            color: 'white'
                                        }}
                                    >
                                        {authLoading ? 'Signing in...' : 'My Registrations'}
                                    </button>
                                </div>

                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: '2rem',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.95rem'
                                }}>
                                    For registration queries please contact{' '}
                                    <button
                                        onClick={() => handleCopy(onlineRegistrationContact)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            padding: '0 0.25rem',
                                            fontSize: 'inherit',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {onlineRegistrationContact}
                                    </button>
                                </div>

                                {programs.length === 0 ? (
                                    <div style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderRadius: '1rem',
                                        padding: '3rem',
                                        textAlign: 'center',
                                        boxShadow: 'var(--shadow-sm)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>
                                            No upcoming programs scheduled at the moment.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {programs.map((program, index) => (
                                            <motion.div
                                                key={program.id}
                                                data-testid="program-card"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                style={{
                                                    backgroundColor: 'var(--color-card)',
                                                    borderRadius: '1rem',
                                                    padding: '1.25rem',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    border: '1px solid var(--color-border)'
                                                }}
                                            >
                                                {/* Row 1: Program Title */}
                                                <h2 style={{
                                                    fontSize: '1.125rem',
                                                    fontWeight: 600,
                                                    color: 'var(--color-text)',
                                                    margin: '0 0 0.4rem 0',
                                                    lineHeight: '1.3',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    {program.programName}
                                                    {program.isFree && (
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            backgroundColor: 'var(--color-success)', 
                                                            color: 'white', 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            Free
                                                        </span>
                                                    )}
                                                </h2>

                                                {/* Row 2: Date Range & Location */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    flexWrap: 'wrap',
                                                    color: 'var(--color-text-muted)',
                                                    fontSize: '0.8125rem',
                                                    marginBottom: '1rem'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                                                        {new Date(program.programDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {program.programEndDate && (
                                                            <> - {new Date(program.programEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                                                        {program.programCity}
                                                    </div>
                                                </div>

                                                {/* Row 3: Action Buttons (User Requested Swap) */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '0.75rem' }}>
                                                    {program.registrationStatus === 'Open' ? (
                                                        <button
                                                            onClick={async () => {
                                                                if (await ensureAuth()) {
                                                                    navigate('/event-registration', { state: { program } });
                                                                }
                                                            }}
                                                            className="btn-primary"
                                                            data-testid="register-button"
                                                            disabled={authLoading}
                                                            style={{
                                                                width: 'auto',
                                                                padding: '0.45rem 1rem',
                                                                fontSize: '0.8125rem',
                                                                borderRadius: '20px',
                                                                opacity: authLoading ? 0.7 : 1,
                                                                backgroundColor: '#ea580c',
                                                                color: 'white'
                                                            }}
                                                        >
                                                            {authLoading ? '...' : 'Register Now'}
                                                        </button>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.25rem 0.625rem',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                            whiteSpace: 'nowrap',
                                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                            color: 'var(--color-error)',
                                                            border: '1px solid var(--color-error)'
                                                        }}>
                                                            Registration Closed
                                                        </span>
                                                    )}

                                                    {program.registrationStatus === 'Open' && (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            {program.introYoutubeUrl && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSearchParams({ id: program.id, tab: 'intro' });
                                                                    }}
                                                                    style={{
                                                                        padding: '0.4rem 0.875rem',
                                                                        backgroundColor: 'var(--color-card)',
                                                                        color: 'var(--color-text)',
                                                                        border: '1px solid var(--color-border)',
                                                                        borderRadius: '0.5rem',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.8125rem',
                                                                        fontWeight: 500
                                                                    }}
                                                                >
                                                                    Intro
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSearchParams({ id: program.id });
                                                                }}
                                                                style={{
                                                                    padding: '0.4rem 0.875rem',
                                                                    backgroundColor: 'var(--color-card)',
                                                                    color: 'var(--color-text)',
                                                                    border: '1px solid var(--color-border)',
                                                                    borderRadius: '0.5rem',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.8125rem',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                Details
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div >
    );
};

export default Programs;
