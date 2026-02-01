import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, IndianRupee, ChevronLeft } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import PageHeader from '../components/PageHeader';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const donationOptions = [
    { id: 'don_1', title: 'Donation - ₹1000', price: 1000, category: 'General' },
    { id: 'don_2', title: 'Donation - ₹2000', price: 2000, category: 'General' },
    { id: 'don_3', title: 'Donation - ₹5000', price: 5000, category: 'General' },
    { id: 'don_custom', title: 'Custom Donation', price: 0, category: 'General', isCustom: true }
];

const Donations = () => {
    const navigate = useNavigate();
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const { onlineTransactionsEnabled } = useGlobalSettings();

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

    const handleProceed = async (option) => {
        const amount = option.isCustom ? parseInt(customAmount) : option.price;
        if (!amount || amount <= 0) {
            alert("Please enter a valid donation amount.");
            return;
        }

        if (await ensureAuth()) {
            navigate('/bookstore-checkout', {
                state: {
                    cart: { [option.id]: 1 },
                    totalPrice: amount,
                    items: [{ ...option, price: amount, quantity: 1 }],
                    isDonation: true
                }
            });
        }
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '40px' }}>
            <PageHeader title="Donations" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0', gap: '8px' }}>
                <button
                    onClick={() => navigate('/my-donations')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#374151'
                    }}
                >
                    <Heart size={20} />
                    My Donations
                </button>
            </div>

            <div style={{ padding: '24px 16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Heart size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Support Our Mission</h2>
                    <p style={{ color: '#6b7280', marginTop: '8px', lineHeight: 1.5 }}>
                        Your contributions help us reach more people and spread spiritual awareness.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {donationOptions.map(option => (
                        <motion.div
                            key={option.id}
                            whileHover={onlineTransactionsEnabled ? { scale: 1.01 } : {}}
                            whileTap={onlineTransactionsEnabled ? { scale: 0.99 } : {}}
                            onClick={() => {
                                if (onlineTransactionsEnabled) setSelectedAmount(option.id);
                            }}
                            style={{
                                padding: '16px',
                                backgroundColor: onlineTransactionsEnabled ? 'white' : '#f3f4f6',
                                borderRadius: '12px',
                                border: selectedAmount === option.id ? '2px solid var(--color-primary)' : '1px solid #e5e7eb',
                                cursor: onlineTransactionsEnabled ? 'pointer' : 'default',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: selectedAmount === option.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                opacity: onlineTransactionsEnabled ? 1 : 0.7
                            }}
                        >
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827' }}>{option.title}</h3>
                                {option.isCustom && selectedAmount === option.id && (
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            marginTop: '12px',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            width: '100%',
                                            fontSize: '1rem'
                                        }}
                                    />
                                )}
                            </div>
                            {!option.isCustom && (
                                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-primary)' }}>₹{option.price}</span>
                            )}
                        </motion.div>
                    ))}
                </div>

                {!onlineTransactionsEnabled && (
                    <div style={{
                        marginTop: '32px',
                        padding: '16px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600, fontSize: '1rem' }}>
                            To make donations please contact 7904118421
                        </p>
                    </div>
                )}

                {onlineTransactionsEnabled && (
                    <button
                        onClick={() => {
                            const option = donationOptions.find(o => o.id === selectedAmount);
                            if (option) handleProceed(option);
                            else alert("Please select a donation amount.");
                        }}
                        disabled={authLoading}
                        style={{
                            width: '100%',
                            marginTop: '32px',
                            padding: '16px',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            cursor: authLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                    >
                        {authLoading ? 'Signing in...' : 'Proceed to Donate'}
                    </button>
                )}

                <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '0.875rem' }}>
                    Transactions are secure and handled via UPI.
                </p>
            </div>
        </div>
    );
};

export default Donations;
