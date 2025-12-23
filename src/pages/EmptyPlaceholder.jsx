import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const EmptyPlaceholder = ({ title }) => {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title={title}
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{
                padding: '3rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '1rem'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af',
                    marginBottom: '1rem'
                }}>
                    <Info size={48} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>Coming Soon</h2>
                <p style={{ color: '#6b7280', maxWidth: '20rem' }}>
                    We haven't scheduled any upcoming {title} yet. Please check back later!
                </p>

                <button
                    onClick={() => navigate(-1)}
                    style={{
                        marginTop: '1.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Back to Categories
                </button>
            </div>
        </div>
    );
};

export default EmptyPlaceholder;
