import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, AlertCircle, Share2 } from 'lucide-react';
import BackButton from '../components/BackButton';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const Programs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    const viewingProgramId = searchParams.get('id');
    const viewingProgram = programs.find(p => p.id === viewingProgramId);

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const programsRef = collection(db, 'programs');
                const q = query(
                    programsRef,
                    where('programDate', '>=', today),
                    orderBy('programDate', 'asc')
                );

                const querySnapshot = await getDocs(q);
                const programsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setPrograms(programsList);
            } catch (error) {
                console.error("Error fetching programs: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrograms();
    }, []);

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert(`Copied ${text} to clipboard!`);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers or if clipboard API fails
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert(`Copied ${text} to clipboard!`);
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
            }
        }
    };

    const handleShare = async (program) => {
        if (!program) return;

        const shareData = {
            title: program.programName,
            text: `
*${program.programName}*

📅 *Date:* ${new Date(program.programDate).toLocaleDateString()} ${program.programEndDate ? `- ${new Date(program.programEndDate).toLocaleDateString()}` : ''}
📍 *City:* ${program.programCity}
🏢 *Venue:* ${program.programVenue}

${program.programDescription ? `📝 *Description:*\n${program.programDescription}\n` : ''}
${program.registrationStatus === 'Open' ? `✅ Registration Open until ${new Date(program.lastDateToRegister).toLocaleDateString()}` : '🚫 Registration Closed'}
            `.trim(),
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.text);
                alert('Program details copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading upcoming programs...</p>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--color-surface)',
            padding: '1.5rem'
        }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
                <BackButton />

                <AnimatePresence mode="wait">
                    {viewingProgram ? (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '1rem',
                                padding: '2rem',
                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <button
                                    onClick={() => setSearchParams({})}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: '#6b7280',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    ← Back to list
                                </button>
                                <button
                                    onClick={() => handleShare(viewingProgram)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: 'var(--color-primary)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0.5rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 500
                                    }}
                                    title="Share Program Details"
                                >
                                    <Share2 size={20} />
                                    Share
                                </button>
                            </div>

                            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '1.5rem' }}>
                                {viewingProgram.programName}
                            </h1>

                            <div style={{ display: 'grid', gap: '1.5rem', color: '#374151' }}>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                        Date & Time
                                    </span>
                                    <div style={{ fontSize: '1.125rem' }}>
                                        Start: {new Date(viewingProgram.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                        {viewingProgram.programEndDate && (
                                            <>
                                                {' '}- End: {new Date(viewingProgram.programEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                        Location
                                    </span>
                                    <div style={{ fontSize: '1.125rem' }}>
                                        {viewingProgram.programCity}
                                    </div>
                                    <div style={{ marginTop: '0.25rem', color: '#4b5563' }}>
                                        {viewingProgram.programVenue}
                                    </div>
                                </div>

                                {viewingProgram.programDescription && (
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                            Description
                                        </span>
                                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                            {viewingProgram.programDescription}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                                        Registration Details
                                    </span>
                                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                        <div>
                                            Status:{' '}
                                            <span style={{
                                                color: viewingProgram.registrationStatus === 'Open' ? '#059669' : '#dc2626',
                                                fontWeight: 500
                                            }}>
                                                {viewingProgram.registrationStatus}
                                            </span>
                                        </div>
                                        <div>
                                            Last Date: {new Date(viewingProgram.lastDateToRegister).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '2rem'
                            }}>
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '9999px',
                                    backgroundColor: '#fff7ed',
                                    color: 'var(--color-primary)',
                                    marginRight: '1rem'
                                }}>
                                    <Calendar size={28} />
                                </div>
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
                                    Upcoming Programs
                                </h1>
                            </div>

                            <div style={{
                                textAlign: 'center',
                                marginBottom: '2rem',
                                color: '#4b5563',
                                fontSize: '0.95rem'
                            }}>
                                For registration please contact{' '}
                                <button
                                    onClick={() => handleCopy('7904118421')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        padding: '0 0.25rem',
                                        fontSize: 'inherit',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    7904118421
                                </button>
                            </div>

                            {programs.length === 0 ? (
                                <div style={{
                                    backgroundColor: 'white',
                                    borderRadius: '1rem',
                                    padding: '3rem',
                                    textAlign: 'center',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                                }}>
                                    <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                                        No upcoming programs scheduled at the moment.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {programs.map((program, index) => (
                                        <motion.div
                                            key={program.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            style={{
                                                backgroundColor: 'white',
                                                borderRadius: '1rem',
                                                padding: '1.5rem',
                                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                border: '1px solid #f3f4f6'
                                            }}
                                        >
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    <h2 style={{
                                                        fontSize: '1.125rem',
                                                        fontWeight: 600,
                                                        color: '#111827',
                                                        margin: 0,
                                                        paddingRight: '0.5rem'
                                                    }}>
                                                        {program.programName}
                                                    </h2>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                        backgroundColor: program.registrationStatus === 'Open' ? '#ecfdf5' : '#fef2f2',
                                                        color: program.registrationStatus === 'Open' ? '#059669' : '#dc2626',
                                                        border: `1px solid ${program.registrationStatus === 'Open' ? '#a7f3d0' : '#fecaca'}`
                                                    }}>
                                                        {program.registrationStatus === 'Open' ? 'Registration Open' : 'Registration Closed'}
                                                    </span>
                                                </div>

                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: 'var(--color-primary)',
                                                    fontWeight: 500
                                                }}>
                                                    <Calendar size={16} style={{ marginRight: '0.5rem' }} />
                                                    {new Date(program.programDate).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginTop: '1rem',
                                                paddingTop: '1rem',
                                                borderTop: '1px solid #f3f4f6'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: '#4b5563',
                                                }}>
                                                    <MapPin size={18} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                                                    <span style={{ lineHeight: '1.5' }}>{program.programCity}</span>
                                                </div>

                                                {program.registrationStatus === 'Open' && (
                                                    <button
                                                        onClick={() => setSearchParams({ id: program.id })}
                                                        style={{
                                                            padding: '0.5rem 1rem',
                                                            backgroundColor: 'white',
                                                            color: '#374151',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '0.375rem',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Details
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Programs;
