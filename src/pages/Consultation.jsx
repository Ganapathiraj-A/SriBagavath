import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Phone, Copy, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';

const ContactCard = ({ name, number, delay }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCall = () => {
        window.open(`tel:${number}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.4 }}
            style={{
                backgroundColor: 'white',
                padding: '1.25rem',
                borderRadius: '1rem',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}
        >
            <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>{name}</h3>
                <p style={{ fontSize: '1rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{number}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={handleCall}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Phone size={18} />
                    Call
                </button>
                <button
                    onClick={handleCopy}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    {copied ? <Check size={18} color="#059669" /> : <Copy size={18} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </motion.div>
    );
};

const Consultation = () => {
    const navigate = useNavigate();
    const [consultants, setConsultants] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const { isInitialized, isAdmin, hasAccess } = useAdminAuth();

    React.useEffect(() => {
        const fetchConsultants = async () => {
            if (!isInitialized) return;
            try {
                const { collection, getDocs, query, orderBy, getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { db } = await import('../firebase');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

                const ref = collection(db, 'consultants');
                const q = query(ref, orderBy('order', 'asc'));

                const needsSync = needsServerSync('consultants');
                let snap;
                try {
                    snap = await getDocsFromCache(q);
                    if (snap.empty || needsSync) {
                        snap = await getDocsFromServer(q);
                        markSyncedLocally('consultants');
                    }
                } catch (_err) {
                    snap = await getDocs(q);
                    markSyncedLocally('consultants');
                }

                setConsultants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (_err) {
                console.error("Error fetching consultants:", _err);
            } finally {
                setLoading(false);
            }
        };
        fetchConsultants();
    }, [isInitialized]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Consultation"
                rightAction={
                    (isAdmin || hasAccess('PROGRAM_MANAGEMENT') || hasAccess('CONSULTATION_MANAGEMENT')) && (
                        <button
                            onClick={() => navigate('/admin/program-management')}
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
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Manage
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: '#6b7280', textAlign: 'center', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    Contact our Teachers for personalized guidance
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>Loading teachers...</p>
                ) : consultants.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No teacher contacts available.</p>
                ) : (
                    consultants.map((c, idx) => (
                        <ContactCard key={c.id} name={c.name} number={c.number} delay={idx * 0.1} />
                    ))
                )}

                <div style={{
                    marginTop: '2rem',
                    padding: '1.25rem',
                    backgroundColor: '#fff7ed',
                    borderRadius: '0.75rem',
                    border: '1px solid #fed7aa',
                    color: '#9a3412',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                }}>
                    <div style={{ marginTop: '0.25rem' }}>ℹ️</div>
                    <p style={{ margin: 0, lineHeight: 1.5 }}>
                        Consultations are available during scheduled hours. Please call to book an appointment.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Consultation;
