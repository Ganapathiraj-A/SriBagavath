import React, { useEffect, useState } from 'react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import { X, Receipt } from 'lucide-react';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            const bookOrders = (data || []).filter(tx => tx.itemType === 'BOOK' || (tx.orderItems && tx.orderItems.length > 0));
            setOrders(bookOrders);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleViewReceipt = async (id) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage(base64);
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
            case 'BNK_VERIFIED': return 'green';
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
                                <h2 style={{ margin: 0, fontSize: '18px' }}>Payment Receipt</h2>
                                <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px' }}>
                                    <X size={24} color="#666" />
                                </button>
                            </div>
                            <img
                                src={`data:image/jpeg;base64,${viewingImage}`}
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
                                {order.status === 'BNK_VERIFIED' ? 'COMPLETED' : order.status}
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
                            </div>
                            {order.hasImage && (
                                <div
                                    onClick={() => handleViewReceipt(order.id)}
                                    style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                >
                                    <Receipt size={14} /> View Receipt ↗
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
            </div>
        </div>
    );
};

export default MyOrders;
