import { motion } from 'framer-motion';

const About = () => {
    return (
        <div className="min-h-screen bg-surface p-6">
            <div className="max-w-2xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl p-8 shadow-sm"
                    style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                >
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        <div style={{
                            width: '10rem',
                            height: '10rem',
                            margin: '0 auto 1.5rem auto',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            border: '4px solid var(--color-primary)',
                            boxShadow: 'var(--shadow-md)',
                            backgroundColor: 'var(--color-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img
                                src="/images/bagavath_ayya.png"
                                alt="Bagavath Ayya"
                                loading="lazy"
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
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '0.5rem' }}>Sri Bagavath</h1>
                        <div style={{ height: '4px', width: '5rem', backgroundColor: 'var(--color-primary)', margin: '0 auto', borderRadius: '9999px' }}></div>
                    </div>

                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                            The newly evolved, profound revelations of understanding by Shri Bagavath are for the 'Seekers of Truth'.
                        </p>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>
                            Sri Bagavath, our Satguru, defined enlightenment in the simplest way. He showed the right path to enlightenment and assured that anyone with the ability to understand can attain it.
                        </p>
                        <p style={{ fontSize: '1.125rem' }}>
                            Enlightenment is the only way to be liberated from our grief and sorrows. When the mind is liberated from sorrows, our energy is no longer wasted on inner turmoil. By conserving our energy, we can work more effectively in the outside world—where solutions to our real problems can be found.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default About;
