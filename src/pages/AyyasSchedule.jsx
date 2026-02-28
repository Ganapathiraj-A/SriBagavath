import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Share2, ChevronLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Share } from '@capacitor/share';
import { db } from '@/firebase';
import { collection, query, orderBy, getDocs, where } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';

const AyyasSchedule = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const { loading: authGlobalLoading, isAdmin, hasAccess } = useAdminAuth();

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

    const handleShare = async (schedule) => {
        if (!schedule) return;

        const fromDate = new Date(schedule.fromDate);
        const toDate = new Date(schedule.toDate);

        const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        const fromStr = fromDate.toLocaleDateString(undefined, dateOptions);
        const communitiesStr = toDate.toLocaleDateString(undefined, dateOptions);

        const shareText = `
*Ayya's Schedule*

📍 *Place:* ${schedule.place}
📅 ${fromStr}
📅 ${communitiesStr}
        `.trim();

        try {
            await Share.share({
                title: "Ayya's Schedule",
                text: shareText,
                dialogTitle: "Share Schedule",
            });
        } catch (_err) {
            console.error('Error sharing:', _err);
            // Fallback for web or if share fails
            try {
                await navigator.clipboard.writeText(shareText);
                alert('Schedule details copied to clipboard!');
            } catch (clipError) {
                console.error('Clipboard failed:', clipError);
            }
        }
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
                    (isAdmin || hasAccess('PROGRAM_MANAGEMENT')) && (
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
                    )
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
                                        style={{
                                            padding: '0.5rem',
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0.8
                                        }}
                                        title="Share Schedule"
                                    >
                                        <Share2 size={20} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AyyasSchedule;
