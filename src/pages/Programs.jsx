import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, AlertCircle, Share2 } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

import '../components/RegistrationStyles.css';

const Programs = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [specificProgram, setSpecificProgram] = useState(null); // Separate state for linked program
    const [loading, setLoading] = useState(true);
    const [specificLoading, setSpecificLoading] = useState(false);


    const viewingProgramId = searchParams.get('id');
    // Prioritize specificProgram if available, otherwise look in the main list
    const viewingProgram = specificProgram || programs.find(p => p.id === viewingProgramId);

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

    // Specific Fetch for "View Details" (independent of main list)
    useEffect(() => {
        const fetchSpecificProgram = async () => {
            if (!viewingProgramId) {
                setSpecificProgram(null);
                setSpecificLoading(false);
                return;
            }

            setSpecificLoading(true);

            // If already in main list, we don't need to fetch
            if (programs.find(p => p.id === viewingProgramId)) {
                setSpecificLoading(false);
                return;
            }

            // If we already fetched it, don't refetch
            if (specificProgram && specificProgram.id === viewingProgramId) {
                setSpecificLoading(false);
                return;
            }

            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const programRef = doc(db, 'programs', viewingProgramId);
                const snap = await getDoc(programRef);
                if (snap.exists()) {
                    setSpecificProgram({ id: snap.id, ...snap.data() });
                }
            } catch (e) {
                console.error("Failed to fetch specific program", e);
            } finally {
                setSpecificLoading(false);
            }
        };
        fetchSpecificProgram();
    }, [viewingProgramId, programs, specificProgram]);



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

    const handleShareBanner = async (program) => {
        if (!program || !program.programBanner) {
            alert('No banner available for this program.');
            return;
        }

        try {
            const base64Data = program.programBanner;
            // Extract base64 part if it contains data prefix
            const cleanBase64 = base64Data.split(',')[1] || base64Data;
            const fileName = `banner_${Date.now()}.jpg`;

            // Write to cache directory (temporary file)
            const result = await Filesystem.writeFile({
                path: fileName,
                data: cleanBase64,
                directory: Directory.Cache
            });

            // Share the file URI
            await Share.share({
                title: program.programName,
                // text: `Check out this program: ${program.programName}`, // REMOVED as per request
                files: [result.uri]
            });
        } catch (error) {
            console.error('Error sharing banner:', error);
            // Fallback to clipboard if sharing fails
            try {
                await navigator.clipboard.writeText(program.programBanner);
                alert('Sharing failed. Banner URL copied to clipboard.');
            } catch (e) {
                alert('Sharing failed completely. ' + error.message);
            }
        }
    };

    const handleShare = async (program) => {
        if (!program) return;

        const text = `
*${program.programName}*

📅 *Date:* ${new Date(program.programDate).toLocaleDateString()} ${program.programEndDate ? `- ${new Date(program.programEndDate).toLocaleDateString()}` : ''}

📍 *City:* ${program.programCity}

🏢 *Venue:* ${program.programVenue}

${program.programDescription ? `📝 *Description:*\n${program.programDescription}\n\n` : ''}${program.registrationStatus === 'Open' ? `✅ Registration Open until ${new Date(program.lastDateToRegister).toLocaleDateString()}` : '🚫 Registration Closed'}
        `.trim();

        try {
            await Share.share({
                title: program.programName,
                text: text,
            });
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to clipboard
            try {
                await navigator.clipboard.writeText(text + '\n\n' + window.location.href);
                alert('Program details copied to clipboard!');
            } catch (clipError) {
                console.error('Clipboard fallback failed', clipError);
            }
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

    if (specificLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading program details...</p>
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
                            {/* Image First */}
                            {viewingProgram.programBanner && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <img
                                        src={viewingProgram.programBanner}
                                        alt="Program Banner"
                                        style={{
                                            width: '100%',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                    />
                                </div>
                            )}


                            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => handleShare(viewingProgram)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: '1px solid var(--color-primary)',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                        title="Share Text"
                                    >
                                        <Share2 size={16} />
                                        Text
                                    </button>
                                    <button
                                        onClick={() => handleShareBanner(viewingProgram)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                        title="Share Banner"
                                    >
                                        <Share2 size={16} />
                                        Banner
                                    </button>
                                </div>

                            </div>

                            {/* Details Section - Logic: Show ONLY if no banner */}
                            {!viewingProgram.programBanner && (
                                <div style={{ display: 'grid', gap: '1.5rem', color: '#374151' }}>
                                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                                        {viewingProgram.programName}
                                        {viewingProgram.programDate && (
                                            <span style={{ fontSize: '1.25rem', fontWeight: 'normal', color: '#555', marginLeft: '8px' }}>
                                                ({new Date(viewingProgram.programDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                {viewingProgram.programCity ? ` - ${viewingProgram.programCity}` : ''})
                                            </span>
                                        )}
                                    </h1>
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
                            )}
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
                                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827' }}>
                                    Upcoming Programs
                                </h1>
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <button
                                    onClick={() => navigate('/my-registrations')}
                                    className="btn-primary"
                                    style={{
                                        width: 'auto', // Override 100% width
                                        padding: '10px 24px'
                                    }}
                                >
                                    My Registrations
                                </button>
                            </div>

                            <div style={{
                                textAlign: 'center',
                                marginBottom: '2rem',
                                color: '#4b5563',
                                fontSize: '0.95rem'
                            }}>
                                For registration queries please contact{' '}
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
                                                border: '1px solid #f3f4f6',
                                                cursor: program.registrationStatus === 'Open' ? 'pointer' : 'default'
                                            }}
                                            onClick={() => {
                                                if (program.registrationStatus === 'Open') {
                                                    setSearchParams({ id: program.id });
                                                }
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

                                                    {program.registrationStatus === 'Open' ? (
                                                        <button
                                                            onClick={() => navigate('/event-registration', { state: { program } })}
                                                            className="btn-primary"
                                                            style={{
                                                                width: 'auto',
                                                                padding: '0.5rem 1rem',
                                                                fontSize: '0.875rem',
                                                                borderRadius: '20px' // Match other buttons
                                                            }}
                                                        >
                                                            Register Now
                                                        </button>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 500,
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                            backgroundColor: '#fef2f2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fecaca'
                                                        }}>
                                                            Registration Closed
                                                        </span>
                                                    )}
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
                                                    <div style={{ padding: '0.5rem' }}></div>
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
