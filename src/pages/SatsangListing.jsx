import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { collection, getDocs } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getLocalDateString } from '@/utils/dateUtils';

const formatRecurrenceRule = (master) => {
    if (!master.isRecurring) return null;
    const daysMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    if (master.frequency === 'daily') return 'Daily';
    if (master.frequency === 'weekly') {
        const days = master.recurringDays?.map(d => daysMap[d]).join(', ');
        return `Weekly on ${days}`;
    }
    if (master.frequency === 'monthly') return 'Monthly';
    return 'Recurring';
};

const getNextOccurrence = (master, todayStr) => {
    if (!master.isRecurring) return master;

    let currentDate = new Date(master.date);
    const today = new Date(todayStr);
    const ruleEndDate = master.recurringEndDateType === 'date' ? new Date(master.recurringEndDate) : null;
    const exceptions = master.exceptions || [];

    // Max search window: 1 year
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (currentDate <= maxDate) {
        if (ruleEndDate && currentDate > ruleEndDate) break;

        const d = new Date(currentDate);
        const dateStr = d.toLocaleDateString('en-CA');
        let isMatch = false;

        if (master.frequency === 'daily') isMatch = true;
        else if (master.frequency === 'weekly') {
            if (master.recurringDays?.includes(currentDate.getDay().toString())) isMatch = true;
        } else if (master.frequency === 'monthly') {
            const startDay = new Date(master.date).getDate();
            if (currentDate.getDate() === startDay) isMatch = true;
        }

        if (isMatch && !exceptions.includes(dateStr) && dateStr >= todayStr) {
            return {
                ...master,
                id: `${master.id}_${dateStr}`,
                masterId: master.id,
                date: dateStr,
                isVirtual: true,
                recurrenceText: formatRecurrenceRule(master)
            };
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return null;
};

const SatsangListing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { loading: authGlobalLoading, isAdmin, hasAccess } = useAdminAuth();


    useEffect(() => {
        localStorage.setItem('lastVisited_satsangs', new Date().toISOString());

        const fetchMeetings = async () => {
            if (authGlobalLoading) return;
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

                const todayStr = getLocalDateString();
                const meetingsRef = collection(db, 'satsangs');

                const needsSync = needsServerSync('satsangs');
                let snapshot;
                try {
                    snapshot = await getDocsFromCache(meetingsRef);
                    if (snapshot.empty || needsSync) {
                        snapshot = await getDocsFromServer(meetingsRef);
                        markSyncedLocally('satsangs');
                    }
                } catch (_err) {
                    snapshot = await getDocs(meetingsRef);
                    markSyncedLocally('satsangs');
                }

                const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const groups = {};
                raw.forEach(m => {
                    // Filter out ALL instances from DB (Legacy or pre-generated)
                    if (m.isRecurringInstance || m.masterId) return;

                    if (m.isRecurring) {
                        const key = `${m.conductedBy}_${m.startTime}_${m.city}_${m.frequency}_${(m.recurringDays || []).sort().join(',')}`;
                        if (!groups[key] || new Date(m.date) < new Date(groups[key].date)) {
                            groups[key] = m;
                        }
                    } else if (m.date >= todayStr) {
                        groups[m.id] = m;
                    }
                });

                const processed = [];
                Object.values(groups).forEach(m => {
                    if (m.isRecurring) {
                        const next = getNextOccurrence(m, todayStr);
                        if (next) processed.push(next);
                    } else if (m.date >= todayStr) {
                        processed.push(m);
                    }
                });

                processed.sort((a, b) => a.date.localeCompare(b.date));
                setMeetings(processed);
            } catch (_err) {
                console.error("Error fetching satsangs:", _err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, [authGlobalLoading]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '3rem' }}>
            <PageHeader
                title="Satsang"
                rightAction={
                    (isAdmin || (typeof hasAccess === 'function' && hasAccess('PROGRAM_MANAGEMENT'))) && (
                        <button
                            onClick={() => navigate('/admin/satsang', { state: { returnPath: location.pathname } })}
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

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', width: '100%' }}>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading upcoming Satsangs...</p>
                ) : meetings.length === 0 ? (
                    <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '3rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                        <Users size={48} color="var(--color-text-light)" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>No Satsang scheduled at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {meetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    boxShadow: 'var(--shadow-sm)',
                                    border: '1px solid var(--color-border)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary)'
                                }} />

                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    {/* Date Box */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'var(--color-primary-transparent)',
                                        color: 'var(--color-primary)',
                                        padding: '0.875rem',
                                        borderRadius: '0.75rem',
                                        minWidth: '4.5rem',
                                        flexShrink: 0,
                                        border: `1px solid var(--color-primary)`
                                    }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                        <span style={{
                                            fontSize: '1.5rem',
                                            fontWeight: 'bold',
                                            lineHeight: 1,
                                            marginTop: '2px'
                                        }}>
                                            {new Date(meeting.date).getDate()}
                                        </span>
                                    </div>

                                    {/* Content Column */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
                                                {meeting.conductedBy}
                                            </h2>
                                            <div style={{ padding: '0.4rem', backgroundColor: 'var(--color-primary-transparent)', borderRadius: '50%', color: 'var(--color-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                <Users size={16} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                                    <MapPin size={14} />
                                                    {meeting.city}
                                                </div>
                                                {meeting.recurrenceText && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'var(--color-surface)',
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        color: 'var(--color-text)',
                                                        border: `1px solid var(--color-border)`
                                                    }}>
                                                        <RefreshCw size={10} />
                                                        {meeting.recurrenceText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                            <button
                                                onClick={() => navigate(`/programs/satsang/${meeting.id}`)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: 'var(--color-card)',
                                                    color: 'var(--color-primary)',
                                                    border: `1px solid var(--color-primary)`,
                                                    borderRadius: '0.5rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    fontSize: '0.8125rem'
                                                }}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SatsangListing;
