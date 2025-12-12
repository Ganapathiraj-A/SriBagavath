import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, BookOpen, Video, Mail, Settings } from 'lucide-react';

const MenuButton = ({ title, icon: Icon, path, delay }) => {
    const navigate = useNavigate();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(path)}
            style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: '#fff7ed',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={24} color="var(--color-primary)" />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: '#1f2937' }}>{title}</span>
        </motion.button>
    );
};

const Home = () => {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: '28rem' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '8rem',
                        height: '8rem',
                        margin: '0 auto 1.5rem auto',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                        border: '4px solid white',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#e5e7eb',
                        position: 'relative'
                    }}>
                        <img
                            src="/images/bagavath_ayya.png"
                            alt="Bagavath Ayya"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/150?text=Bagavath+Ayya';
                            }}
                        />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Sri Bagavath Mission</h1>
                    <p style={{ color: '#6b7280' }}>Welcome to the official app</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <MenuButton title="About Bagavath Ayya" icon={User} path="/about" delay={0.1} />
                    <MenuButton title="Books & Media" icon={BookOpen} path="/books" delay={0.2} />
                    <MenuButton title="Programs" icon={Calendar} path="/programs" delay={0.4} />
                    <MenuButton title="Ayya's Schedule" icon={Calendar} path="/schedule" delay={0.45} />
                    <MenuButton title="Contact" icon={Mail} path="/contact" delay={0.5} />
                    <MenuButton title="Settings" icon={Settings} path="/configuration" delay={0.6} />
                </div>
            </motion.div>
        </div>
    );
};

export default Home;
