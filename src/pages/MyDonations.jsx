import { useState, useEffect } from 'react';
import { TransactionService } from '@/services/TransactionService';
import PageHeader from '@/components/PageHeader';
import { normalizeImageSrc } from '@/utils/imageUtils';
import LazyImage from '@/components/LazyImage';
import { LogIn, Receipt, X } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';

const MyDonations = () => {
    const [donations, setDonations] = useState([]);
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

    const handleViewReceipt = async (donation) => {
        try {
            const base64 = donation.imageUrl || await TransactionService.getImage(donation.id);
            if (base64) {
                setViewingImage({ base64, utr: donation.utr });
            } else {
                alert("No receipt image found for this donation.");
            }
        } catch (_err) {
            console.error("Error fetching receipt:", _err);
            alert("Error loading receipt.");
        }
    };

    useEffect(() => {
        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            const donationList = (data || []).filter(tx => tx.itemType === 'DONATION');
            setDonations(donationList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return '#16a34a';
            case 'PROCESSING': return '#2563eb';
            case 'PENDING': return '#f59e0b';
            case 'REJECTED': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title="My Donations" />

            <div style={{ padding: '16px', maxWidth: '32rem', margin: '0 auto' }}>
                {!currentUser || currentUser.isAnonymous ? (
                    <div style={{
                        textAlign: 'center',
                        marginTop: '60px',
                        padding: '30px',
                        backgroundColor: 'var(--color-card)',
                        borderRadius: '20px',
                        boxShadow: 'var(--shadow-md)',
                        maxWidth: '400px',
                        margin: '60px auto',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <LogIn size={32} color="#10b981" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>Sign in Required</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '15px' }}>
                            Please sign in with your Google account to view your past donations.
                        </p>
                        <button
                            onClick={ensureAuth}
                            disabled={authLoading}
                            style={{
                                width: '100%',
                                backgroundColor: '#10b981',
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
                        {loading && (
                            <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--color-text-muted)' }}>
                                Loading Donations...
                            </div>
                        )}

                        {!loading && donations.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                marginTop: '60px',
                                padding: '24px',
                                backgroundColor: 'var(--color-card)',
                                borderRadius: '16px',
                                border: '2px dashed var(--color-border)'
                            }}>
                                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>You haven&apos;t made any donations yet.</p>
                            </div>
                        )}

                        {/* Receipt Modal */}
                        {viewingImage && (
                            <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1000 }}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '15px',
                                    background: 'var(--color-card)',
                                    padding: '15px',
                                    borderRadius: '16px',
                                    maxWidth: '90%',
                                    boxShadow: 'var(--shadow-lg)',
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>Donation Receipt</h2>
                                            {viewingImage.utr && <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>UTR: {viewingImage.utr}</div>}
                                        </div>
                                        <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                            <X size={24} color="var(--color-text-muted)" />
                                        </button>
                                    </div>
                                    <LazyImage
                                        src={viewingImage.base64}
                                        alt="Receipt"
                                        style={{ width: '100%', borderRadius: '8px', maxHeight: '65vh', objectFit: 'contain', border: '1px solid var(--color-border)' }}
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

                        {donations.map(donation => (
                            <div key={donation.id} className="card" style={{
                                marginBottom: '16px',
                                backgroundColor: 'var(--color-card)',
                                padding: '20px',
                                borderRadius: '16px',
                                boxShadow: 'var(--shadow-sm)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                                            {formatDate(donation.timestamp)}
                                        </span>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text)' }}>
                                            {donation.itemName || 'General Donation'}
                                        </h3>
                                    </div>
                                    <span style={{
                                        color: 'white',
                                        backgroundColor: getStatusColor(donation.status),
                                        fontWeight: '700',
                                        fontSize: '10px',
                                        textTransform: 'uppercase',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                    }}>
                                        {donation.status === 'COMPLETED' ? 'COMPLETED' : donation.status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Amount Paid</span>
                                        <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>₹{donation.amount}</span>
                                    </div>
                                    {donation.hasImage && (
                                        <div
                                            onClick={() => handleViewReceipt(donation)}
                                            style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '8px', borderRadius: '8px', backgroundColor: 'var(--color-primary-transparent)' }}
                                        >
                                            <Receipt size={16} /> View Receipt
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div >
    );
};

export default MyDonations;
