import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

const PROGRAM_TYPES = [
    'Gnana Muham',
    'Gnana Viduthalai Muham',
    'Dhyana Muham',
    "Ayya's Birthday"
];

const ProgramButton = ({ title, delay }) => {
    const navigate = useNavigate();
    // Create a URL-friendly slug from the title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-secondary)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/conversations/programs/${slug}`)}
            style={{
                width: '100%',
                padding: '1.5rem',
                backgroundColor: 'var(--color-card)',
                borderRadius: '0.75rem',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                textAlign: 'left',
                cursor: 'pointer'
            }}
        >
            <div style={{
                padding: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-primary-transparent)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Calendar size={24} />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
        </motion.button>
    );
};

const ProgramConversations = () => {
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
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--color-border)'
                    }}
                >
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '2rem', textAlign: 'center' }}>
                        Program Conversations
                    </h1>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {PROGRAM_TYPES.map((program, index) => (
                            <ProgramButton
                                key={program}
                                title={program}
                                delay={index * 0.1}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProgramConversations;
