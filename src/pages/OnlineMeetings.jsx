import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User, ChevronLeft, Video, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import {
    collection, getDocs, doc, getDoc
} from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getLocalDateString } from '@/utils/dateUtils';

const formatRecurrenceRule = (master) => {
    if (!master.isRecurring) return null;
    const daysMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    if (master.frequency === 'daily') return 'Daily';
    if (master.frequency === 'weekly') {
        const days = master.recurringDays?.map(d => daysMap[d]).join(', ');
        return `Weekly on ${days} `;
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

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (currentDate <= maxDate) {
        if (ruleEndDate && currentDate > ruleEndDate) break;

        const dateStr = getLocalDateString(currentDate);
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
                id: `${master.id}_${dateStr} `,
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

const OnlineMeetings = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { loading: authLoading, isAdmin, hasAccess } = useAdminAuth();

    useEffect(() => {
        localStorage.setItem('lastVisited_online_meetings', new Date().toISOString());

        const fetchMeetings = async () => {
            if (authLoading) return;
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

                const todayStr = getLocalDateString();
                const meetingsRef = collection(db, 'online_meetings');

                const needsSync = needsServerSync('online_meetings');
                let snapshot;
                try {
                    snapshot = await getDocsFromCache(meetingsRef);
                    if (snapshot.empty || needsSync) {
                        snapshot = await getDocsFromServer(meetingsRef);
                        markSyncedLocally('online_meetings');
                    }
                } catch (_err) {
                    snapshot = await getDocs(meetingsRef);
                    markSyncedLocally('online_meetings');
                }

                const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const groups = {};
                raw.forEach(m => {
                    // Filter out ALL instances from DB (Legacy or pre-generated)
                    if (m.isRecurringInstance || m.masterId) return;

                    if (m.isRecurring) {
                        const key = `${m.conductedBy}_${m.startTime}_${m.frequency}_${(m.recurringDays || []).sort().join(',')} `;
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
                    } else {
                        processed.push(m);
                    }
                });

                processed.sort((a, b) => a.date.localeCompare(b.date));
                setMeetings(processed);
            } catch (_err) {
                console.error("Error fetching meetings:", _err);
            } finally {
                setLoading(false);
            }
        };
        fetchMeetings();
    }, [authLoading]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="Online Meetings"
                rightAction={
                    (isAdmin || hasAccess('PROGRAM_MANAGEMENT')) && (
                        <button
                            onClick={() => navigate('/admin/online-meetings', { state: { returnPath: location.pathname } })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.5rem 0.8rem',
                                backgroundColor: '#fff7ed',
                                color: 'var(--color-primary)',
                                border: '1px solid #ffedd5',
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
                    <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading upcoming meetings...</p>
                ) : meetings.length === 0 ? (
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '3rem', textAlign: 'center', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                        <Video size={48} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>No online meetings scheduled at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {meetings.map((meeting, index) => (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '1.5rem',
                                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                                    border: '1px solid #f3f4f6'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                    {/* Date Box */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#fff7ed',
                                        color: 'var(--color-primary)',
                                        padding: '0.875rem',
                                        borderRadius: '0.75rem',
                                        minWidth: '4.5rem',
                                        flexShrink: 0,
                                        border: '1px solid #ffedd5'
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
                                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
                                                {meeting.conductedBy}
                                            </h2>
                                            <Video size={20} color="var(--color-primary)" style={{ flexShrink: 0, marginLeft: '0.5rem' }} />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#4b5563', fontSize: '0.875rem' }}>
                                                    <Clock size={14} />
                                                    {meeting.startTime}
                                                </div>
                                                {meeting.recurrenceText && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: '#f3f4f6',
                                                        padding: '2px 8px',
                                                        borderRadius: '999px',
                                                        color: '#374151',
                                                        border: `1px solid #e5e7eb`
                                                    }}>
                                                        <RefreshCw size={10} />
                                                        {meeting.recurrenceText}
                                                    </div>
                                                )}
                                            </div>

                                            {meeting.description && (
                                                <p style={{
                                                    fontSize: '0.875rem',
                                                    color: '#6b7280',
                                                    margin: '0.25rem 0 0 0',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {meeting.description}
                                                </p>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                            <button
                                                onClick={() => navigate(`/programs/online/${meeting.id}`)}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: 'white',
                                                    color: 'var(--color-primary)',
                                                    border: '1px solid var(--color-primary)',
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

export default OnlineMeetings;
