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
                    <div style={{ marginTop: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                        <div style={{
                            width: '10rem',
                            height: '10rem',
                            margin: '0 auto 1.5rem auto',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            border: '4px solid white',
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

                    <div style={{ margin: '1rem 0 2rem 0', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-md)', backgroundColor: '#000', aspectRatio: '16/9' }}>
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/0m2EStUNTqc"
                            title="Ayya Intro"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: 'none' }}
                        ></iframe>
                    </div>

                </motion.div>
            </div>
        </div>
    );
};

export default About;
