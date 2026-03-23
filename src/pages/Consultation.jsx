import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Copy, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const ContactCard = ({ name, number, image, delay }) => {
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
                backgroundColor: 'var(--color-card)',
                padding: '1.25rem',
                borderRadius: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem'
            }}
        >
            <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--color-border)', flexShrink: 0, backgroundColor: 'var(--color-surface)' }}>
                {image ? (
                    <img
                        src={image}
                        alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={24} color="var(--color-text-muted)" />
                    </div>
                )}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{name}</h3>
                    <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>{number}</p>
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
                            padding: '0.6rem',
                            backgroundColor: '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.6rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        <Phone size={16} />
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
                            padding: '0.6rem',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '0.6rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        {copied ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const Consultation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [consultants, setConsultants] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const { isInitialized, isAdmin, hasAccess } = useAdminAuth();
    const { hiddenScreens, devMode } = useGlobalSettings();

    const effectiveRole = isAdmin ? (devMode ? 'dev' : 'admin') : 'public';
    const currentHiddenScreens = hiddenScreens?.[effectiveRole] || [];

    React.useEffect(() => {
        const fetchConsultants = async () => {
            if (!isInitialized) return;
            try {
                const { collection, getDocs, query, orderBy, where, getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const { db } = await import('../firebase');
                const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

                const ref = collection(db, 'teachers');
                const q = query(ref, orderBy('consultationOrder', 'asc'));

                const needsSync = needsServerSync('consultants'); // Keep existing sync key
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

                setConsultants(snap.docs
                    .map(d => ({ 
                        id: d.id, 
                        name: d.data().name,
                        number: d.data().phoneNumber || '',
                        image: d.data().image || '',
                        ...d.data() 
                    }))
                    .filter(t => t.showInConsultation === true)
                );
            } catch (_err) {
                console.error("Error fetching consultants:", _err);
            } finally {
                setLoading(false);
            }
        };
        fetchConsultants();
    }, [isInitialized]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Consultation"
                rightAction={
                    (isAdmin || (typeof hasAccess === 'function' && (hasAccess('PROGRAM_MANAGEMENT') || hasAccess('CONSULTATION_MANAGEMENT')))) && !currentHiddenScreens.includes('/admin/consultation') && (
                        <button
                            onClick={() => navigate('/admin/consultation', { state: { returnPath: location.pathname } })}
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
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Edit
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    Contact our Teachers for personalized guidance
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '2rem' }}>Loading teachers...</p>
                ) : consultants.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '2rem' }}>No teacher contacts available.</p>
                ) : (
                    consultants.map((c, idx) => (
                        <ContactCard key={c.id} name={c.name} number={c.number} image={c.image} delay={idx * 0.1} />
                    ))
                )}

                <div style={{
                    marginTop: '2rem',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-primary-transparent)',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--color-primary)',
                    color: 'var(--color-primary)',
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
