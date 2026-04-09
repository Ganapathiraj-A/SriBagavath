import { useState, useEffect } from 'react';
import { TransactionService } from '@/services/TransactionService';
import PageHeader from '@/components/PageHeader';
import { X, Receipt, LogIn } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import { normalizeImageSrc } from '@/utils/imageUtils';
import LazyImage from '@/components/LazyImage';

const MyOrders = ({ hideHeader = false }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const { t } = useGlobalSettings();

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
        } catch (_err) {
            console.error("Auth failed:", _err);
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser || currentUser.isAnonymous) {
            setOrders([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        console.log("[MyOrders] Starting transaction stream for:", currentUser.uid);
        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            const bookOrders = (data || []).filter(tx => tx.itemType === 'BOOK' || tx.itemType === 'MAGAZINE_SUBSCRIPTION' || (tx.orderItems && tx.orderItems.length > 0));
            setOrders(bookOrders);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleViewReceipt = async (tx) => {
        try {
            const base64 = tx.imageUrl || await TransactionService.getImage(tx.id);
            if (base64) {
                setViewingImage({ base64, utr: tx.utr });
            } else {
                alert(t('NO_RECEIPT_FOUND'));
            }
        } catch (_err) {
            console.error("Error fetching receipt:", _err);
            alert(t('ERROR_LOADING_RECEIPT'));
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'COMPLETED': return t('STATUS_COMPLETED');
            case 'PENDING': return t('STATUS_PENDING');
            case 'REJECTED': return t('STATUS_REJECTED');
            default: return status;
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
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: hideHeader ? 'auto' : '100vh', paddingBottom: '20px' }}>
            {!hideHeader && <PageHeader title={t('MY_ORDERS')} />}

            <div style={{ padding: '16px' }}>
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
                            backgroundColor: 'var(--color-primary-transparent)',
                            width: '64px',
                            height: '64px',
                            borderRadius: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <LogIn size={32} color="var(--color-primary)" />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>{t('SIGN_IN_REQUIRED')}</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '15px' }}>
                            {t('SIGN_IN_ORDERS_DESC')}
                        </p>
                        <button
                            onClick={ensureAuth}
                            disabled={authLoading}
                            style={{
                                width: '100%',
                                backgroundColor: 'var(--color-primary)',
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
                            {authLoading ? t('SIGNING_IN') : t('SIGN_IN_GOOGLE')}
                        </button>
                    </div>
                ) : (
                    <>
                        {loading && <p style={{ textAlign: 'center' }}>{t('LOADING_PROGRAMS')}</p>}
                        {!loading && orders.length === 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '50vh',
                                textAlign: 'center',
                                color: 'var(--color-text-muted)'
                            }}>
                                <p style={{ fontSize: '16px' }}>{t('NO_ORDERS_YET')}</p>
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
                                            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>{t('PAYMENT_RECEIPT')}</h2>
                                            {viewingImage.utr && <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>{t('UTR')}: {viewingImage.utr}</div>}
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
                                        style={{ width: '100%', background: 'var(--color-primary)', borderRadius: '8px', height: '48px', fontWeight: 600 }}
                                    >
                                        {t('CLOSE')}
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
                                        background: 'var(--color-surface)',
                                        padding: '2px 8px',
                                        borderRadius: '12px'
                                    }}>
                                        {getStatusText(order.status)}
                                    </span>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    {order.orderItems?.map((item, idx) => (
                                        <div key={idx} style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                                            {item.title} <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>x {item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                                        {t('TOTAL')}: <strong style={{ color: 'var(--color-text)' }}>₹{order.amount}</strong>
                                        {order.utr && <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>{t('UTR')}: {order.utr}</div>}
                                    </div>
                                    {order.hasImage && (
                                        <div
                                            onClick={() => handleViewReceipt(order)}
                                            style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                        >
                                            <Receipt size={14} /> {t('VERIFY_RECEIPT')} ↗
                                        </div>
                                    )}
                                </div>

                                {order.shippingAddress && (
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <strong>{t('SHIP_TO')}:</strong> {order.shippingAddress.name}, {order.shippingAddress.city}
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
