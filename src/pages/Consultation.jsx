import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Copy, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const ContactCard = ({ name, number, image, delay }) => {
    const { t } = useGlobalSettings();
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
                    <LazyImage
                        src={image}
                        alt={name}
                        width="100%"
                        height="100%"
                        objectFit="cover"
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
                        {t('CALL')}
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
                        {copied ? t('COPIED') || 'Copied' : t('COPY_BTN')}
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
    const { hiddenScreens, devMode, t } = useGlobalSettings();

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
                const q = query(ref, orderBy('name', 'asc'));

                const syncKey = 'consultants_refresh_v3'; // Hard force refresh
                const needsSync = needsServerSync(syncKey); 
                let snap;
                try {
                    snap = await getDocsFromCache(q);
                    if (snap.empty || needsSync) {
                        console.log("Forcing server sync for consultants...");
                        snap = await getDocsFromServer(q);
                        markSyncedLocally(syncKey);
                    }
                } catch (_err) {
                    snap = await getDocs(q);
                    markSyncedLocally(syncKey);
                }

                const teachersList = snap.docs.map(d => {
                    const data = d.data();
                    return { 
                        id: d.id, 
                        ...data,
                        name: data.name,
                        number: data.phoneNumber || data.number || '', // Support both field names
                        image: data.image || data.photo || '', // Support both field names
                    };
                });
                
                if (devMode) {
                    console.log("Loaded Consultants Data:", teachersList.filter(t => t.showInConsultation));
                }

                // Sort by consultationOrder, then name
                teachersList.sort((a, b) => {
                    const orderA = a.consultationOrder !== undefined ? a.consultationOrder : 999;
                    const orderB = b.consultationOrder !== undefined ? b.consultationOrder : 999;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.name.localeCompare(b.name);
                });

                setConsultants(teachersList.filter(t => t.showInConsultation === true));
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
                title={t('CONSULTATION_HEADING')}
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
                            {t('EDIT') || 'Edit'}
                        </button>
                    )
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '28rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    {t('CONSULTATION_DESC')}
                </p>

                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '2rem' }}>{t('LOADING')}...</p>
                ) : consultants.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '2rem' }}>{t('NO_TEACHERS_AVAIL') || 'No teacher contacts available.'}</p>
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
                        {t('CONSULTATION_HOURS_NOTE')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Consultation;
