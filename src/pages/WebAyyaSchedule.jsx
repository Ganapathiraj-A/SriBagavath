import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, ChevronLeft, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { collection, query, orderBy } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';

const WebAyyaSchedule = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSharingAll, setIsSharingAll] = useState(false);
    const [isSharingScheduleId, setIsSharingScheduleId] = useState(null);

    useEffect(() => {
        const fetchSchedules = async () => {
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
                
                const serverSnap = await getDocsFromServer(q);
                setSchedules(filterSchedules(serverSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
            } catch (err) {
                console.error("Failed to fetch schedules", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSchedules();
    }, []);

    const formatDateRange = (d1, d2) => {
        const options = { month: 'short', day: 'numeric' };
        const from = new Date(d1).toLocaleDateString('en-US', options);
        const to = new Date(d2).toLocaleDateString('en-US', options);
        return `${from} - ${to}`;
    };

    const handleWebShare = async (text, title) => {
        if (navigator.share) {
            try {
                await navigator.share({ title, text });
            } catch (err) {
                console.error("Web Share failed:", err);
                // Fallback to copy to clipboard
                navigator.clipboard.writeText(text);
                alert("Schedule copied to clipboard!");
            }
        } else {
            navigator.clipboard.writeText(text);
            alert("Schedule copied to clipboard!");
        }
    };

    const handleShareAll = () => {
        const listText = schedules.map(s => `*${s.place}*\n${formatDateRange(s.fromDate, s.toDate)}`).join('\n\n');
        handleWebShare(`*Ayya's Schedule Detail*\n\n${listText}`, "Ayya's Schedule");
    };

    const handleShareSingle = (s) => {
        const singleText = `*Ayya's Schedule: ${s.place}*\n${formatDateRange(s.fromDate, s.toDate)}`;
        handleWebShare(singleText, `Schedule: ${s.place}`);
    };

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--color-primary)' }} />
                <p style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Updating Schedule...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--color-surface)', minHeight: 'calc(100vh - 64px)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
                
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                    <div>
                        <button 
                            onClick={() => navigate('/web/events')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 700, marginBottom: '0.5rem', padding: 0 }}
                        >
                            <ChevronLeft size={18} />
                            Back to Events
                        </button>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>Ayya's Schedule</h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', marginTop: '0.25rem' }}>Stay updated with the latest program dates</p>
                    </div>

                    <button 
                        onClick={handleShareAll}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
                    >
                        <Share2 size={18} />
                        Share Full Schedule
                    </button>
                </header>

                <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {schedules.length > 0 ? schedules.map((schedule, index) => (
                        <motion.div 
                            key={schedule.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            style={{ 
                                backgroundColor: 'var(--color-card)', 
                                borderRadius: '1.25rem', 
                                padding: '1.5rem', 
                                border: '1px solid var(--color-border)', 
                                display: 'grid', 
                                gridTemplateColumns: 'auto 1fr auto', 
                                alignItems: 'center', 
                                gap: '2rem',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                e.currentTarget.style.borderColor = 'var(--color-primary-transparent)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                e.currentTarget.style.borderColor = 'var(--color-border)';
                            }}
                        >
                            {/* Date Badge */}
                            <div style={{ 
                                backgroundColor: 'var(--color-primary-transparent)', 
                                color: 'var(--color-primary)', 
                                padding: '1rem', 
                                borderRadius: '1rem', 
                                minWidth: '6rem', 
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' })}
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                                    {new Date(schedule.fromDate).getDate()}
                                </div>
                            </div>

                            {/* Info */}
                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text)' }}>
                                    <MapPin size={20} style={{ color: 'var(--color-primary)' }} />
                                    {schedule.place}
                                </h2>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                                    {formatDateRange(schedule.fromDate, schedule.toDate)}
                                </div>
                            </div>

                            {/* Single Share */}
                            <button 
                                onClick={() => handleShareSingle(schedule)}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                                    e.currentTarget.style.color = '#fff';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-primary)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                <Share2 size={20} />
                            </button>
                        </motion.div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--color-card)', borderRadius: '1.5rem', border: '1px dashed var(--color-border)' }}>
                            <Calendar size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No upcoming schedules</h3>
                            <p style={{ color: 'var(--color-text-muted)' }}>Please check back later for new program dates.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default WebAyyaSchedule;
