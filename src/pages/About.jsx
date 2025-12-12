import React from 'react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

const About = () => {
    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-2xl mx-auto">
                <BackButton />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-8 shadow-sm"
                >
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <div style={{
                            width: '10rem',
                            height: '10rem',
                            margin: '0 auto 1.5rem auto',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            border: '4px solid #fed7aa',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            backgroundColor: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img
                                src="/images/bagavath_ayya.png"
                                alt="Bagavath Ayya"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    objectPosition: 'center'
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/200?text=Bagavath+Ayya';
                                }}
                            />
                        </div>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Sri Bagavath</h1>
                        <div style={{ height: '4px', width: '5rem', backgroundColor: 'var(--color-primary)', margin: '0 auto', borderRadius: '9999px' }}></div>
                    </div>

                    <div style={{ textAlign: 'center', color: '#6b7280', lineHeight: '1.75' }}>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                            <strong style={{ color: 'var(--color-primary-dark)' }}>SRI BAGAVATH</strong> Completely newly evolved shining revelations of understanding by Shri Bagavath, are for the ‘Seekers of Truth’.
                        </p>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                            Sri Bagavath, our Satguru defined enlightenment in the simplest way. He showed the right way to attain enlightenment. He assured that any one can get enlightenment who has the ability to understand.
                        </p>
                        <p style={{ fontSize: '1.125rem' }}>
                            Enlightenment is the only way to get liberated from our grief and sorrows. When the mind is liberated from the sorrows, our energy does not go waste in the turmoil within our mind. We save more energy, so that we can work effectively in the outside world – where real the solutions to our real problems can be found.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
