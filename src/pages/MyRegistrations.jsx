import React, { useState, useEffect } from 'react';
import { TransactionService } from '@/services/TransactionService';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { LogIn } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';

const MyRegistrations = () => {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [viewingImage, setViewingImage] = useState(null);

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
            await ensureGoogleAuthInitialized();

            let idToken = null;
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                return true;
            }

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
                const { collection, getDocsCacheFirst } = await import('@/utils/FirestoreProxy');
                const { db } = await import('../firebase');
                const snapshot = await getDocsCacheFirst(collection(db, 'programs'));
                const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllPrograms(progs);
            } catch (_err) {
                console.error("Failed to fetch programs", _err);
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
            case 'COMPLETED': return 'green'; // Green for Verified
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

    const handleViewReceipt = async (id, utr) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage({ base64, utr });
            } else {
                alert("No receipt image found for this registration.");
            }
        } catch (_err) {
            console.error("Error fetching receipt:", _err);
            alert("Error loading receipt.");
        }
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

                        {/* Receipt Modal */}
                        {viewingImage && (
                            <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1000 }}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '15px',
                                    background: 'white',
                                    padding: '15px',
                                    borderRadius: '16px',
                                    maxWidth: '90%',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '18px' }}>Payment Receipt</h2>
                                            {viewingImage.utr && <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>UTR: {viewingImage.utr}</div>}
                                        </div>
                                        <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                            <LogIn size={24} color="#666" style={{ transform: 'rotate(90deg)' }} onClick={() => setViewingImage(null)} />
                                        </button>
                                    </div>
                                    <img
                                        src={`data:image/jpeg;base64,${viewingImage.base64}`}
                                        alt="Receipt"
                                        style={{ width: '100%', borderRadius: '8px', maxHeight: '65vh', objectFit: 'contain', border: '1px solid #eee' }}
                                    />
                                    <button
                                        className="btn-primary"
                                        onClick={() => setViewingImage(null)}
                                        style={{ width: '100%', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', height: '48px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

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
                                            {tx.status === 'COMPLETED' ? 'COMPLETED' : tx.status}

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
                                                        {idx + 1}. {p.name} ({p.gender}, {p.age})
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }

                                    {/* Additional Options */}
                                    {
                                        tx.selectedOptions && tx.selectedOptions.length > 0 && (
                                            <div style={{ marginTop: '8px', fontSize: '13px', background: '#eff6ff', padding: '8px', borderRadius: '4px', border: '1px solid #dbeafe' }}>
                                                <strong style={{ color: '#1e40af' }}>Additional Options:</strong>
                                                {tx.selectedOptions.map((opt, idx) => (
                                                    <div key={idx} style={{ marginLeft: '8px', display: 'flex', justifyContent: 'space-between', color: '#1e40af' }}>
                                                        <span>{opt.name}</span>
                                                        <span>₹{opt.fee}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }

                                    {/* OCR Text Removed per user request */}

                                    {/* Link to Program Details */}
                                    {
                                        (tx.programId || details.id) && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => navigate(`/programs/retreat?id=${tx.programId || details.id}`)}
                                                    style={{ flex: 1, fontSize: '14px', padding: '8px' }}
                                                >
                                                    View Details
                                                </button>
                                                {tx.hasImage && (
                                                    <button
                                                        className="btn-secondary"
                                                        onClick={() => handleViewReceipt(tx.id, tx.utr)}
                                                        style={{ flex: 1, fontSize: '14px', padding: '8px', border: '1px solid #ddd', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                                    >
                                                        Verify Receipt
                                                    </button>
                                                )}
                                            </div>
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
