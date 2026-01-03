import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, Search, Camera } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { TransactionService } from '../services/TransactionService';
import { Camera as CameraPlugin, CameraResultType } from '@capacitor/camera';

const BackOfficeOfflineBooks = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Data State
    const [books, setBooks] = useState([]);
    const [cart, setCart] = useState({});
    const [search, setSearch] = useState('');

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [refNo, setRefNo] = useState('');
    const [image, setImage] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            const q = query(collection(db, 'products'), orderBy('title'));
            const snap = await getDocs(q);
            setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchBooks();
    }, []);

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

    const getOrderItems = () => {
        return Object.entries(cart).map(([id, qty]) => {
            const book = books.find(b => b.id === id);
            return {
                id,
                title: book.title,
                price: book.price,
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
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async () => {
        if (!customerName || !mobile || !address || !refNo || Object.keys(cart).length === 0) {
            alert("Please fill all required fields and select books.");
            return;
        }

        setLoading(true);
        try {
            const orderItems = getOrderItems();
            const orderSummary = orderItems.map(p => `${p.title} x${p.quantity}`).join(", ");
            const total = getCartTotal();

            await TransactionService.recordTransaction({
                itemName: `Offline Order: ${orderSummary.substring(0, 30)}...`,
                itemType: 'BOOK',
                amount: total,

                // Offline Spec
                status: 'BNK_VERIFIED',
                isOffline: true,
                offlineRefNo: refNo,

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
            navigate('/admin/back-office/offline-hub');
        } catch (error) {
            console.error(error);
            alert("Error recording order: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '20px' }}>
            <PageHeader
                title="Offline Book Order"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office/offline-hub')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

                {/* Book Selection */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Select Books</h3>

                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
                        <input
                            placeholder="Search Books..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredBooks.map(book => (
                            <div key={book.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{book.title}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>₹{book.price}</div>
                                </div>

                                {cart[book.id] ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button onClick={() => removeFromCart(book.id)} style={{ padding: '4px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none' }}><Minus size={14} /></button>
                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{cart[book.id]}</span>
                                        <button onClick={() => addToCart(book.id)} style={{ padding: '4px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', border: 'none' }}><Plus size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => addToCart(book.id)} style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', fontSize: '12px', fontWeight: 600 }}>Add</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Shipping Details */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Shipping Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                        <input placeholder="Mobile Number" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                        <textarea placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', minHeight: '60px' }} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                            <input placeholder="Pincode" type="tel" value={pincode} onChange={(e) => setPincode(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                        </div>
                    </div>
                </div>

                {/* Payment */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Payment Info</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#6b7280' }}>Total Amount</span>
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>₹{getCartTotal()}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Payment Reference No"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                        <div
                            onClick={captureImage}
                            style={{
                                padding: '12px',
                                border: '2px dashed #d1d5db',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: image ? '#166534' : '#6b7280',
                                backgroundColor: image ? '#f0fdf4' : 'transparent',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={20} />
                            <span>{image ? "Receipt Attached" : "Attach Payment Receipt"}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? "Registering..." : "Place Offline Order"}
                </button>
            </div>
        </div>
    );
};

export default BackOfficeOfflineBooks;
