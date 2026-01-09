import React, { useState, useEffect } from 'react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import { LogIn } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const MyDonations = () => {
    const [donations, setDonations] = useState([]);
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
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title="My Donations" />

            <div style={{ padding: '16px', maxWidth: '32rem', margin: '0 auto' }}>
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
                            backgroundColor: '#ecfdf5',
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
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Sign in Required</h2>
                        <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>
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
                            <div style={{ textAlign: 'center', marginTop: '40px', color: '#6b7280' }}>
                                Loading Donations...
                            </div>
                        )}

                        {!loading && donations.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                marginTop: '60px',
                                padding: '24px',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                border: '2px dashed #e5e7eb'
                            }}>
                                <p style={{ color: '#6b7280', margin: 0 }}>You haven't made any donations yet.</p>
                            </div>
                        )}

                        {donations.map(donation => (
                            <div key={donation.id} className="card" style={{
                                marginBottom: '16px',
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '16px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                            {formatDate(donation.timestamp)}
                                        </span>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                                            General Donation
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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                                    <span style={{ color: '#4b5563', fontSize: '14px' }}>Amount Paid</span>
                                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>₹{donation.amount}</span>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default MyDonations;
