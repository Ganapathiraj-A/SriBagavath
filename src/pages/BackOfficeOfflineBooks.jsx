import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, Search, Camera, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, getDoc, doc } from '@/utils/FirestoreProxy';
import { TransactionService } from '@/services/TransactionService';
import { Camera as CameraPlugin, CameraResultType } from '@capacitor/camera';
import { motion } from 'framer-motion';
import LazyImage from '@/components/LazyImage';

const BackOfficeOfflineBooks = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Data State
    const [books, setBooks] = useState([]);
    const [covers, setCovers] = useState({});
    const [cart, setCart] = useState({});
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('Tamil Books');

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [refNo, setRefNo] = useState('');
    const [image, setImage] = useState(null);
    const NATIVE_LABELS = {
        'Tamil Books': 'Tamil',
        'English Books': 'English'
    };

    // Amount State
    const [amount, setAmount] = useState('');
    const [isManualAmount, setIsManualAmount] = useState(false);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setPageLoading(true);
                const q = query(collection(db, 'books'), orderBy('title', 'asc')); // Changed from 'products' to 'books' to match BookStore
                const snap = await getDocs(q);
                const loadedBooks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setBooks(loadedBooks);

                // Fetch covers
                const booksWithCovers = loadedBooks.filter(b => b.hasCover);
                const coverPromises = booksWithCovers.map(async (book) => {
                    try {
                        const coverSnap = await getDoc(doc(db, 'book_covers', book.id));
                        if (coverSnap.exists()) {
                            return { id: book.id, cover: coverSnap.data().cover };
                        }
                    } catch (_err) {
                        console.error(`Error fetching cover for ${book.title}:`, _err);
                    }
                    return null;
                });

                const resolvedCovers = await Promise.all(coverPromises);
                const coverMap = {};
                resolvedCovers.forEach(c => {
                    if (c) coverMap[c.id] = c.cover;
                });
                setCovers(coverMap);
            } catch (_err) {
                console.error("Error loading books:", _err);
            } finally {
                setPageLoading(false);
            }
        };
        fetchBooks();
    }, []);

    // Persistence Check
    const [hasPreviousInfo, setHasPreviousInfo] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem('last_offline_transaction_details');
        if (saved) setHasPreviousInfo(true);
    }, []);

    const handleUsePrevious = () => {
        try {
            const saved = localStorage.getItem('last_offline_transaction_details');
            if (saved) {
                const data = JSON.parse(saved);
                if (confirm("Autofill details from last offline entry?")) {
                    if (data.name) setCustomerName(data.name);
                    if (data.mobile) setMobile(data.mobile);
                    if (data.address) setAddress(data.address);
                    if (data.city) setCity(data.city);
                    if (data.pincode) setPincode(data.pincode);
                }
            }
        } catch (_err) {
            console.error("Failed to load previous info", _err);
        }
    };

    // Cart Logic
    const addToCart = (id) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    const removeFromCart = (id) => setCart(prev => {
        const next = { ...prev };
        if (next[id] > 1) next[id]--;
        else delete next[id];
        return next;
    });

    const getCartTotal = () => {
        return Object.entries(cart).reduce((total, [id, qty]) => {
            const book = books.find(b => b.id === id);
            return total + (book ? book.price * qty : 0);
        }, 0);
    };

    // Auto-update amount unless manually edited
    useEffect(() => {
        if (!isManualAmount) {
            setAmount(getCartTotal().toString());
        }
    }, [cart, books, isManualAmount]);


    const getOrderItems = () => {
        return Object.entries(cart).map(([id, qty]) => {
            const book = books.find(b => b.id === id);
            return {
                id,
                title: book?.title || 'Unknown Book',
                price: book?.price || 0,
                quantity: qty
            };
        });
    };

    const captureImage = async () => {
        try {
            const photo = await CameraPlugin.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });
            setImage(photo.base64String);
        } catch (_err) {
            console.error(_err);
        }
    };

    const handleSubmit = async () => {
        if (!customerName || !mobile || !address || Object.keys(cart).length === 0) {
            alert("Please fill all required fields (Name, Mobile, Address) and select at least one book.");
            return;
        }

        const finalAmount = parseFloat(amount);
        if (isNaN(finalAmount) || finalAmount < 0) { // Allow 0 if they really want to define it as free? usually > 0. Let's say warn on 0
            if (!confirm("Total amount is 0. Are you sure?")) return;
        }

        setLoading(true);
        try {
            // Save for "Use Previous Info"
            try {
                const dataToSave = {
                    name: customerName,
                    mobile: mobile,
                    address: address,
                    city: city,
                    pincode: pincode
                };
                const existing = localStorage.getItem('last_offline_transaction_details');
                const merged = existing ? { ...JSON.parse(existing), ...dataToSave } : dataToSave;
                localStorage.setItem('last_offline_transaction_details', JSON.stringify(merged));
            } catch (_err) {
                console.error("Failed to save offline details", _err);
            }

            const orderItems = getOrderItems();
            const orderSummary = orderItems.map(p => `${p.title} x${p.quantity}`).join(", ");

            await TransactionService.recordTransaction({
                itemName: `Offline Order: ${orderSummary.substring(0, 30)}...`,
                itemType: 'BOOK',
                amount: finalAmount,

                // Offline Spec
                status: 'PENDING',
                isOffline: true,
                offlineRefNo: refNo || '', // Optional

                // Book Specific
                orderItems: orderItems,
                shippingAddress: {
                    name: customerName,
                    mobile: mobile,
                    address: address,
                    city: city,
                    pincode: pincode
                },

                // Core
                primaryApplicant: { name: customerName, mobile: mobile },
                place: city
            }, image);

            alert("Offline Order Recorded Successfully!");
            navigate('/admin/back-office');
        } catch (_err) {
            console.error(_err);
            alert("Error recording order: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(b => {
        const matchesSearch = b.title?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeTab === 'All' || b.category === activeTab;
        return matchesSearch && matchesCategory;
    });

    const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '100px' }}>
            <PageHeader
                title="Offline Book Order"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '0 16px', maxWidth: '600px', margin: '0 auto' }}>

                {/* Top Controls */}
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    {hasPreviousInfo && (
                        <button
                            onClick={handleUsePrevious}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'var(--color-primary-transparent)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-primary)',
                                padding: '10px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: '16px'
                            }}
                        >
                            <RotateCcw size={16} />
                            Use Previous Info
                        </button>
                    )}

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--color-border)',
                        marginBottom: '16px',
                        gap: '20px',
                        alignItems: 'center',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            {['Tamil Books', 'English Books'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '8px 0',
                                        border: 'none',
                                        borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        fontWeight: activeTab === tab ? '600' : '500',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {NATIVE_LABELS[tab] || tab}
                                </button>
                            ))}

                        </div>
                    </div>

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            placeholder="Search Books..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* Books List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {pageLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Loading books...</div>
                    ) : filteredBooks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>No books found</div>
                    ) : (
                        filteredBooks.map(book => (
                            <motion.div
                                key={book.id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="card"
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <div style={{ width: '50px', height: '70px', backgroundColor: 'var(--color-surface-alt)', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {covers[book.id] ? (
                                        <LazyImage src={covers[book.id]} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ fontSize: '9px', color: 'var(--color-text-muted)' }}>No Cover</div>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>{book.title}</h4>
                                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>₹{book.price}</div>
                                </div>
                                <div>
                                    {cart[book.id] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-primary-transparent)', borderRadius: '6px', padding: '4px' }}>
                                            <button onClick={() => removeFromCart(book.id)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}><Minus size={14} /></button>
                                            <span style={{ fontWeight: 600, fontSize: '14px', minWidth: '16px', textAlign: 'center', color: 'var(--color-text)' }}>{cart[book.id]}</span>
                                            <button onClick={() => addToCart(book.id)} style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}><Plus size={14} /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => addToCart(book.id)} style={{ padding: '6px 16px', borderRadius: '6px', backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                            Add
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Customer & Payment Form */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', paddingBottom: '24px' }}>

                    {/* Order Summary */}
                    {totalCount > 0 && (
                        <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Selected Books ({totalCount})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {getOrderItems().map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: 'var(--color-text-muted)', flex: 1, paddingRight: '12px' }}>{item.title} <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>x{item.quantity}</span></span>
                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>₹{item.price * item.quantity}</span>
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-text)' }}>
                                    <span>Total</span>
                                    <span>₹{getCartTotal()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>Shipping Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                        <input placeholder="Customer Name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', boxSizing: 'border-box', width: '100%' }} />
                        <input placeholder="Mobile Number *" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', boxSizing: 'border-box', width: '100%' }} />
                        <textarea placeholder="Address *" value={address} onChange={(e) => setAddress(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', minHeight: '80px', boxSizing: 'border-box', width: '100%' }} />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', minWidth: 0, boxSizing: 'border-box' }} />
                            <input placeholder="Pincode" type="tel" value={pincode} onChange={(e) => setPincode(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', minWidth: 0, boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>Payment Info</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Total ₹</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setIsManualAmount(true);
                                    }}
                                    style={{ flex: 1, padding: '12px 12px 12px 70px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontWeight: 'bold', fontSize: '16px' }}
                                />
                                {!isManualAmount && (
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                        Auto
                                    </div>
                                )}
                            </div>
                        </div>

                        <input
                            placeholder="Payment Reference No (Optional)"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                        <div
                            onClick={captureImage}
                            style={{
                                padding: '16px',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: image ? 'var(--color-success)' : 'var(--color-text-muted)',
                                backgroundColor: image ? 'var(--color-success-transparent)' : 'var(--color-surface)',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={20} />
                            <span>{image ? "Receipt Attached" : "Attach Payment Receipt (Optional)"}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Action */}
            {totalCount > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    backgroundColor: 'var(--color-card)',
                    padding: '16px',
                    borderTop: '1px solid var(--color-border)',
                    boxShadow: '0 -4px 6px -1px var(--color-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    zIndex: 50
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{totalCount} Items</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)' }}>₹{amount}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 600,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'wait' : 'pointer'
                        }}
                    >
                        {loading ? "Registering..." : "Confirm Info"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BackOfficeOfflineBooks;
