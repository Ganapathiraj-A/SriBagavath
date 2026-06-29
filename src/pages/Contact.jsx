import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, MapPin, Globe, Home, ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const ContactItem = ({ icon: Icon, content, href }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            backgroundColor: 'var(--color-surface)',
            transition: 'background-color 0.2s',
            textAlign: 'left',
            height: '100%',
            position: 'relative'
        }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5E6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
        >
            <div style={{
                padding: '0.75rem',
                backgroundColor: 'var(--color-card)',
                borderRadius: '0.5rem',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', flex: 1 }}>
                {href ? (
                    <a href={href} style={{ color: 'var(--color-text)', transition: 'color 0.2s', fontSize: '1.1rem', fontWeight: 500 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                    >
                        {content}
                    </a>
                ) : (
                    <p style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{content}</p>
                )}
            </div>

        </div>
    );
};

const formatPhoneNumber = (num) => {
    if (!num) return '';
    const clean = num.replace(/[^0-9+]/g, '');
    if (clean.length === 10 && /^\d+$/.test(clean)) {
        return `+91 ${clean.slice(0, 5)}-${clean.slice(5)}`;
    }
    if (clean.length === 12 && clean.startsWith('91')) {
        return `+91 ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.startsWith('+91') && clean.length === 13) {
        return `+91 ${clean.slice(3, 8)}-${clean.slice(8)}`;
    }
    return num;
};

const getTelHref = (num) => {
    if (!num) return 'tel:+917904118421';
    const clean = num.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+')) {
        return `tel:${clean}`;
    }
    if (clean.length === 10) {
        return `tel:+91${clean}`;
    }
    if (clean.length === 12 && clean.startsWith('91')) {
        return `tel:+${clean}`;
    }
    return `tel:${clean}`;
};

const Contact = () => {
    const navigate = useNavigate();
    const { t, onlineRegistrationContact, generalContacts } = useGlobalSettings();

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader
                title={t('CONTACT_US')}
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />
            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: '42rem', margin: '0 auto', width: '100%' }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            backgroundColor: 'var(--color-card)',
                            borderRadius: '1rem',
                            padding: '2rem',
                            boxShadow: 'var(--shadow-md)',
                            border: '1px solid var(--color-border)'
                        }}
                    >

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <ContactItem
                                icon={Phone}
                                content={onlineRegistrationContact ? formatPhoneNumber(onlineRegistrationContact) : "+91 79041-18421"}
                                href={onlineRegistrationContact ? getTelHref(onlineRegistrationContact) : "tel:+917904118421"}
                            />


                            {generalContacts && generalContacts.map((phone, idx) => (
                                <ContactItem
                                    key={idx}
                                    icon={Phone}
                                    content={formatPhoneNumber(phone)}
                                    href={getTelHref(phone)}
                                />
                            ))}

                            <ContactItem
                                icon={Globe}
                                content="http://sribagavath.org"
                                href="https://sribagavath.org/"
                            />

                            <ContactItem
                                icon={MapPin}
                                content={t('VIEW_ON_MAPS')}
                                href="https://maps.app.goo.gl/RxVQ3nqtvuk84UWs8"
                            />

                            <ContactItem
                                icon={Home}
                                content={t('BHAVAN_ADDRESS')}
                                href="https://maps.app.goo.gl/RxVQ3nqtvuk84UWs8"
                            />

                            <ContactItem
                                icon={Home}
                                content={`${t('REGISTERED_OFFICE')}: ${t('OFFICE_ADDRESS')}`}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
