import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, AlertCircle, Share2, ChevronLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '../utils/GoogleAuthUtils';

import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getLocalDateString } from '../utils/dateUtils';

const Programs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [specificProgram, setSpecificProgram] = useState(null); // Separate state for linked program
    const [loading, setLoading] = useState(true);
    const [specificLoading, setSpecificLoading] = useState(false);
    const [viewingBanner, setViewingBanner] = useState(null);
    const [showTextDetails, setShowTextDetails] = useState(false);


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

    const { loading: authGlobalLoading } = useAdminAuth();

    useEffect(() => {
        const fetchPrograms = async () => {
            if (authGlobalLoading) return;
            try {
                // Track visit for badge reset
                localStorage.setItem('lastVisited_programs', new Date().toISOString());

                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');
                const today = getLocalDateString();
                const programsRef = collection(db, 'programs');
                const q = query(
                    programsRef,
                    where('programDate', '>=', today),
                    orderBy('programDate', 'asc')
                );

                // Strategy: Cache-First with Background Refresh
                const needsSync = needsServerSync('programs');

                // Try cache first
                let cacheSnap = null;
                try {
                    cacheSnap = await getDocsFromCache(q);
                    if (!cacheSnap.empty) {
                        const list = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setPrograms(list);
                        setLoading(false);
                        console.log(`[Programs] Loaded ${list.length} programs from cache`);
                    }
                } catch (e) {
                    console.warn("[Programs] Cache read failed", e);
                }

                // If cache empty OR needs sync, fetch from server
                if (!cacheSnap || cacheSnap.empty || needsSync) {
                    console.log(`[Programs] Refreshing from server...`);
                    const serverTask = getDocsFromServer(q).then(serverSnap => {
                        const list = serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setPrograms(list);
                        markSyncedLocally('programs');
                    }).catch(err => {
                        console.error("[Programs] Server refresh failed", err);
                    });

                    // If cache was empty, we MUST wait for server to avoid "No programs" flicker
                    if (!cacheSnap || cacheSnap.empty) {
                        await serverTask;
                    }
                }

            } catch (error) {
                console.error("Error fetching programs: ", error);
            } finally {
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
            } catch (e) {
                console.error("Failed to fetch specific program", e);
            } finally {
                setSpecificLoading(false);
            }
        };
        fetchSpecificProgram();
    }, [viewingProgramId, programs, specificProgram, authGlobalLoading]);

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
                } catch (e) {
                    console.error("Banner fetch failed", e);
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
            const base64Data = bannerData;
            // Extract base64 part if it contains data prefix
            const cleanBase64 = base64Data.split(',')[1] || base64Data;
            const fileName = `banner_${Date.now()}.jpg`;

            // Write to cache directory (temporary file)
            const result = await Filesystem.writeFile({
                path: fileName,
                data: cleanBase64,
                directory: Directory.Cache
            });

            // Share the file URI
            await Share.share({
                title: program.programName,
                // text: `Check out this program: ${program.programName}`, // REMOVED as per request
                files: [result.uri]
            });

            // Track Share
            import('../utils/Analytics').then(m => {
                m.default.logEvent('share_program_banner', {
                    program_name: program.programName,
                    program_id: program.id
                });
            });
        } catch (error) {
            console.error('Error sharing banner:', error);
            // Fallback to clipboard if sharing fails
            try {
                await navigator.clipboard.writeText(program.programBanner);
                alert('Sharing failed. Banner URL copied to clipboard.');
            } catch (e) {
                alert('Sharing failed completely. ' + error.message);
            }
        }
    };

    const handleShare = async (program) => {
        if (!program) return;

        const text = `
*${program.programName}*

📅 *Date:* ${new Date(program.programDate).toLocaleDateString()} ${program.programEndDate ? `- ${new Date(program.programEndDate).toLocaleDateString()}` : ''}

📍 *City:* ${program.programCity}

🏢 *Venue:* ${program.programVenue}

${program.programDescription ? `📝 *Description:*\n${program.programDescription}\n\n` : ''}${program.registrationStatus === 'Open' ? `✅ Registration Open until ${new Date(program.lastDateToRegister).toLocaleDateString()}` : '🚫 Registration Closed'}
        `.trim();

        try {
            await Share.share({
                title: program.programName,
                text: text,
            });

            // Track Share
            import('../utils/Analytics').then(m => {
                m.default.logEvent('share_program_text', {
                    program_name: program.programName,
                    program_id: program.id
                });
            });
        } catch (error) {
            console.error('Error sharing:', error);
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
            <PageHeader
                title={viewingProgram ? viewingProgram.programName : "Programs"}
            />
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>

                    <AnimatePresence mode="wait">
                        {viewingProgram ? (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                }}
                            >
                                {/* Image First - Only if no text details shown */}
                                {viewingBanner && !showTextDetails && (
                                    <div
                                        style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
                                        onClick={() => setShowTextDetails(true)}
                                    >
                                        <img
                                            src={viewingBanner}
                                            alt="Program Banner"
                                            style={{
                                                width: '100%',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                    </div>
                                )}


                                {/* Details Section - Logic: Show if NO banner OR if toggle is active (REPLACES banner) */}
                                {(!viewingBanner || showTextDetails) && (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gap: '1.5rem',
                                            color: '#374151',
                                            cursor: viewingBanner ? 'pointer' : 'default',
                                            marginBottom: '1.5rem'
                                        }}
                                        onClick={() => viewingBanner && setShowTextDetails(false)}
                                    >
                                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                                            {viewingProgram.programName}
                                        </h1>
                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                Date & Time
                                            </span>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {new Date(viewingProgram.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                {viewingProgram.programEndDate && (
                                                    <>
                                                        {' '}- {new Date(viewingProgram.programEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                Location
                                            </span>
                                            <div style={{ fontSize: '1.125rem' }}>
                                                {viewingProgram.programCity}
                                            </div>
                                            <div style={{ marginTop: '0.25rem', color: '#4b5563' }}>
                                                {viewingProgram.programVenue}
                                            </div>
                                        </div>

                                        {viewingProgram.programDescription && (
                                            <div>
                                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                    Description
                                                </span>
                                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                    {viewingProgram.programDescription}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                                Registration Details
                                            </span>
                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                                <div>
                                                    Status:{' '}
                                                    <span style={{
                                                        color: viewingProgram.registrationStatus === 'Open' ? '#059669' : '#dc2626',
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

                                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => handleShare(viewingProgram)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                color: 'var(--color-primary)',
                                                background: 'none',
                                                border: '1px solid var(--color-primary)',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.375rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                cursor: 'pointer'
                                            }}
                                            title="Share Text"
                                        >
                                            <Share2 size={16} />
                                            Text
                                        </button>
                                        {viewingBanner && (
                                            <button
                                                onClick={() => handleShareBanner(viewingProgram)}
                                                className="btn-share-banner"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    color: 'var(--color-primary)',
                                                    background: 'none',
                                                    border: '1px solid var(--color-primary)',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    cursor: 'pointer'
                                                }}
                                                title="Share Banner"
                                            >
                                                <Share2 size={16} />
                                                Banner
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
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
                                    color: '#4b5563',
                                    fontSize: '0.95rem'
                                }}>
                                    For registration queries please contact{' '}
                                    <button
                                        onClick={() => handleCopy('7904118421')}
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
                                        7904118421
                                    </button>
                                </div>

                                {programs.length === 0 ? (
                                    <div style={{
                                        backgroundColor: 'white',
                                        borderRadius: '1rem',
                                        padding: '3rem',
                                        textAlign: 'center',
                                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                                    }}>
                                        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                                            No upcoming programs scheduled at the moment.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {programs.map((program, index) => (
                                            <motion.div
                                                key={program.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                style={{
                                                    backgroundColor: 'white',
                                                    borderRadius: '1rem',
                                                    padding: '1.25rem',
                                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                    border: '1px solid #f3f4f6'
                                                }}
                                            >
                                                {/* Row 1: Program Title */}
                                                <h2 style={{
                                                    fontSize: '1.125rem',
                                                    fontWeight: 600,
                                                    color: '#111827',
                                                    margin: '0 0 0.4rem 0',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {program.programName}
                                                </h2>

                                                {/* Row 2: Date Range & Location */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    flexWrap: 'wrap',
                                                    color: '#6b7280',
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
                                                            backgroundColor: '#fef2f2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fecaca'
                                                        }}>
                                                            Registration Closed
                                                        </span>
                                                    )}

                                                    {program.registrationStatus === 'Open' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSearchParams({ id: program.id });
                                                            }}
                                                            style={{
                                                                padding: '0.4rem 0.875rem',
                                                                backgroundColor: 'white',
                                                                color: '#374151',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '0.5rem',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8125rem',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            Details
                                                        </button>
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
