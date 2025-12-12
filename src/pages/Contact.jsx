import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import BackButton from '../components/BackButton';

const ContactItem = ({ icon: Icon, title, content, href }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        backgroundColor: 'var(--color-surface)',
        transition: 'background-color 0.2s',
        textAlign: 'center'
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <h3 style={{ fontWeight: 500, color: '#111827', marginBottom: '0.25rem' }}>{title}</h3>
            {href ? (
                <a href={href} style={{ color: '#6b7280', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                >
                    {content}
                </a>
            ) : (
                <p style={{ color: '#6b7280', margin: 0 }}>{content}</p>
            )}
        </div>
    </div>
);

const Contact = () => {
    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-2xl mx-auto">
                <BackButton />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-sm"
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>Contact Us</h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <ContactItem
                            icon={Mail}
                            title="Email"
                            content="Info@sribagavath.org"
                            href="mailto:Info@sribagavath.org"
                        />

                        <ContactItem
                            icon={Phone}
                            title="Phone"
                            content="+91 99942-05880"
                            href="tel:+919994205880"
                        />
                        <ContactItem
                            icon={Phone}
                            title="Additional Numbers"
                            content="+91 94432-90559, +91 97891-65555"
                        />

                        <ContactItem
                            icon={Globe}
                            title="Website"
                            content="www.sribagavath.org"
                            href="https://www.sribagavath.org"
                        />

                        <ContactItem
                            icon={MapPin}
                            title="Address"
                            content="Sri Bagavath Mission, 31, Ramalingasamy Street, Ammapet, Salem - 636 003."
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Contact;
