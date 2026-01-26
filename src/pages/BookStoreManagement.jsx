import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X, LogOut, Package, Truck, User } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import { compressImage } from '../utils/imageUtils';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED'];
const TAB_LABELS = {
    'PENDING': 'New Orders',
    'PROCESSING': 'Processing',
    'SHIPPED': 'Shipped',
    'COMPLETED': 'Completed'
};

const BookStoreManagement = () => {
    const navigate = useNavigate();
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [filterSource, setFilterSource] = useState("All"); // All, Online, Offline
    const [uploadingReceipt, setUploadingReceipt] = useState(null); // stores id of order being updated
    const [editingUtrValue, setEditingUtrValue] = useState('');
    const [editingAmountValue, setEditingAmountValue] = useState('');
    const [editingParsedAmountValue, setEditingParsedAmountValue] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        // Clear badges
        localStorage.setItem('lastVisited_book_store_management', new Date().toISOString());
        localStorage.setItem('badge_transactions', '0');

        const unsubscribe = TransactionService.streamTransactions((data) => {
            const relevantTransactions = data.filter(tx => tx.itemType === 'BOOK');
            setAllOrders(relevantTransactions);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredBySource = allOrders.filter(order => {
        if (filterSource === 'Online' && order.isOffline) return false;
        if (filterSource === 'Offline' && !order.isOffline) return false;
        return true;
    });

    const displayedOrders = filteredBySource.filter(order => {
        if (activeTab === 'PENDING') return order.status === 'PENDING' || (order.status !== 'COMPLETED' && order.status !== 'PROCESSING' && order.status !== 'SHIPPED' && order.status !== 'REJECTED');
        return order.status === activeTab;
    });

    const getCount = (status) => {
        return filteredBySource.filter(order => {
            if (status === 'PENDING') return order.status === 'PENDING' || (order.status !== 'COMPLETED' && order.status !== 'PROCESSING' && order.status !== 'SHIPPED' && order.status !== 'REJECTED');
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

    const handleViewImage = async (order) => {
        try {
            const base64 = await TransactionService.getImage(order.id);
            if (base64) {
                setViewingImage({
                    base64,
                    id: order.id,
                    utr: order.utr,
                    amount: order.amount,
                    parsedAmount: order.parsedAmount,
                    ocrText: order.ocrText || ''
                });
                setEditingUtrValue(order.utr || '');
                setEditingAmountValue(order.amount?.toString() || '');
                setEditingParsedAmountValue(order.parsedAmount?.toString() || '');
            } else {
                alert("No Payment Receipt Found");
            }
        } catch (e) { alert("Error loading image"); }
    };

    const handleSaveDetails = async () => {
        if (!viewingImage || savingDetails) return;
        setSavingDetails(true);
        try {
            const newAmount = parseFloat(editingAmountValue);
            const newParsedAmount = parseFloat(editingParsedAmountValue);

            if (isNaN(newAmount)) {
                alert("Please enter a valid number for the amount.");
                setSavingDetails(false);
                return;
            }

            const updates = {
                utr: editingUtrValue,
                amount: newAmount,
                parsedAmount: isNaN(newParsedAmount) ? null : newParsedAmount,
            };

            await TransactionService.updateTransactionDetails(viewingImage.id, updates);
            setViewingImage(null);
            alert("Details updated successfully!");
        } catch (e) {
            alert("Failed to update: " + e.message);
        } finally {
            setSavingDetails(false);
        }
    };

    const extractUtrSuggestions = (text) => {
        if (!text) return [];
        const matches = text.match(/\b\d{12}\b/g) || [];
        return [...new Set(matches)];
    };

    const handleAddReceipt = async (e, id) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingReceipt(id);
            const base64 = await compressImage(file);
            await TransactionService.uploadReceipt(id, base64);
            alert("Receipt uploaded successfully!");
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed: " + error.message);
        } finally {
            setUploadingReceipt(null);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="payment-container screen-wrapper" style={{ paddingBottom: '80px' }}>
            {/* Image Modal */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        background: 'white',
                        padding: '15px',
                        borderRadius: '16px',
                        maxWidth: '30rem',
                        width: '100%',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Verify Receipt</h2>
                            <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                <X size={24} color="#666" />
                            </button>
                        </div>

                        <div style={{ width: '100%', overflowY: 'auto', maxHeight: '40vh', border: '1px solid #eee', borderRadius: '8px' }}>
                            <img
                                src={viewingImage.base64.startsWith('data:') ? viewingImage.base64 : `data:image/jpeg;base64,${viewingImage.base64}`}
                                alt="Receipt"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    Detected 12-Digit Numbers
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {extractUtrSuggestions(viewingImage.ocrText).length > 0 ? (
                                        extractUtrSuggestions(viewingImage.ocrText).map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setEditingUtrValue(num)}
                                                style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: editingUtrValue === num ? '#dbeafe' : '#f1f5f9',
                                                    color: editingUtrValue === num ? '#1e40af' : '#475569',
                                                    border: editingUtrValue === num ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {num}
                                            </button>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No 12-digit numbers found</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Edit UTR</label>
                                    <input
                                        type="text"
                                        value={editingUtrValue}
                                        onChange={(e) => setEditingUtrValue(e.target.value)}
                                        placeholder="UTR..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Amount</label>
                                    <input
                                        type="number"
                                        value={editingAmountValue}
                                        onChange={(e) => setEditingAmountValue(e.target.value)}
                                        placeholder="Amount..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>OCR Amount (Detected)</label>
                                <input
                                    type="number"
                                    value={editingParsedAmountValue}
                                    onChange={(e) => setEditingParsedAmountValue(e.target.value)}
                                    placeholder="OCR Amount..."
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', outline: 'none', backgroundColor: '#fdf2f2' }}
                                />
                            </div>

                            <button
                                onClick={handleSaveDetails}
                                disabled={savingDetails}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    cursor: savingDetails ? 'wait' : 'pointer'
                                }}
                            >
                                {savingDetails ? 'Saving...' : 'Save Updated Details'}
                            </button>
                            <button
                                onClick={() => setViewingImage(null)}
                                style={{ width: '100%', height: '48px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Purchases"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            {/* Filter & Tabs */}
            <div style={{ backgroundColor: 'white', padding: '10px 16px', borderBottom: '1px solid #eee' }}>
                <div style={{ marginBottom: '10px' }}>
                    <select
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                        className="styled-select"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                        <option value="All">All Sources</option>
                        <option value="Online">Online Orders</option>
                        <option value="Offline">Offline Orders</option>
                    </select>
                </div>

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
            {activeTab === 'COMPLETED' && getCount('COMPLETED') > 0 && (
                <div style={{ padding: '0 16px', marginTop: '8px' }}>
                    <button
                        onClick={async () => {
                            const toArchive = allOrders.filter(o => o.status === 'COMPLETED');
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
                        <Package size={18} /> Move All to Storage ({getCount('COMPLETED')})
                    </button>
                </div>
            )}

            <div className="product-list" style={{ marginTop: '16px', padding: '0 16px' }}>
                {loading && <p style={{ textAlign: 'center' }}>Loading Orders...</p>}
                {!loading && displayedOrders.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No {TAB_LABELS[activeTab].toLowerCase()} purchases found.
                    </p>
                )}

                {displayedOrders.map(order => (
                    <div key={order.id} className="card" style={{ marginBottom: '16px', borderLeft: order.status === 'PENDING' ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Order #{order.id.substring(0, 8)}
                                {order.reconciled && (
                                    <span style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <Check size={10} /> Bank Verified
                                    </span>
                                )}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {new Date(order.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Offline Indicator */}
                        {order.isOffline && (
                            <div style={{
                                display: 'inline-block',
                                backgroundColor: '#e0f2fe',
                                color: '#0284c7',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginBottom: '8px'
                            }}>
                                OFFLINE ORDER
                            </div>
                        )}

                        {/* Items summary */}
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Package size={14} /> ORDER ITEMS
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
                            {order.utr && (
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginTop: '4px', textAlign: 'right' }}>
                                    UTR: {order.utr}
                                </div>
                            )}
                        </div>

                        {/* Shipping details */}
                        {order.shippingAddress && (
                            <div style={{ background: '#fff7ed', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#9a3412', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={14} /> SHIPPING ADDRESS
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
                            {order.hasImage ? (
                                <button
                                    onClick={() => handleViewImage(order)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', fontSize: '13px', fontWeight: 500 }}
                                >
                                    Verify Receipt
                                </button>
                            ) : (
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <button
                                        disabled={uploadingReceipt === order.id}
                                        onClick={() => document.getElementById(`receipt-input-${order.id}`).click()}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid #2563eb',
                                            backgroundColor: '#eff6ff',
                                            color: '#2563eb',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: uploadingReceipt === order.id ? 'wait' : 'pointer'
                                        }}
                                    >
                                        {uploadingReceipt === order.id ? 'Uploading...' : 'Add Receipt'}
                                    </button>
                                    <input
                                        type="file"
                                        id={`receipt-input-${order.id}`}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={(e) => handleAddReceipt(e, order.id)}
                                    />
                                </div>
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
                                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Truck size={16} />
                                        Mark Shipped
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
                                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Check size={16} /> Mark Completed
                                    </button>
                                </>
                            )}
                            {order.status === 'COMPLETED' ? (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
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
