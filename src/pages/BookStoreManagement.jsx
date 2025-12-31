import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X, LogOut, Package, Truck, User } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'PROCESSING', 'SHIPPED', 'BNK_VERIFIED'];
const TAB_LABELS = {
    'PENDING': 'New Orders',
    'PROCESSING': 'Processing',
    'SHIPPED': 'Shipped',
    'BNK_VERIFIED': 'Completed'
};

const BookStoreManagement = () => {
    const navigate = useNavigate();
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');

    useEffect(() => {
        // Clear badges
        localStorage.setItem('lastVisited_book_store_management', new Date().toISOString());
        localStorage.setItem('badge_transactions', '0');

        const unsubscribe = TransactionService.streamTransactions((data) => {
            const relevantTransactions = data.filter(tx => tx.itemType === 'BOOK' || tx.itemType === 'DONATION');
            setAllOrders(relevantTransactions);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const displayedOrders = allOrders.filter(order => {
        if (activeTab === 'PENDING') return order.status === 'PENDING' || (order.status !== 'BNK_VERIFIED' && order.status !== 'PROCESSING' && order.status !== 'SHIPPED' && order.status !== 'REJECTED');
        return order.status === activeTab;
    });

    const getCount = (status) => {
        return allOrders.filter(order => {
            if (status === 'PENDING') return order.status === 'PENDING' || (order.status !== 'BNK_VERIFIED' && order.status !== 'PROCESSING' && order.status !== 'SHIPPED' && order.status !== 'REJECTED');
            return order.status === status;
        }).length;
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await TransactionService.updateStatus(id, newStatus);
        } catch (e) {
            alert("Update Failed");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this order?")) {
            await TransactionService.deleteTransaction(id);
        }
    };

    const [viewingImage, setViewingImage] = useState(null);

    const handleViewImage = async (id) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage(base64);
            } else {
                alert("No Payment Receipt Found");
            }
        } catch (e) { alert("Error loading image"); }
    };

    return (
        <div className="payment-container screen-wrapper" style={{ paddingBottom: '80px' }}>
            {/* Image Modal */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'white', padding: '10px' }}>
                        <img src={`data:image/jpeg;base64,${viewingImage}`} alt="Receipt" className="modal-image" style={{ maxHeight: '80vh' }} />
                        <button className="btn-primary" onClick={() => setViewingImage(null)} style={{ width: '100%', background: '#2563eb' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            <PageHeader
                title="Book Store Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            {/* Tabs */}
            <div style={{ backgroundColor: 'white', padding: '10px 16px', borderBottom: '1px solid #eee' }}>
                <div className="tabs-row" style={{ justifyContent: 'center' }}>
                    {TABS.map(tab => {
                        const count = getCount(tab);
                        return (
                            <button
                                key={tab}
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {TAB_LABELS[tab]}
                                {count > 0 && <span className="badge">{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Sub-Header Actions */}
            {activeTab === 'BNK_VERIFIED' && getCount('BNK_VERIFIED') > 0 && (
                <div style={{ padding: '0 16px', marginTop: '8px' }}>
                    <button
                        onClick={async () => {
                            const toArchive = allOrders.filter(o => o.status === 'BNK_VERIFIED');
                            if (confirm(`Move ALL ${toArchive.length} Completed orders to Storage?`)) {
                                setLoading(true);
                                try {
                                    for (const o of toArchive) {
                                        await TransactionService.archiveTransaction(o.id);
                                    }
                                } catch (e) { alert("Archive Failed"); }
                                setLoading(false);
                            }
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Package size={18} /> Move All to Storage ({getCount('BNK_VERIFIED')})
                    </button>
                </div>
            )}

            <div className="product-list" style={{ marginTop: '16px', padding: '0 16px' }}>
                {loading && <p style={{ textAlign: 'center' }}>Loading Orders...</p>}
                {!loading && displayedOrders.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No {TAB_LABELS[activeTab].toLowerCase()} found.
                    </p>
                )}

                {displayedOrders.map(order => (
                    <div key={order.id} className="card" style={{ marginBottom: '16px', borderLeft: order.status === 'PENDING' ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                Order #{order.id.substring(0, 8)}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {new Date(order.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Items summary */}
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Package size={14} /> {order.itemType === 'DONATION' ? 'DONATION DETAILS' : 'ORDER ITEMS'}
                            </div>
                            {order.orderItems?.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '14px', color: '#111827', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.title}</span>
                                    <span style={{ fontWeight: 600 }}>x {item.quantity}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#1e293b' }}>
                                <span>Total Paid</span>
                                <span>₹{order.amount}</span>
                            </div>
                        </div>

                        {/* Shipping details */}
                        {order.shippingAddress && (
                            <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={14} /> {order.itemType === 'DONATION' ? 'DONOR DETAILS' : 'SHIPPING ADDRESS'}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{order.shippingAddress.name}</div>
                                <div style={{ fontSize: '14px', color: '#4b5563' }}>{order.shippingAddress.mobile}</div>
                                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px', lineHeight: 1.4 }}>
                                    {order.shippingAddress.address},<br />
                                    {order.shippingAddress.city} - {order.shippingAddress.pincode}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            {order.hasImage && (
                                <button
                                    onClick={() => handleViewImage(order.id)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', fontSize: '13px', fontWeight: 500 }}
                                >
                                    View Receipt
                                </button>
                            )}
                            {order.status === 'PENDING' && (
                                <button
                                    onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                    <Package size={16} /> Mark Processing
                                </button>
                            )}
                            {order.status === 'PROCESSING' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #6b7280', backgroundColor: 'white', color: '#4b5563', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, order.itemType === 'DONATION' ? 'BNK_VERIFIED' : 'SHIPPED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: order.itemType === 'DONATION' ? '#16a34a' : '#f59e0b', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        {order.itemType === 'DONATION' ? <Check size={16} /> : <Truck size={16} />}
                                        {order.itemType === 'DONATION' ? 'Mark Completed' : 'Mark Shipped'}
                                    </button>
                                </>
                            )}
                            {order.status === 'SHIPPED' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #6b7280', backgroundColor: 'white', color: '#4b5563', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'BNK_VERIFIED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Check size={16} /> Mark Completed
                                    </button>
                                </>
                            )}
                            {order.status === 'BNK_VERIFIED' ? (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, order.itemType === 'DONATION' ? 'PROCESSING' : 'SHIPPED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #10b981', backgroundColor: 'white', color: '#10b981', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TransactionService.archiveTransaction(order.id);
                                            } catch (e) { alert("Archive Failed"); }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Package size={16} /> Storage
                                    </button>
                                </>
                            ) : null}
                            <button
                                onClick={() => handleDelete(order.id)}
                                style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookStoreManagement;
