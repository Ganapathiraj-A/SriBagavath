import React, { useState, useEffect } from 'react';
import { TransactionService } from '../services/TransactionService';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { LogIn } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const MyRegistrations = () => {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubAuth();
    }, []);

    const ensureAuth = async () => {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
            return true;
        }

        setAuthLoading(true);
        try {
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser?.authentication?.idToken;
            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return true;
        } catch (err) {
            console.error("Auth failed:", err);
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            console.log("MyRegs Stream Data:", data?.length); // Debug
            setRegistrations(data || []);
            setLoading(false);
        });

        const fetchPrograms = async () => {
            try {
                const { collection, getDocs } = await import('firebase/firestore');
                const { db } = await import('../firebase');
                const snapshot = await getDocs(collection(db, 'programs'));
                const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllPrograms(progs);
            } catch (e) {
                console.error("Failed to fetch programs", e);
            }
        };
        fetchPrograms();

        return () => unsubscribe();
    }, []);

    const getProgramDetails = (tx) => {
        // First try by ID (Exact Match)
        if (tx.programId) {
            const match = allPrograms.find(p => p.id === tx.programId);
            if (match) {
                return {
                    id: match.id,
                    date: match.programDate,
                    city: match.programCity
                };
            }
            // If we have an ID but it's not in our list (maybe deleted?), return what we have
            return { id: tx.programId, date: "", city: "" };
        }

        // Fallback: Name Match (for Old Registrations)
        // Relaxed match: Check if itemName includes programName or vice versa to handle suffixes like "(Dec 20..)"
        const match = allPrograms.find(p => {
            const txName = (tx.itemName || "").toLowerCase().trim().replace(/\s+/g, ' ');
            const progName = (p.programName || "").toLowerCase().trim().replace(/\s+/g, ' ');

            // Exact match or contains
            return txName === progName ||
                txName.includes(progName) ||
                progName.includes(txName);
        });
        if (match) {
            return {
                id: match.id, // Found the ID!
                date: tx.programDate || match.programDate,
                city: tx.programCity || match.programCity
            };
        }

        // Final fallback: just display data if we have it, but no link possible
        if (tx.programDate && tx.programCity) {
            return { id: null, date: tx.programDate, city: tx.programCity };
        }

        return { id: null, date: "", city: "" };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'BNK_VERIFIED': return 'green'; // Green for Verified
            case 'REGISTERED': return 'green';
            case 'PENDING': return 'orange';
            case 'REJECTED': return 'red';
            default: return 'gray';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return "";
        // Handle Firestore Timestamp or Date
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString();
    };

    const formatProgramDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title="My Registrations" />

            <div className="product-list" style={{ marginTop: '16px', padding: '16px' }}>
                {!currentUser || currentUser.isAnonymous ? (
                    <div style={{
                        textAlign: 'center',
                        marginTop: '60px',
                        padding: '30px',
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        maxWidth: '400px',
                        margin: '60px auto'
                    }}>
                        <div style={{
                            backgroundColor: '#fff7ed',
                            width: '64px',
                            height: '64px',
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <LogIn size={32} color="#f97316" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Sign in Required</h2>
                        <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>
                            Please sign in with your Google account to view your program registrations.
                        </p>
                        <button
                            onClick={ensureAuth}
                            disabled={authLoading}
                            style={{
                                width: '100%',
                                backgroundColor: '#f97316',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                height: '48px',
                                fontWeight: 600,
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {authLoading ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                    </div>
                ) : (
                    <>
                        {loading && <p>Loading...</p>}
                        {!loading && registrations.length === 0 && <p>You have no program registrations yet.</p>}

                        {registrations.map(tx => {
                            const details = getProgramDetails(tx);
                            return (
                                <div key={tx.id} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '16px' }}>
                                                {tx.itemName}
                                                {details.date && (
                                                    <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#555', marginLeft: '6px' }}>
                                                        ({formatProgramDate(details.date)}{details.city ? ` - ${details.city}` : ''})
                                                    </span>
                                                )}
                                            </h3>
                                        </div>
                                        <span style={{
                                            color: getStatusColor(tx.status),
                                            fontWeight: 'bold',
                                            fontSize: '12px',
                                            background: '#f3f4f6',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            height: 'fit-content',
                                            whiteSpace: 'nowrap',
                                            marginLeft: '8px'
                                        }}>
                                            {tx.status === 'BNK_VERIFIED' ? 'COMPLETED' : tx.status}

                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#666' }}>
                                        <span>{formatDate(tx.timestamp)}</span>
                                        <span style={{ fontWeight: 'bold' }}>₹{tx.amount}</span>
                                    </div>
                                    {/* Show Participant count if available */}
                                    {
                                        tx.participantCount && (
                                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                                                Participants: {tx.participantCount}
                                            </div>
                                        )
                                    }

                                    {/* Participants List */}
                                    {
                                        tx.participants && tx.participants.length > 0 && (
                                            <div style={{ marginTop: '8px', fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                                <strong>Participant Details:</strong>
                                                {tx.participants.map((p, idx) => (
                                                    <div key={idx} style={{ marginLeft: '8px' }}>
                                                        {idx + 1}. {p.name} ({p.gender}, {p.age}) - {p.accommodation}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }

                                    {/* OCR Text Removed per user request */}

                                    {/* Link to Program Details */}
                                    {
                                        (tx.programId || details.id) && (
                                            <button
                                                className="btn-secondary"
                                                onClick={() => navigate(`/programs?id=${tx.programId || details.id}`)}
                                                style={{ marginTop: '12px', width: '100%', fontSize: '14px', padding: '8px' }}
                                            >
                                                View Program Details
                                            </button>
                                        )
                                    }
                                </div>
                            )
                        })}
                    </>
                )}
            </div>
        </div >
    );
};

export default MyRegistrations;
