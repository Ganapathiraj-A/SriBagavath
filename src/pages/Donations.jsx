import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart, IndianRupee, ChevronLeft } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const donationOptions = [
    { id: 'don_1', title: 'Donation - ₹1000', price: 1000, category: 'General' },
    { id: 'don_2', title: 'Donation - ₹2000', price: 2000, category: 'General' },
    { id: 'don_3', title: 'Donation - ₹5000', price: 5000, category: 'General' },
    { id: 'don_custom', title: 'Custom Donation', price: 0, category: 'General', isCustom: true },

    // Annadhanam options (same as general as per request)
    { id: 'ann_1', title: 'Annadhanam - ₹1000', price: 1000, category: 'Annadhanam' },
    { id: 'ann_2', title: 'Annadhanam - ₹2000', price: 2000, category: 'Annadhanam' },
    { id: 'ann_3', title: 'Annadhanam - ₹5000', price: 5000, category: 'Annadhanam' },
    { id: 'ann_custom', title: 'Custom Annadhanam', price: 0, category: 'Annadhanam', isCustom: true },

    // Membership options
    { id: 'mem_annual', title: 'Annual Member', price: 10000, category: 'Membership' },
    { id: 'mem_founder', title: 'Founder Member', price: 25000, category: 'Membership' }
];

const Donations = () => {
    const navigate = useNavigate();
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('General');
    const { onlineTransactionsEnabled } = useGlobalSettings();

    const tabs = ['General', 'Annadhanam', 'Membership'];

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

    const filteredOptions = donationOptions.filter(o => o.category === activeTab);

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
                        borderRadius: '0.875rem',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#374151',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                    }}
                >
                    <Heart size={18} />
                    My Donations
                </button>
            </div>

            <div style={{ padding: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: '#fee2e2',
                        color: '#ef4444',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                    }}>
                        <Heart size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0 }}>Support Our Mission</h2>
                    <p style={{ color: '#6b7280', marginTop: '6px', fontSize: '0.9rem', lineHeight: 1.4 }}>
                        Your contributions help us reach more people and spread spiritual awareness.
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '4px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '0.875rem',
                    marginBottom: '24px'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                setSelectedAmount(null);
                                setCustomAmount('');
                            }}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: '0.75rem',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                backgroundColor: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? '#111827' : '#6b7280',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: activeTab === tab ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredOptions.map(option => (
                        <motion.div
                            key={option.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={onlineTransactionsEnabled ? { scale: 1.01, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' } : {}}
                            whileTap={onlineTransactionsEnabled ? { scale: 0.99 } : {}}
                            onClick={() => {
                                if (onlineTransactionsEnabled) setSelectedAmount(option.id);
                            }}
                            style={{
                                padding: '1.25rem',
                                backgroundColor: onlineTransactionsEnabled ? 'white' : '#f3f4f6',
                                borderRadius: '1rem',
                                border: selectedAmount === option.id ? '2px solid var(--color-primary)' : '1px solid #e5e7eb',
                                cursor: onlineTransactionsEnabled ? 'pointer' : 'default',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                opacity: onlineTransactionsEnabled ? 1 : 0.7
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{option.title}</h3>
                                {option.isCustom && selectedAmount === option.id && (
                                    <input
                                        type="number"
                                        placeholder="Enter amount"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            marginTop: '12px',
                                            padding: '10px',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #e5e7eb',
                                            width: '100%',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        autoFocus
                                    />
                                )}
                            </div>
                            {!option.isCustom && (
                                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)', marginLeft: '1rem' }}>
                                    ₹{option.price.toLocaleString()}
                                </span>
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
                        borderRadius: '0.875rem',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600, fontSize: '0.95rem' }}>
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
                            borderRadius: '0.875rem',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: authLoading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {authLoading ? 'Signing in...' : 'Proceed to Donate'}
                    </button>
                )}

                <p style={{ textAlign: 'center', marginTop: '20px', color: '#6b7280', fontSize: '0.8rem' }}>
                    Transactions are secure and handled via UPI.
                </p>
            </div>
        </div>
    );
};

export default Donations;
