import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, ShoppingCart, ChevronLeft, Plus, Minus, Info, RefreshCw } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '../utils/GoogleAuthUtils';
import PageHeader from '../components/PageHeader';
import LazyImage from '../components/LazyImage';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, getDoc } from '@/utils/FirestoreProxy';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { useCart } from '../context/CartContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const BookStore = () => {
    const navigate = useNavigate();
    const { cart, addToCart, removeFromCart } = useCart();
    const { loading: authGlobalLoading } = useAdminAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Tamil Books');
    const [authLoading, setAuthLoading] = useState(false);
    const { onlineTransactionsEnabled } = useGlobalSettings();

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

    const handleAddToCart = async (product) => {
        if (await ensureAuth()) {
            addToCart(product);
        }
    };

    const handleRemoveFromCart = async (product) => {
        if (await ensureAuth()) {
            removeFromCart(product);
        }
    };

    const handleViewOrders = async () => {
        if (await ensureAuth()) {
            navigate('/my-orders');
        }
    };

    useEffect(() => {
        if (!authGlobalLoading) {
            loadBooks();
        }
    }, [authGlobalLoading, activeTab]);

    const loadBooks = async () => {
        if (authGlobalLoading) return;
        setLoading(true);

        try {
            const { collection, query, orderBy, getDocs, where, getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
            const { needsServerSync, markSyncedLocally } = await import('../utils/SyncManager');

            const ref = collection(db, 'books');
            const q = query(
                ref,
                where('category', '==', activeTab),
                orderBy('title', 'asc')
            );

            const collectionId = `bookstore_${activeTab}`;
            const needsSync = needsServerSync(collectionId);

            // Strategy: Cache-First with Background Refresh
            let cachedData = null;
            try {
                const cacheSnap = await getDocsFromCache(q);
                if (!cacheSnap.empty) {
                    cachedData = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    setProducts(cachedData);
                    setLoading(false);
                    console.log(`[BookStore] Loaded ${cachedData.length} items from cache`);
                }
            } catch (e) {
                console.warn("[BookStore] Cache read failed", e);
            }

            // Always background refresh if needsSync or no cache
            if (!cachedData || needsSync) {
                console.log(`[BookStore] Refreshing from server... (Category: ${activeTab})`);
                const serverTask = getDocsFromServer(q).then(serverSnap => {
                    const books = serverSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    console.log(`[BookStore] Server returned ${books.length} items for ${activeTab}`);
                    setProducts(books);
                    markSyncedLocally(collectionId);
                }).catch(err => {
                    console.error("[BookStore] Server refresh failed", err);
                    if (!cachedData) alert(`BookStore Fetch Failed: ${err.message}`);
                });

                if (!cachedData) {
                    await serverTask;
                }
            }

        } catch (error) {
            console.error("Error loading products:", error);
            setLoading(false);
        }
    };

    const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);
    const totalPrice = products.reduce((acc, p) => acc + (p.price * (cart[p.id] || 0)), 0);

    const tabs = ['Tamil Books', 'English Books'];
    const filteredProducts = products.filter(p => p.category === activeTab);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                <p style={{ color: '#6b7280' }}>Loading Bookstore...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '100px' }}>
            <PageHeader title="Print Books" />

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                margin: '0 16px',
                borderBottom: '1px solid #e5e7eb',
                gap: '20px',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 4px',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                backgroundColor: 'transparent',
                                color: activeTab === tab ? 'var(--color-primary)' : '#6b7280',
                                fontWeight: activeTab === tab ? '600' : '500',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleViewOrders}
                    disabled={authLoading}
                    aria-label="View My Orders"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: '2px solid transparent',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        cursor: 'pointer'
                    }}
                >
                    <IndianRupee size={18} /> My Orders
                </button>
            </div>

            <div style={{ padding: '16px 16px 0 16px' }}></div>

            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredProducts.map(product => (
                    <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        onClick={() => navigate(`/book/${product.id}`)}
                        style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', cursor: 'pointer', position: 'relative' }}
                    >
                        <LazyImage
                            firestorePath={`book_covers/${product.id}`}
                            alt={product.title}
                            width="60px"
                            height="80px"
                            borderRadius="6px"
                            placeholder={() => <div style={{ color: '#9ca3af', fontSize: '10px', textAlign: 'center', padding: '4px' }}>No Cover</div>}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</h3>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.95rem' }}>₹{product.price}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: '#9ca3af', fontSize: '0.75rem' }}>
                                <Info size={12} /> Click for details
                            </div>
                        </div>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            onClick={(e) => e.stopPropagation()} // Prevent navigation to details
                        >
                            {onlineTransactionsEnabled && (
                                <>
                                    {cart[product.id] > 0 && (
                                        <>
                                            <button
                                                onClick={() => handleRemoveFromCart(product)}
                                                disabled={authLoading}
                                                aria-label={`Remove ${product.title} from cart`}
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #e5e7eb', background: 'white', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: authLoading ? 'wait' : 'pointer' }}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center', fontSize: '1rem' }}>{cart[product.id]}</span>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        disabled={authLoading}
                                        aria-label={`Add ${product.title} to cart`}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: authLoading ? 'wait' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredProducts.length === 0 && !loading && (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
                    <p>No books available in this category.</p>
                </div>
            )}

            {totalCount > 0 && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '20px',
                        right: '20px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        padding: '16px 24px',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                        zIndex: 100
                    }}
                >
                    <div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>{totalCount} Items</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{totalPrice}</div>
                    </div>
                    <button
                        onClick={() => navigate('/bookstore-checkout', {
                            state: {
                                items: products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })),
                                totalPrice
                            }
                        })}
                        style={{
                            backgroundColor: 'white',
                            color: 'var(--color-primary)',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    >
                        Checkout
                    </button>
                </motion.div>
            )}

            {!onlineTransactionsEnabled && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    right: '20px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    color: '#b91c1c',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    zIndex: 100
                }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                        To order books please contact 7904118421
                    </p>
                </div>
            )}
        </div>
    );
};

export default BookStore;
