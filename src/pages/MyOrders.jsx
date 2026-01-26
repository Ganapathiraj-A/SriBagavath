import React, { useState, useEffect } from 'react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import { X, Receipt, LogIn } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState(null);
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
            const bookOrders = (data || []).filter(tx => tx.itemType === 'BOOK' || (tx.orderItems && tx.orderItems.length > 0));
            setOrders(bookOrders);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleViewReceipt = async (id, utr) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage({ base64, utr });
            } else {
                alert("No receipt image found for this order.");
            }
        } catch (e) {
            console.error("Error fetching receipt:", e);
            alert("Error loading receipt.");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'green';
            case 'PENDING': return 'orange';
            case 'REJECTED': return 'red';
            default: return 'gray';
        }
    };

    const formatDate = (ts) => {
        if (!ts) return "";
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString();
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title="My Orders" />

            <div style={{ padding: '16px' }}>
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
                            backgroundColor: '#eff6ff',
                            width: '64px',
                            height: '64px',
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <LogIn size={32} color="#2563eb" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Sign in Required</h2>
                        <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '15px' }}>
                            Please sign in with your Google account to view your past orders and receipts.
                        </p>
                        <button
                            onClick={ensureAuth}
                            disabled={authLoading}
                            style={{
                                width: '100%',
                                backgroundColor: '#2563eb',
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
                        {loading && <p style={{ textAlign: 'center' }}>Loading Orders...</p>}
                        {!loading && orders.length === 0 && (
                            <div style={{ textAlign: 'center', marginTop: '40px', color: '#666' }}>
                                <p>No orders found yet.</p>
                            </div>
                        )}

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
                                        <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px' }}>
                                            <X size={24} color="#666" />
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
                                        style={{ width: '100%', background: '#2563eb', borderRadius: '8px', height: '48px', fontWeight: 600 }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        {orders.map(order => (
                            <div key={order.id} className="card" style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>{formatDate(order.timestamp)}</span>
                                    <span style={{
                                        color: getStatusColor(order.status),
                                        fontWeight: 'bold',
                                        fontSize: '11px',
                                        background: '#f3f4f6',
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                    }}>
                                        {order.status === 'COMPLETED' ? 'COMPLETED' : order.status}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    {order.orderItems?.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                                            {item.title} <span style={{ fontWeight: 400, color: '#666' }}>x {item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                                    <div style={{ fontSize: '13px', color: '#4b5563' }}>
                                        Total: <strong style={{ color: '#111827' }}>₹{order.amount}</strong>
                                        {order.utr && <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, marginTop: '2px' }}>UTR: {order.utr}</div>}
                                    </div>
                                    {order.hasImage && (
                                        <div
                                            onClick={() => handleViewReceipt(order.id, order.utr)}
                                            style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                        >
                                            <Receipt size={14} /> Verify Receipt ↗
                                        </div>
                                    )}
                                </div>

                                {order.shippingAddress && (
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#666', background: '#f9fafb', padding: '8px', borderRadius: '4px' }}>
                                        <strong>Ship to:</strong> {order.shippingAddress.name}, {order.shippingAddress.city}
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default MyOrders;
