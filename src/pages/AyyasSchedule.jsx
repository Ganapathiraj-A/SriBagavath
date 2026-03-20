import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Share2, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';
import { db } from '@/firebase';
import { collection, query, orderBy } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const AyyasSchedule = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSharingAll, setIsSharingAll] = useState(false);
    const [sharingData, setSharingData] = useState(null);
    const [isSharingScheduleId, setIsSharingScheduleId] = useState(null);
    const shareRef = useRef(null);
    const location = useLocation();
    const { loading: authGlobalLoading, isAdmin, hasAccess } = useAdminAuth();
    const { hiddenScreens, devMode } = useGlobalSettings();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

    useEffect(() => {
        const fetchSchedules = async () => {
            if (authGlobalLoading) return;
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

                const filterSchedules = (list) => {
                    const today = getLocalDateString();
                    return list.filter(s => {
                        const endDate = s.toDate || s.fromDate;
                        return endDate >= today;
                    });
                };

                const schedulesRef = collection(db, 'schedules');
                const q = query(schedulesRef, orderBy('fromDate', 'asc'));

                const needsSync = needsServerSync('schedules');

                // Try cache first
                let cacheSnap = null;
                try {
                    cacheSnap = await getDocsFromCache(q);
                    if (!cacheSnap.empty) {
                        const list = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setSchedules(filterSchedules(list));
                        setLoading(false);
                        console.log(`[Schedule] Loaded ${list.length} items from cache`);
                    }
                } catch (_err) {
                    console.warn("[Schedule] Cache read failed", _err);
                }

                // If cache empty OR needs sync, fetch from server
                if (!cacheSnap || cacheSnap.empty || needsSync) {
                    console.log(`[Schedule] Refreshing from server...`);
                    getDocsFromServer(q).then(serverSnap => {
                        const list = serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setSchedules(filterSchedules(list));
                        markSyncedLocally('schedules');
                    }).catch(err => {
                        console.error("[Schedule] Server refresh failed", err);
                    }).finally(() => {
                        setLoading(false);
                    });
                }
            } catch (_err) {
                console.error("Error fetching schedules: ", _err);
            } finally {
                setLoading(false);
            }
        };

        // Track visit for badge reset
        localStorage.setItem('lastVisited_schedule', new Date().toISOString());
        fetchSchedules();
    }, [authGlobalLoading]);

    const captureAndShare = async (currentData) => {
        if (!shareRef.current || !currentData) return;
        try {
            const canvas = await html2canvas(shareRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#ffffff',
                width: 800,
                onclone: (doc) => {
                    const el = doc.getElementById('schedule-share-template');
                    if (el) {
                        el.style.display = 'block';
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                    }
                }
            });

            const fileName = `ayya_schedule_${Date.now()}.jpg`;
            const base64Data = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
                encoding: 'base64'
            });

            await Share.share({
                title: "Ayya's Schedule",
                text: "",
                files: [result.uri]
            });
        } catch (error) {
            console.error("[Schedule] Sharing failed:", error);
        } finally {
            setIsSharingAll(false);
            setIsSharingScheduleId(null);
        }
    };

    const handleShareAll = async () => {
        if (schedules.length === 0) return;
        setIsSharingAll(true);
        const data = { type: 'list', schedules };
        setSharingData(data);
        setTimeout(() => captureAndShare(data), 1500);
    };

    const handleShare = async (schedule) => {
        if (!schedule) return;
        setIsSharingScheduleId(schedule.id);
        const data = { type: 'single', schedule };
        setSharingData(data);
        setTimeout(() => captureAndShare(data), 1500);
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-background)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>Loading schedules...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-background)',
            paddingBottom: '2rem'
        }}>
            <PageHeader
                title="Ayya's Schedule"
                leftAction={
                    <button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleShareAll}
                            disabled={isSharingAll || schedules.length === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                backgroundColor: 'var(--color-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: '50%',
                                cursor: (isSharingAll || isSharingScheduleId) ? 'default' : 'pointer',
                                boxShadow: 'var(--shadow-sm)',
                                color: 'var(--color-primary)',
                                opacity: isSharingAll ? 0.6 : 1
                            }}
                            title="Share Full List"
                        >
                            {isSharingAll ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                        </button>
                        {(isAdmin || hasAccess('PROGRAM_MANAGEMENT')) && !currentHiddenScreens.includes('/schedule/manage') && (
                            <button
                                onClick={() => navigate('/schedule/manage', { state: { returnPath: location.pathname } })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.8rem',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)',
                                    border: '1px solid var(--color-primary-transparent)',
                                    borderRadius: '0.75rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Edit
                            </button>
                        )}
                    </div>
                }
            />
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>


                    {schedules.length === 0 ? (
                        <div style={{
                            backgroundColor: 'var(--color-card)',
                            borderRadius: '1rem',
                            padding: '3rem',
                            textAlign: 'center',
                            boxShadow: 'var(--shadow-sm)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>
                                No schedules available at the moment.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {schedules.map((schedule, index) => (
                                <motion.div
                                    key={schedule.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    style={{
                                        backgroundColor: 'var(--color-card)',
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        boxShadow: 'var(--shadow-sm)',
                                        border: '1px solid var(--color-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem'
                                    }}
                                >
                                    {/* Date Box */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'var(--color-primary-transparent)',
                                        color: 'var(--color-primary)',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        minWidth: '5rem',
                                        flexShrink: 0
                                    }}>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                        <span style={{
                                            fontSize: '1.75rem',
                                            fontWeight: 'bold',
                                            lineHeight: 1
                                        }}>
                                            {new Date(schedule.fromDate).getDate()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        flex: 1
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <h2 style={{
                                                fontSize: '1.25rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text)',
                                                margin: 0
                                            }}>
                                                {schedule.place}
                                            </h2>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '0.5rem 1.5rem',
                                            color: 'var(--color-text-muted)',
                                            fontSize: '0.925rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {new Date(schedule.fromDate).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {new Date(schedule.toDate).toLocaleDateString(undefined, {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleShare(schedule)}
                                        disabled={isSharingScheduleId === schedule.id}
                                        style={{
                                            padding: '0.5rem',
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: isSharingScheduleId === schedule.id ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: isSharingScheduleId === schedule.id ? 0.5 : 0.8
                                        }}
                                        title="Share Schedule"
                                    >
                                        {isSharingScheduleId === schedule.id ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Shareable Template */}
            <div style={{
                position: 'fixed',
                top: '0',
                left: '-2000px',
                width: '800px',
                zIndex: -1000,
                visibility: 'visible',
                pointerEvents: 'none',
                opacity: 1
            }}>
                {sharingData && (
                    <div
                        id="schedule-share-template"
                        ref={shareRef}
                        style={{
                            width: '800px',
                            backgroundColor: '#ffffff',
                            padding: '60px 40px',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Header branding */}
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h1 style={{ color: '#f97316', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 800 }}>
                                Ayya's Schedule
                            </h1>
                            <div style={{ height: '4px', width: '100px', backgroundColor: '#f97316', margin: '0 auto' }}></div>
                        </div>

                        {/* Content */}
                        {sharingData.type === 'single' ? (
                            <div style={{
                                backgroundColor: '#fff7ed',
                                borderRadius: '25px',
                                padding: '40px',
                                border: '1px solid #ffedd5',
                                textAlign: 'center'
                            }}>
                                <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#111827', margin: '0 0 15px 0' }}>
                                    {sharingData.schedule.place}
                                </h2>
                                <div style={{ height: '2px', width: '50px', backgroundColor: '#f97316', margin: '0 auto 25px auto' }}></div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <div style={{ backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                                            <p style={{ margin: 0, fontSize: '20px', color: '#f97316', fontWeight: 700 }}>FROM</p>
                                            <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111827' }}>
                                                {new Date(sharingData.schedule.fromDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div style={{ height: '1px', width: '20px', backgroundColor: '#f97316' }}></div>
                                        <div style={{ backgroundColor: '#ffffff', padding: '10px 20px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                                            <p style={{ margin: 0, fontSize: '20px', color: '#f97316', fontWeight: 700 }}>TO</p>
                                            <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#111827' }}>
                                                {new Date(sharingData.schedule.toDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    {sharingData.schedule.description && (
                                        <p style={{ fontSize: '20px', color: '#4b5563', margin: '20px 0 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
                                            {sharingData.schedule.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {sharingData.schedules.map((s) => (
                                    <div key={s.id} style={{
                                        backgroundColor: '#fff7ed',
                                        borderRadius: '20px',
                                        padding: '25px',
                                        border: '1px solid #ffedd5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '30px'
                                    }}>
                                        {/* Date Section */}
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: '#ffffff',
                                            color: '#f97316',
                                            padding: '15px',
                                            borderRadius: '15px',
                                            minWidth: '100px',
                                            border: '1px solid #ffedd5'
                                        }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                {new Date(s.fromDate).toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span style={{ fontSize: '36px', fontWeight: 800 }}>
                                                {new Date(s.fromDate).getDate()}
                                            </span>
                                        </div>

                                        {/* Content Section */}
                                        <div style={{ flex: 1 }}>
                                            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 8px 0' }}>
                                                {s.place}
                                            </h2>
                                            <p style={{ fontSize: '20px', color: '#4b5563', margin: 0 }}>
                                                {new Date(s.fromDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                {' - '}
                                                {new Date(s.toDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer Branding */}
                        <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px solid #f3f4f6', textAlign: 'center' }}>
                            <p style={{ margin: 0, color: '#f97316', fontSize: '22px', fontWeight: 800 }}>
                                Download Sri Bagavath App for latest updates
                            </p>
                            <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                                Available on Google Play Store
                            </p>
                        </div>
                    </div>
                )}
            </div>

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


export default AyyasSchedule;
