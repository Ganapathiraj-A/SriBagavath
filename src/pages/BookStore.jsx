import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Plus, Minus, Info } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { auth, db } from '@/firebase';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { useCart } from '@/context/CartContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Edit2 } from 'lucide-react';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const BookStore = () => {
    const navigate = useNavigate();
    const { cart, addToCart, removeFromCart } = useCart();
    const { isAdmin, hasAccess, loading: authGlobalLoading } = useAdminAuth();
    const canEdit = hasAccess('PRINT_BOOKS_MANAGEMENT');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Tamil Books');
    const [authLoading, setAuthLoading] = useState(false);
    const { onlineTransactionsEnabled, offlineRegistrationContact } = useGlobalSettings();

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
        localStorage.setItem('lastVisited_books', Date.now().toString());
    }, []);

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
            const { needsServerSync, markSyncedLocally, ensureInitialized } = await import('../utils/SyncManager');
            await ensureInitialized();

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
                } else if (cacheSnap.metadata.fromCache) {
                    // Cache is explicitly empty but valid
                    cachedData = [];
                    setProducts([]);
                    setLoading(false);
                    console.log(`[BookStore] Category ${activeTab} is empty (from cache)`);
                }
            } catch (_err) {
                console.warn("[BookStore] Cache read failed", _err);
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
                    setLoading(false);
                }
            }

        } catch (_err) {
            console.error("Error loading products:", _err);
            setLoading(false);
        }
    };

    const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);
    const totalPrice = products.reduce((acc, p) => acc + (p.price * (cart[p.id] || 0)), 0);

    const mainTabs = ['Tamil Books', 'English Books'];

    const NATIVE_LABELS = {
        'Tamil Books': 'Tamil',
        'English Books': 'English',
        'Hindi Books': 'Hindi',
        'Telugu Books': 'Telugu',
        'Malayalam Books': 'Malayalam',
        'Kannada Books': 'Kannada',
        'Russian Books': 'Russian',
        'Hebrew Books': 'Hebrew',
        'Spanish Books': 'Spanish',
        'German Books': 'German',
        'Italian Books': 'Italian'
    };

    const filteredProducts = products.filter(p => p.category === activeTab);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)' }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Loading Bookstore...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', paddingBottom: '100px' }}>
            <PageHeader
                title="Print Books"
                rightAction={canEdit && (
                    <button
                        onClick={() => navigate('/admin/books', { state: { returnPath: '/bookstore' } })}
                        title="Edit Products"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            backgroundColor: 'var(--color-primary-transparent)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: '50%',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Edit2 size={18} />
                    </button>
                )}
            />

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                margin: '0 16px',
                borderBottom: '1px solid var(--color-border)',
                gap: '20px',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {mainTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 4px',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                backgroundColor: 'transparent',
                                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: activeTab === tab ? '600' : '500',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {NATIVE_LABELS[tab] || tab}
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
                        color: 'var(--color-text-muted)',
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
                        data-testid={`product-card-${product.id}`}
                        style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', cursor: 'pointer', position: 'relative', backgroundColor: 'var(--color-card)', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}
                    >
                        <LazyImage
                            firestorePath={`book_covers/${product.id}`}
                            alt={product.title}
                            width="60px"
                            height="80px"
                            borderRadius="6px"
                            placeholder={() => <div style={{ color: 'var(--color-text-light)', fontSize: '10px', textAlign: 'center', padding: '4px' }}>No Cover</div>}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</h3>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.95rem' }}>₹{product.price}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: 'var(--color-text-light)', fontSize: '0.75rem' }}>
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
                                                data-testid={`remove-from-cart-${product.id}`}
                                                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: authLoading ? 'wait' : 'pointer' }}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center', fontSize: '1rem', color: 'var(--color-text)' }}>{cart[product.id]}</span>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        disabled={authLoading}
                                        aria-label={`Add ${product.title} to cart`}
                                        data-testid={`add-to-cart-${product.id}`}
                                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: authLoading ? 'wait' : 'pointer', boxShadow: 'var(--shadow-sm)' }}
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
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
                        color: 'var(--color-text-on-primary)',
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
                        data-testid="checkout-button"
                        style={{
                            backgroundColor: 'white',
                            color: 'var(--color-primary)',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-md)'
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
                    backgroundColor: 'var(--color-error)',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 100
                }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                        To order books please contact {offlineRegistrationContact}
                    </p>
                </div>
            )}
        </div>
    );
};

export default BookStore;
