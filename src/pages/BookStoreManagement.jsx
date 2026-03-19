import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, X, Package, Truck, User, Search, Share2, Square, CheckSquare } from 'lucide-react';
import { TransactionService } from '@/services/TransactionService';
import { shareTransactions } from '@/utils/shareUtils';
import PageHeader from '@/components/PageHeader';
import { compressImage, normalizeImageSrc } from '@/utils/imageUtils';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        // Clear badges
        localStorage.setItem('lastVisited_book_store_management', new Date().toISOString());
        localStorage.setItem('badge_transactions', '0');

        const unsubscribe = TransactionService.streamTransactions((data) => {
            const relevantTransactions = (data || []).filter(tx => tx.itemType === 'BOOK' || tx.itemType === 'MAGAZINE_SUBSCRIPTION');
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
        const matchesSearch = !searchTerm.trim() ||
            order.shippingAddress?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.shippingAddress?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.utr?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

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
        } catch (_err) {
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
            const base64 = order.imageUrl || await TransactionService.getImage(order.id);
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
        } catch (_err) { alert("Error loading image"); }
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
        } catch (_err) {
            alert("Failed to update: " + _err.message);
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
        } catch (_err) {
            console.error("Upload failed", _err);
            alert("Upload failed: " + _err.message);
        } finally {
            setUploadingReceipt(null);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === displayedOrders.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayedOrders.map(order => order.id));
        }
    };

    const handleMultiShare = async () => {
        const transactionsToShare = displayedOrders.filter(o => selectedIds.includes(o.id));
        if (transactionsToShare.length === 0) return;
        await shareTransactions(transactionsToShare, 'BOOK');
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
                        background: 'var(--color-card)',
                        padding: '15px',
                        borderRadius: '16px',
                        maxWidth: '30rem',
                        width: '100%',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Verify Receipt</h2>
                            <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                <X size={24} color="var(--color-text-muted)" />
                            </button>
                        </div>

                        <div style={{ width: '100%', overflowY: 'auto', maxHeight: '40vh', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                            <img
                                src={normalizeImageSrc(viewingImage.base64)}
                                alt="Receipt"
                                style={{ width: '100%', display: 'block' }}
                            />
                        </div>

                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
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
                                                    backgroundColor: editingUtrValue === num ? 'var(--color-primary-light)' : 'var(--color-background)',
                                                    color: editingUtrValue === num ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                                                    border: editingUtrValue === num ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
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
                                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No 12-digit numbers found</div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Edit UTR</label>
                                    <input
                                        type="text"
                                        value={editingUtrValue}
                                        onChange={(e) => setEditingUtrValue(e.target.value)}
                                        placeholder="UTR..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--color-input-background)', color: 'var(--color-text)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Amount</label>
                                    <input
                                        type="number"
                                        value={editingAmountValue}
                                        onChange={(e) => setEditingAmountValue(e.target.value)}
                                        placeholder="Amount..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--color-input-background)', color: 'var(--color-text)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>OCR Amount (Detected)</label>
                                <input
                                    type="number"
                                    value={editingParsedAmountValue}
                                    onChange={(e) => setEditingParsedAmountValue(e.target.value)}
                                    placeholder="OCR Amount..."
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '15px', outline: 'none', backgroundColor: 'var(--color-input-background)', color: 'var(--color-text)' }}
                                />
                            </div>

                            <button
                                onClick={handleSaveDetails}
                                disabled={savingDetails}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    backgroundColor: 'var(--color-primary)',
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
                                style={{ width: '100%', height: '48px', background: 'var(--color-background)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
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
                        <ChevronLeft size={24} color="var(--color-text)" />
                    </button>
                }
            />

            {/* Filter & Tabs */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: '10px' }}>
                    <select
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                        className="styled-select"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-input-background)', color: 'var(--color-text)' }}
                    >
                        <option value="All">All Sources</option>
                        <option value="Online">Online Orders</option>
                        <option value="Offline">Offline Orders</option>
                    </select>
                </div>

                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0.5rem 1rem', borderRadius: '1.25rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                    <Search size={18} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="Search by name, ID or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 0',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.95rem',
                            backgroundColor: 'transparent',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>

                <div className="tabs-row" style={{ justifyContent: 'center' }}>
                    {TABS.map(tab => {
                        const count = getCount(tab);
                        return (
                            <button
                                key={tab}
                                data-testid={`order-tab-${tab}`}
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {TAB_LABELS[tab]}
                                {count > 0 && (
                                    <span style={{
                                        backgroundColor: activeTab === tab ? 'var(--color-primary-transparent)' : 'var(--color-surface)',
                                        color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        border: activeTab === tab ? 'none' : '1px solid var(--color-border)'
                                    }}>
                                        {count}
                                    </span>
                                )}
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
                                } catch (_err) { alert("Archive Failed"); }
                                setLoading(false);
                            }
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Package size={18} /> Move All to Storage ({getCount('COMPLETED')})
                    </button>
                </div>
            )}

            <div className="product-list" style={{ marginTop: '16px', padding: '0 16px' }}>
                {loading && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading Orders...</p>}
                {!loading && displayedOrders.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                        No {TAB_LABELS[activeTab].toLowerCase()} purchases found.
                    </p>
                )}

                {/* Add Select All and Share button above the list */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <button onClick={handleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--color-text)', fontSize: '13px', fontWeight: 600 }}>
                        {selectedIds.length === displayedOrders.length && displayedOrders.length > 0 ? <CheckSquare size={16} color="var(--color-primary)" /> : <Square size={16} color="var(--color-text-muted)" />}
                        {selectedIds.length === displayedOrders.length && displayedOrders.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                    <button onClick={handleMultiShare} disabled={selectedIds.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: selectedIds.length ? 'var(--color-primary)' : 'var(--color-background)', color: selectedIds.length ? 'white' : 'var(--color-text-muted)', border: selectedIds.length ? 'none' : '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, cursor: selectedIds.length ? 'pointer' : 'not-allowed' }}>
                        <Share2 size={16} /> Share Selected
                    </button>
                </div>
                {/* Existing product list rendering continues*/}
                {displayedOrders.map(order => (
                    <div key={order.id} className="card" data-testid={`order-card-${order.id}`} style={{ marginBottom: '16px', borderLeft: order.status === 'PENDING' ? '4px solid var(--color-warning)' : '4px solid var(--color-success)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => toggleSelection(order.id)} style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}>
                                {selectedIds.includes(order.id) ? <CheckSquare size={20} color="var(--color-primary)" /> : <Square size={20} color="var(--color-text-muted)" />}
                            </button>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Order #{order.id.substring(0, 8)}
                                    {order.reconciled && (
                                        <span style={{
                                            backgroundColor: 'var(--color-primary-light)',
                                            color: 'var(--color-primary-dark)',
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
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                    {new Date(order.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* Offline Indicator */}
                        {order.isOffline && (
                            <div style={{
                                display: 'inline-block',
                                backgroundColor: 'var(--color-info-light)',
                                color: 'var(--color-info-dark)',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                marginBottom: '8px',
                                marginTop: '8px'
                            }}>
                                OFFLINE ORDER
                            </div>
                        )}

                        {/* Items summary */}
                        <div style={{ background: 'var(--color-background)', padding: '10px', borderRadius: '8px', marginBottom: '12px', marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Package size={14} color="var(--color-text-secondary)" /> ORDER ITEMS
                            </div>
                            {order.orderItems?.map((item, idx) => (
                                <div key={idx} style={{ fontSize: '14px', color: 'var(--color-text)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.title}</span>
                                    <span style={{ fontWeight: 600 }}>x {item.quantity}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-text)' }}>
                                <span>Total Paid</span>
                                <span>₹{order.amount}</span>
                            </div>
                            {order.utr && (
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', marginTop: '4px', textAlign: 'right' }}>
                                    UTR: {order.utr}
                                </div>
                            )}
                        </div>

                        {order.shippingAddress && (
                            <div style={{ background: 'var(--color-primary-bg)', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--color-primary-light)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-primary-dark)', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={14} /> SHIPPING ADDRESS
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{order.shippingAddress.name}</div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{order.shippingAddress.mobile}</div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                                    {order.shippingAddress.address},<br />
                                    {order.shippingAddress.city} - {order.shippingAddress.pincode}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            {order.hasImage ? (
                                <button
                                    onClick={() => handleViewImage(order)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-text)', fontSize: '13px', fontWeights: 500 }}
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
                                            border: '1px solid var(--color-primary)',
                                            backgroundColor: 'var(--color-primary-transparent)',
                                            color: 'var(--color-primary)',
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
                                    data-testid={`process-order-${order.id}`}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                    <Package size={16} /> Mark Processing
                                </button>
                            )}
                            {order.status === 'PROCESSING' && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                                        data-testid={`ship-order-${order.id}`}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-warning)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                        data-testid={`complete-order-${order.id}`}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-success)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Check size={16} /> Mark Completed
                                    </button>
                                </>
                            )}
                            {order.status === 'COMPLETED' ? (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-success)', backgroundColor: 'var(--color-surface)', color: 'var(--color-success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TransactionService.archiveTransaction(order.id);
                                            } catch (_err) { alert("Archive Failed"); }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary-dark)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Package size={16} /> Storage
                                    </button>
                                </>
                            ) : null}
                            <button
                                onClick={() => handleDelete(order.id)}
                                data-testid={`delete-order-${order.id}`}
                                style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)' }}
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
