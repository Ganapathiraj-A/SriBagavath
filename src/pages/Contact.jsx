import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, MapPin, Globe, Home, ChevronLeft, Copy } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { Clipboard } from '@capacitor/clipboard';
import { Toast } from '@capacitor/toast';

const ContactItem = ({ icon: Icon, content, href }) => {
    const { t } = useGlobalSettings();

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            await Clipboard.write({ string: content });
            await Toast.show({
                text: `${t('COPY_BTN')} ${t('PAST') ? 'done' : 'successful'}`, // Simplified feedback
                duration: 'short',
                position: 'center'
            });
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

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
                    <a href={href} style={{ color: 'var(--color-text)', transition: 'color 0.2s', fontSize: '1.1rem', fontWeight: 500, paddingRight: '2rem' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                    >
                        {content}
                    </a>
                ) : (
                    <p style={{ color: 'var(--color-text)', margin: 0, fontSize: '1.1rem', fontWeight: 500, paddingRight: '2rem' }}>{content}</p>
                )}
            </div>
            <button
                onClick={handleCopy}
                style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                title="Copy"
            >
                <Copy size={18} />
            </button>
        </div>
    );
};

const Contact = () => {
    const navigate = useNavigate();
    const { t } = useGlobalSettings();

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
                                content="+91 79041-18421"
                                href="tel:+917904118421"
                            />


                            <ContactItem
                                icon={Phone}
                                content="+91 99942-05880, +91 97891-65555"
                            />

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
