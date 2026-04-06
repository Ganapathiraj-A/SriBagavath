import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Share2, Loader2, Download, ChevronLeft } from 'lucide-react';

import { auth, db } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, orderBy } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getLocalDateString } from '@/utils/dateUtils';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import LazyImage from '@/components/LazyImage';

const WebPrograms = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [programs, setPrograms] = useState([]);
    const [specificProgram, setSpecificProgram] = useState(null);
    const [loading, setLoading] = useState(true);
    const [specificLoading, setSpecificLoading] = useState(false);
    const [viewingBanner, setViewingBanner] = useState(null);
    const [activeTab, setActiveTab] = useState('banner');
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
    const viewingProgram = specificProgram || programs.find(p => p.id === viewingProgramId);

    const [authLoading, setAuthLoading] = useState(false);

    const ensureAuth = async () => {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
            return true;
        }

        setAuthLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
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
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const today = getLocalDateString();
                const programsRef = collection(db, 'programs');
                const q = query(
                    programsRef,
                    where('programDate', '>=', today),
                    orderBy('programDate', 'asc')
                );

                // Strategy: Cache-First with Background Refresh
                const { ensureInitialized, needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');
                await ensureInitialized();

                const needsSync = needsServerSync('programs');

                // Try cache first
                let cacheSnap = null;
                try {
                    cacheSnap = await getDocsFromCache(q);
                    if (!cacheSnap.empty) {
                        const list = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setPrograms(list);
                        setLoading(false);
                    }
                } catch (_err) {
                    console.warn("[WebPrograms] Cache read failed", _err);
                }

                // If cache empty OR needs sync, fetch from server
                if (!cacheSnap || cacheSnap.empty || needsSync) {
                    const serverTask = getDocsFromServer(q).then(serverSnap => {
                        const list = serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setPrograms(list);
                        markSyncedLocally('programs');
                    }).catch(err => {
                        console.error("[WebPrograms] Server refresh FAILED", err);
                    });

                    if (!cacheSnap || cacheSnap.empty) {
                        await serverTask;
                    }
                }

            } catch (_err) {
                console.error("[WebPrograms] CRITICAL FETCH ERROR: ", _err);
            } finally {
                setLoading(false);
            }
        };

        fetchPrograms();
    }, [authGlobalLoading]);

    useEffect(() => {
        const fetchSpecificProgram = async () => {
            if (!viewingProgramId) {
                setSpecificProgram(null);
                setSpecificLoading(false);
                return;
            }

            setSpecificLoading(true);
            if (programs.find(p => p.id === viewingProgramId)) {
                setSpecificLoading(false);
                return;
            }

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

    useEffect(() => {
        if (!viewingProgramId) {
            setLastViewingId(null);
        } else if (viewingProgramId !== lastViewingId) {
            setLastViewingId(viewingProgramId);
        }
    }, [viewingProgramId, lastViewingId]);

    useEffect(() => {
        if (viewingProgram && viewingProgram.id !== lastViewingId) {
            const tabParam = searchParams.get('tab');
            if (tabParam && ['banner', 'details', 'intro'].includes(tabParam)) {
                setActiveTab(tabParam);
            } else if (viewingProgram.hasBanner || viewingProgram.programBanner) {
                setActiveTab('banner');
            } else if (viewingProgram.introYoutubeUrl) {
                setActiveTab('intro');
            } else {
                setActiveTab('details');
            }
        }
    }, [viewingProgram, searchParams, lastViewingId]);

    useEffect(() => {
        const fetchBanner = async () => {
            if (!viewingProgram) {
                setViewingBanner(null);
                return;
            }
            if (viewingProgram.programBanner) {
                setViewingBanner(viewingProgram.programBanner);
                return;
            }
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
            alert(`Copied to clipboard!`);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleDownloadBanner = async (program) => {
        const bannerData = program?.programBanner || (program?.id === viewingProgram?.id ? viewingBanner : null);
        if (!bannerData) return;
        try {
            const response = await fetch(bannerData);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${program.programName}-invitation.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Banner download failed:", error);
            window.open(bannerData, '_blank');
        }
    };

    const handleShare = async (program, type = 'text') => {
        if (!program) return;
        
        let shareData = {};
        if (type === 'intro' && program.introYoutubeUrl) {
            shareData = {
                title: `${program.programName} - Intro`,
                text: `Watch the intro video for ${program.programName}:`,
                url: program.introYoutubeUrl
            };
        } else if (type === 'banner' && viewingBanner) {
            shareData = {
                title: program.programName,
                text: `Invitation for ${program.programName}`,
                url: window.location.href // Fallback to current URL on web
            };
        } else {
            const text = `*${program.programName}*\n📅 Date: ${new Date(program.programDate).toLocaleDateString()}\n🏢 Venue: ${program.programVenue}\nCheck it out here: ${window.location.href}`;
            shareData = { title: program.programName, text: text };
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await handleCopy(shareData.text || shareData.url);
            }
        } catch (err) {
            console.error("Share failed", err);
        }
    };

    if (viewingProgramId ? specificLoading : loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ color: 'var(--color-primary)' }}>
                    <Loader2 size={40} />
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>

                    {/* Back Button for Web View */}
                    {viewingProgramId && (
                        <button
                            onClick={() => navigate('/web/events')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '1.5rem',
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                fontWeight: 700,
                                padding: '0.5rem 0',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                        >
                            <ChevronLeft size={20} />
                            Back to All Events
                        </button>
                    )}

                    {!viewingProgram ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <button
                                    onClick={async () => { if (await ensureAuth()) navigate('/web/account?tab=registrations'); }}
                                    style={{
                                        padding: '10px 24px',
                                        backgroundColor: '#000000',
                                        color: '#ffffff',
                                        borderRadius: '2rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    My Registrations
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {programs.map((program, index) => (
                                    <motion.div
                                        key={program.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--color-border)' }}
                                    >
                                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.4rem 0' }}>{program.programName}</h2>
                                        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                                                {new Date(program.programDate).toLocaleDateString()}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
                                                {program.programCity}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                onClick={() => navigate('/web/event-registration', { state: { program } })}
                                                style={{ padding: '0.45rem 1.25rem', borderRadius: '20px', backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                                            >
                                                Register Now
                                            </button>
                                            <button onClick={() => setSearchParams({ id: program.id, tab: 'details' })} style={{ padding: '0.4rem 0.875rem', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', cursor: 'pointer' }}>Details</button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '24px', marginBottom: '1.5rem', overflowX: 'auto' }}>
                                {viewingProgram.introYoutubeUrl && (
                                    <button onClick={() => setActiveTab('intro')} style={{ padding: '12px 4px', border: 'none', borderBottom: activeTab === 'intro' ? `2px solid var(--color-primary)` : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === 'intro' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: activeTab === 'intro' ? 700 : 500, cursor: 'pointer' }}>Intro</button>
                                )}
                                {viewingBanner && (
                                    <button onClick={() => setActiveTab('banner')} style={{ padding: '12px 4px', border: 'none', borderBottom: activeTab === 'banner' ? `2px solid var(--color-primary)` : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === 'banner' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: activeTab === 'banner' ? 700 : 500, cursor: 'pointer' }}>Invitation</button>
                                )}
                                <button onClick={() => setActiveTab('details')} style={{ padding: '12px 4px', border: 'none', borderBottom: activeTab === 'details' ? `2px solid var(--color-primary)` : '2px solid transparent', backgroundColor: 'transparent', color: activeTab === 'details' ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: activeTab === 'details' ? 700 : 500, cursor: 'pointer' }}>Details</button>
                            </div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '2rem 1.25rem', border: '1px solid var(--color-border)', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                    {activeTab === 'banner' && viewingBanner && (
                                        <button onClick={() => handleDownloadBanner(viewingProgram)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}><Download size={20} /></button>
                                    )}
                                    <button onClick={() => handleShare(viewingProgram, activeTab)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}><Share2 size={20} /></button>
                                </div>

                                {activeTab === 'banner' && viewingBanner && (
                                    <div style={{ width: '100%', textAlign: 'center', padding: '2.5rem 0' }}>
                                        <LazyImage src={viewingBanner} alt="Invitation" style={{ width: '100%', maxWidth: '100%', borderRadius: '0.5rem' }} />
                                    </div>
                                )}

                                {activeTab === 'intro' && viewingProgram.introYoutubeUrl && (
                                    <div style={{ width: '100%', borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: '#000', margin: '2.5rem 0' }}>
                                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                            <iframe width="100%" height="100%" src={getEmbedUrl(viewingProgram.introYoutubeUrl)} frameBorder="0" allowFullScreen style={{ position: 'absolute', top: 0, left: 0 }} />
                                        </div>
                                    </div>
                                )}

                                {(activeTab === 'details' || (!viewingBanner && !viewingProgram.introYoutubeUrl)) && (
                                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{viewingProgram.programName}</h1>
                                        <div>
                                            <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Date & Time</span>
                                            <div>{new Date(viewingProgram.programDate).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Location</span>
                                            <div>{viewingProgram.programCity}</div>
                                            <div style={{ color: 'var(--color-text-muted)' }}>{viewingProgram.programVenue}</div>
                                        </div>
                                        {viewingProgram.programDescription && (
                                            <div>
                                                <span style={{ fontWeight: 800, fontSize: '0.875rem' }}>Description</span>
                                                <div style={{ whiteSpace: 'pre-wrap' }}>{viewingProgram.programDescription}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {viewingProgram.registrationStatus === 'Open' && (
                                    <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
                                        <button
                                            onClick={() => navigate('/web/event-registration', { state: { program: viewingProgram } })}
                                            style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff', border: 'none', padding: '0.75rem 2.5rem', borderRadius: '2rem', fontSize: '1.125rem', fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
                                        >
                                            Register for this Program
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WebPrograms;
