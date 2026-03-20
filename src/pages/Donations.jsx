import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
    { id: 'mem_monthly', title: 'Monthly Donation', price: 0, category: 'Membership', isMonthly: true },
    { id: 'mem_annual', title: 'Annual Member', price: 10000, category: 'Membership' },
    { id: 'mem_founder', title: 'Founder Member', price: 25000, category: 'Membership' }
];

const Donations = () => {
    const navigate = useNavigate();
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [monthlyAmount, setMonthlyAmount] = useState('1000');
    const [authLoading, setAuthLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('General');
    const { onlineTransactionsEnabled, offlineRegistrationContact } = useGlobalSettings();

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
        const amount = option.isCustom ? parseInt(customAmount) : (option.isMonthly ? parseInt(monthlyAmount) : option.price);
        if (!amount || amount <= 0) {
            alert("Please enter a valid donation amount.");
            return;
        }

        if (await ensureAuth()) {
            navigate('/bookstore-checkout', {
                state: {
                    cart: { [option.id]: 1 },
                    totalPrice: amount,
                    items: [{ ...option, title: option.isMonthly ? `Monthly Donation - ₹${amount}` : option.title, price: amount, quantity: 1 }],
                    isDonation: true
                }
            });
        }
    };

    const filteredOptions = donationOptions.filter(o => o.category === activeTab);

    return (
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', paddingBottom: '40px' }}>
            <PageHeader title="Donations" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0', gap: '8px' }}>
                <button
                    onClick={() => navigate('/my-donations')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.875rem',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        boxShadow: 'var(--shadow-sm)'
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
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--color-error)',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                    }}>
                        <Heart size={28} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Support Our Mission</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '6px', fontSize: '0.9rem', lineHeight: 1.4 }}>
                        Your contributions help us reach more people and spread spiritual awareness.
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '2rem',
                    marginBottom: '2rem',
                    borderBottom: '1px solid var(--color-border)',
                    padding: '0 1rem'
                }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    setSelectedAmount(null);
                                    setCustomAmount('');
                                }}
                                style={{
                                    padding: '0.75rem 0.25rem',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                }}
                            >
                                {tab}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabUnderline"
                                        style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            backgroundColor: 'var(--color-primary)',
                                            borderRadius: '99px'
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
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
                            data-testid={`donation-option-${option.id}`}
                            style={{
                                padding: '1.25rem',
                                backgroundColor: onlineTransactionsEnabled ? 'var(--color-card)' : 'var(--color-surface)',
                                borderRadius: '1rem',
                                border: selectedAmount === option.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                cursor: onlineTransactionsEnabled ? 'pointer' : 'default',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                opacity: onlineTransactionsEnabled ? 1 : 0.7
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{option.title}</h3>
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
                                            border: '1px solid var(--color-border)',
                                            width: '100%',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            backgroundColor: 'var(--color-surface)',
                                            color: 'var(--color-text)'
                                        }}
                                        autoFocus
                                    />
                                )}
                                {option.isMonthly && selectedAmount === option.id && (
                                    <select
                                        value={monthlyAmount}
                                        onChange={(e) => setMonthlyAmount(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            marginTop: '12px',
                                            padding: '10px',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--color-border)',
                                            width: '100%',
                                            fontSize: '0.925rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            backgroundColor: 'var(--color-surface)',
                                            color: 'var(--color-text)'
                                        }}
                                    >
                                        {[1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map(amt => (
                                            <option key={amt} value={amt}>₹{amt.toLocaleString()}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {!option.isCustom && !option.isMonthly && (
                                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)', marginLeft: '1rem' }}>
                                    ₹{option.price.toLocaleString()}
                                </span>
                            )}
                            {option.isMonthly && selectedAmount !== option.id && (
                                <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)', marginLeft: '1rem' }}>
                                    ₹{parseInt(monthlyAmount).toLocaleString()}+
                                </span>
                            )}
                        </motion.div>
                    ))}
                </div>

                {!onlineTransactionsEnabled && (
                    <div style={{
                        marginTop: '32px',
                        padding: '16px',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid var(--color-error)',
                        borderRadius: '0.875rem',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: 'var(--color-error)', fontWeight: 600, fontSize: '0.95rem' }}>
                            To make donations please contact {offlineRegistrationContact}
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
                        data-testid="donate-proceed"
                    >
                        {authLoading ? 'Signing in...' : 'Proceed to Donate'}
                    </button>
                )}

                <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    Transactions are secure and handled via UPI.
                </p>
            </div>
        </div>
    );
};

export default Donations;
