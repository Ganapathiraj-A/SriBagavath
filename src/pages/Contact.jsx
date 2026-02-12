import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe, Home, ChevronLeft } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const ContactItem = ({ icon: Icon, content, href }) => (
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
        height: '100%' // Ensure equal height in grid
    }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF5E6'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
    >
        <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Icon size={24} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', flex: 1 }}>
            {href ? (
                <a href={href} style={{ color: '#4b5563', transition: 'color 0.2s', fontSize: '1.1rem', fontWeight: 500 }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#4b5563'}
                >
                    {content}
                </a>
            ) : (
                <p style={{ color: '#4b5563', margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>{content}</p>
            )}
        </div>
    </div>
);

const Contact = () => {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '2rem' }}>
            <PageHeader
                title="Contact Us"
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
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '2rem',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
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
                                content="http://sribagavath.com"
                                href="https://sribagavath.com/"
                            />

                            <ContactItem
                                icon={MapPin}
                                content="View on Google Maps"
                                href="https://maps.app.goo.gl/RxVQ3nqtvuk84UWs8"
                            />

                            <ContactItem
                                icon={Home}
                                content="Sri Bagavath Bhavan, Kodambakkadu, Periyakoundapuram, Karippatti, Salem, Tamil Nadu 636106"
                                href="https://maps.app.goo.gl/RxVQ3nqtvuk84UWs8"
                            />

                            <ContactItem
                                icon={Home}
                                content="Registered Office, 31, Ramalingasamy Street, Ammapet, Salem - 636 003."
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
