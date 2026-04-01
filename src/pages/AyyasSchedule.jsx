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
    const { isAdmin, hasAccess, loading: authGlobalLoading } = useAdminAuth();
    const { hiddenScreens, devMode } = useGlobalSettings();

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

    const formatScheduleText = (s) => {
        const fromDate = new Date(s.fromDate).toLocaleDateString();
        const toDate = new Date(s.toDate).toLocaleDateString();
        const monthShort = new Date(s.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
        const day = new Date(s.fromDate).getDate();
        return `*${monthShort} ${day}: ${s.place}*\n(${fromDate} - ${toDate})`;
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
                title="Ayya's Schedule"
                leftAction={<button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', padding: '8px' }}><ChevronLeft size={24} /></button>}
                rightAction={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {(isAdmin || hasAccess('SCHEDULE_MANAGEMENT')) && !currentHiddenScreens.includes('/admin/schedules') && (
                            <button
                                onClick={() => navigate('/admin/schedules', { state: { returnPath: location.pathname } })}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.5rem 0.8rem',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: orange,
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
                        <button 
                            onClick={handleShareAll} 
                            disabled={isSharingAll || schedules.length === 0} 
                            style={{ 
                                width: '40px', 
                                height: '40px', 
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
                            {isSharingAll ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={20} />}
                        </button>
                    </div>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedules.map((schedule, index) => (
                        <motion.div key={schedule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', padding: '1rem', borderRadius: '0.75rem', minWidth: '5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{new Date(schedule.fromDate).getDate()}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{schedule.place}</h2>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(schedule.fromDate).toLocaleDateString()} - {new Date(schedule.toDate).toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => handleShareSingle(schedule)} disabled={isSharingScheduleId === schedule.id} style={{ border: 'none', background: 'none', color: 'var(--color-primary)' }}>
                                {isSharingScheduleId === schedule.id ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default AyyasSchedule;
