import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe, Home } from 'lucide-react';

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
    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-2xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-sm"
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>Contact Us</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ContactItem
                            icon={Mail}
                            content="Info@sribagavath.org"
                            href="mailto:Info@sribagavath.org"
                        />

                        <ContactItem
                            icon={Phone}
                            content="+91 99942-05880"
                            href="tel:+919994205880"
                        />
                        <ContactItem
                            icon={Phone}
                            content="+91 94432-90559, +91 97891-65555"
                        />

                        <ContactItem
                            icon={Globe}
                            content="sribagavath.com"
                            href="https://sribagavath.com/"
                        />

                        <ContactItem
                            icon={MapPin}
                            content="View on Google Maps"
                            href="https://maps.app.goo.gl/RxVQ3nqtvuk84UWs8"
                        />

                        <ContactItem
                            icon={Home}
                            content="Sri Bagavath Mission, 31, Ramalingasamy Street, Ammapet, Salem - 636 003."
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Contact;
