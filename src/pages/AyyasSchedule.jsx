import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Share } from '@capacitor/share';
import { db } from '@/firebase';
import { collection, query, orderBy } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { useLocation } from 'react-router-dom';

const AyyasSchedule = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSharingAll, setIsSharingAll] = useState(false);
    const [isSharingScheduleId, setIsSharingScheduleId] = useState(null);
    const { isAdmin, hasAccess, loading: authGlobalLoading } = useAdminAuth();
    const { hiddenScreens, devMode, t, language } = useGlobalSettings();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];
    const orange = 'var(--color-primary)';

    useEffect(() => {
        const fetchSchedules = async () => {
            if (authGlobalLoading) return;
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const filterSchedules = (list) => {
                    const today = getLocalDateString();
                    return list.filter(s => (s.toDate || s.fromDate) >= today);
                };
                const q = query(collection(db, 'schedules'), orderBy('fromDate', 'asc'));
                const cacheSnap = await getDocsFromCache(q).catch(() => null);
                if (cacheSnap && !cacheSnap.empty) {
                    setSchedules(filterSchedules(cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
                    setLoading(false);
                }
                getDocsFromServer(q).then(serverSnap => {
                    setSchedules(filterSchedules(serverSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
                }).catch(() => {
                    // Silently fail as we likely have cached data or loading is handled by finally
                }).finally(() => setLoading(false));
            } catch (_err) { setLoading(false); }
        };
        fetchSchedules();
    }, [authGlobalLoading]);

    const formatDateRange = (d1, d2) => {
        const options = { month: 'short', day: 'numeric' };
        const from = new Date(d1).toLocaleDateString('en-US', options);
        const to = new Date(d2).toLocaleDateString('en-US', options);
        return `${from} - ${to}`;
    };

    const formatScheduleText = (s) => {
        const dateRange = formatDateRange(s.fromDate, s.toDate);
        const monthShort = new Date(s.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
        const day = new Date(s.fromDate).getDate();
        return `*${monthShort} ${day}: ${s.place}*\n(${dateRange})`;
    };

    const handleShareAll = async () => {
        if (schedules.length === 0) return;
        setIsSharingAll(true);
        try {
            const listText = schedules.map(formatScheduleText).join('\n\n');
            const finalText = `*Ayya's Schedule Detail*\n\n${listText}`;
            
            await Share.share({
                title: "Ayya's Schedule",
                text: finalText
            });
        } catch (error) {
            console.error('Share Error:', error);
        } finally {
            setIsSharingAll(false);
        }
    };

    const handleShareSingle = async (schedule) => {
        if (!schedule) return;
        setIsSharingScheduleId(schedule.id);
        try {
            const singleText = `*Ayya's Schedule: ${schedule.place}*\n\n${formatScheduleText(schedule)}`;
            
            await Share.share({
                title: `Schedule: ${schedule.place}`,
                text: singleText
            });
        } catch (error) {
            console.error('Share Error:', error);
        } finally {
            setIsSharingScheduleId(null);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '2rem' }}>
            <PageHeader
                title={t('AYYAS_SCHEDULE')}
                leftAction={<button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', padding: '8px' }}><ChevronLeft size={24} /></button>}
                rightAction={
                    <div style={{ 
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end'
                    }}>
                        {(isAdmin || hasAccess('SCHEDULE_MANAGEMENT')) && !currentHiddenScreens.includes('/schedule/manage') && (
                            <button
                                onClick={() => navigate('/schedule/manage', { state: { returnPath: location.pathname } })}
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
                        )}
                        <div style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            right: 0, 
                            marginTop: '0.5rem',
                            paddingRight: '0.2rem' // Tiny nudge to align circle visually with pill edge
                        }}>
                             <button 
                                onClick={handleShareAll} 
                                disabled={isSharingAll || schedules.length === 0} 
                                style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    backgroundColor: 'var(--color-card-transparent)', 
                                    backdropFilter: 'blur(4px)',
                                    border: 'none', 
                                    color: 'var(--color-primary)',
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isSharingAll ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={16} />}
                            </button>
                        </div>
                    </div>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--color-card)', borderRadius: '1rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No upcoming schedules found.</p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Check back later for updated program dates.</p>
                        </div>
                    ) : (
                        schedules.map((schedule, index) => (
                            <motion.div key={schedule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', padding: '1rem', borderRadius: '0.75rem', minWidth: '5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{new Date(schedule.fromDate).getDate()}</div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                        {language === 'ta' && schedule.placeTamil ? schedule.placeTamil : schedule.place}
                                    </h2>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{formatDateRange(schedule.fromDate, schedule.toDate)}</div>
                                </div>
                                <button onClick={() => handleShareSingle(schedule)} disabled={isSharingScheduleId === schedule.id} style={{ border: 'none', background: 'none', color: 'var(--color-primary)' }}>
                                    {isSharingScheduleId === schedule.id ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default AyyasSchedule;
