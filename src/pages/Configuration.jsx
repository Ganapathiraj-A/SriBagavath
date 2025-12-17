import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, Code } from 'lucide-react';

const ConfigButton = ({ title, icon: Icon, path, delay }) => {
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

const Configuration = () => {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '28rem', margin: '0 auto' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem', textAlign: 'center' }}>
                        Admin
                    </h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <ConfigButton title="Program" icon={Calendar} path="/program" delay={0.1} />
                        <ConfigButton title="Program Types" icon={Code} path="/configuration/program-types" delay={0.15} />
                        <ConfigButton title="Ayya's Schedule" icon={Calendar} path="/schedule/manage" delay={0.2} />
                        <ConfigButton title="Registration" icon={Shield} path="/admin-review" delay={0.2} />
                        {/* <ConfigButton title="Developer" icon={Code} path="/developer" delay={0.3} /> */}

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Configuration;
