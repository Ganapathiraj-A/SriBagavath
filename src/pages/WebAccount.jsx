import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '../context/AdminAuthContext';
import WebMyRegistrations from './WebMyRegistrations';
import MyOrders from './MyOrders';
import MyDonations from './MyDonations';
import { ShoppingBag, BookOpen, Heart, User, LogIn } from 'lucide-react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import './WebPages.css';

const WebAccount = () => {
    const { user, loading: authLoading } = useAdminAuth();
    const [activeTab, setActiveTab] = useState('registrations');
    const [isSigningIn, setIsSigningIn] = useState(false);

    const tabs = [
        { id: 'registrations', name: 'My Registrations', icon: <BookOpen size={20} />, component: WebMyRegistrations },
        { id: 'orders', name: 'My Orders', icon: <ShoppingBag size={20} />, component: MyOrders },
        { id: 'donations', name: 'My Donations', icon: <Heart size={20} />, component: MyDonations }
    ];

    const handleSignIn = async () => {
        setIsSigningIn(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Sign in failed:", error);
            alert("Sign in failed. Please try again.");
        } finally {
            setIsSigningIn(false);
        }
    };

    if (authLoading) {
        return (
            <div className="web-account-page">
                <div className="web-container">
                    <div className="web-loading-state">
                        <div className="spinner"></div>
                        <p>Verifying Account...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || user.isAnonymous) {
        return (
            <div className="web-account-page">
                <div className="web-container">
                    <div className="emedia-header-spacer" />
                    <div className="web-no-results" style={{ padding: '60px 20px', backgroundColor: 'var(--color-card)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="no-results-icon" style={{ backgroundColor: 'var(--color-primary-transparent)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
                            <User size={48} color="var(--color-primary)" />
                        </div>
                        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>My Account</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', fontSize: '18px', maxWidth: '500px', margin: '0 auto 32px' }}>
                            Sign in to view your registrations, orders, and donations in one place.
                        </p>
                        <button 
                            className="program-btn primary" 
                            onClick={handleSignIn}
                            disabled={isSigningIn}
                            style={{ padding: '12px 32px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto' }}
                        >
                            {isSigningIn ? <div className="spinner tiny"></div> : <LogIn size={20} />}
                            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const ActiveComponent = tabs.find(t => t.id === activeTab).component;

    return (
        <div className="web-account-page">
            <div className="web-container">
                <div className="emedia-header-spacer" />
                
                <div className="account-dashboard-header">
                    <div className="user-profile-summary">
                        <div className="user-avatar">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} />
                            ) : (
                                <User size={32} />
                            )}
                        </div>
                        <div className="user-info">
                            <h2>Welcome, {user.displayName || 'Devotee'}</h2>
                            <p>{user.email}</p>
                        </div>
                    </div>
                </div>

                <nav className="emedia-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`emedia-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.name}</span>
                            {activeTab === tab.id && <div className="active-underline" />}
                        </button>
                    ))}
                </nav>

                <main className="account-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ActiveComponent hideHeader={true} />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default WebAccount;
