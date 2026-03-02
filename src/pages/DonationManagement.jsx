import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, Package, Heart, X, Search, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { TransactionService } from '@/services/TransactionService';
import PageHeader from '@/components/PageHeader';
import { compressImage } from '@/utils/imageUtils';
import { formatDate } from '@/utils/dateUtils';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';

const TABS = ['RECEIVED', 'ACCEPTED'];
const TAB_LABELS = {
    'RECEIVED': 'Received',
    'ACCEPTED': 'Accepted'
};

const STATUS_LABELS = {
    'PENDING': 'Pending Verification',
    'COMPLETED': 'Verified & Accepted',
    'REJECTED': 'Rejected',
    'REGISTERED': 'Offline Success'
};

const STATUS_STYLES = {
    'PENDING': { backgroundColor: 'var(--color-warning-transparent)', color: 'var(--color-warning)' },
    'COMPLETED': { backgroundColor: 'var(--color-success-transparent)', color: 'var(--color-success)' },
    'REGISTERED': { backgroundColor: 'var(--color-success-transparent)', color: 'var(--color-success)' },
    'REJECTED': { backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)' }
};

const DonationManagement = () => {
    const navigate = useNavigate();
    const { appVersion } = useGlobalSettings();
    const [allDonations, setAllDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('RECEIVED');
    const [viewingImage, setViewingImage] = useState(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(null); // stores id of donation being updated
    const [editingUtrValue, setEditingUtrValue] = useState('');
    const [editingAmountValue, setEditingAmountValue] = useState('');
    const [editingParsedAmountValue, setEditingParsedAmountValue] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStatus, setActiveStatus] = useState('ALL');

    useEffect(() => {
        // Clear badges (Sharing same logic as Bookstore for now or could have its own)
        localStorage.setItem('lastVisited_donation_management', new Date().toISOString());

        const unsubscribe = TransactionService.streamTransactions((data) => {
            const donations = data.filter(tx => tx.itemType === 'DONATION');
            setAllDonations(donations);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getDonationStatusStyles = (status) => {
        return STATUS_STYLES[status] || { backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)' };
    };

    const getStatusFilterOptions = () => {
        if (activeTab === 'RECEIVED') {
            return [
                { id: 'ALL', label: 'All Received' },
                { id: 'PENDING', label: 'Pending' }
            ];
        } else {
            return [
                { id: 'ALL', label: 'All Accepted' },
                { id: 'COMPLETED', label: 'Verified' },
                { id: 'REGISTERED', label: 'Offline' }
            ];
        }
    };

    const displayedDonations = allDonations.filter(donation => {
        // Tab Filter
        const inActiveTab = activeTab === 'RECEIVED'
            ? donation.status === 'PENDING'
            : (donation.status === 'COMPLETED' || donation.status === 'REGISTERED');

        if (!inActiveTab) return false;

        // Status Sub-filter
        if (activeStatus !== 'ALL' && donation.status !== activeStatus) return false;

        // Search Filter
        const matchesSearch = !searchTerm.trim() ||
            donation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            donation.donationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            donation.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            donation.utr?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const getCount = (tab) => {
        return allDonations.filter(donation => {
            if (tab === 'RECEIVED') return donation.status === 'PENDING';
            return donation.status === 'COMPLETED' || donation.status === 'REGISTERED';
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
        if (confirm("Delete this donation record?")) {
            await TransactionService.deleteTransaction(id);
        }
    };

    const handleViewImage = async (donation) => {
        try {
            const base64 = await TransactionService.getImage(donation.id);
            if (base64) {
                setViewingImage({
                    base64,
                    id: donation.id,
                    utr: donation.utr,
                    amount: donation.amount,
                    parsedAmount: donation.parsedAmount,
                    ocrText: donation.ocrText || ''
                });
                setEditingUtrValue(donation.utr || '');
                setEditingAmountValue(donation.amount?.toString() || '');
                setEditingParsedAmountValue(donation.parsedAmount?.toString() || '');
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
            e.target.value = ''; // Reset input
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
                                src={viewingImage.base64.startsWith('data:') ? viewingImage.base64 : `data:image/jpeg;base64,${viewingImage.base64}`}
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
                                                    backgroundColor: editingUtrValue === num ? 'var(--color-primary-bg)' : 'var(--color-surface-alt)',
                                                    color: editingUtrValue === num ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                                    border: editingUtrValue === num ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
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
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Amount</label>
                                    <input
                                        type="number"
                                        value={editingAmountValue}
                                        onChange={(e) => setEditingAmountValue(e.target.value)}
                                        placeholder="Amount..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '14px', outline: 'none', backgroundColor: 'var(--color-input-bg)', color: 'var(--color-text)' }}
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
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border-danger)', fontSize: '15px', outline: 'none', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-text)' }}
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
                                style={{ width: '100%', height: '48px', background: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Donations"
                subtitle={`v${appVersion}`}
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px' }}>
                        <ChevronLeft size={24} color="var(--color-text)" />
                    </button>
                }
            />

            {/* Tabs */}
            <div style={{ backgroundColor: 'var(--color-background)', padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
                <div className="tabs-row" style={{ justifyContent: 'center' }}>
                    {TABS.map(tab => {
                        const count = getCount(tab);
                        return (
                            <button
                                key={tab}
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab); setActiveStatus('ALL'); }}
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

            {/* Search and Filters */}
            <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: 'var(--color-background)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.875rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                }}>
                    <Search size={16} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="Search name, ID or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 0',
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.875rem',
                            backgroundColor: 'transparent',
                            color: 'var(--color-text)'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {getStatusFilterOptions().map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveStatus(id)}
                            style={{
                                padding: '0.4rem 0.875rem',
                                borderRadius: '0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: '1px solid var(--color-border)',
                                backgroundColor: activeStatus === id ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: activeStatus === id ? 'white' : 'var(--color-text-secondary)',
                                transition: 'all 0.2s',
                                flexShrink: 0
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sub-Header Actions */}
            {activeTab === 'ACCEPTED' && getCount('ACCEPTED') > 0 && (
                <div style={{ padding: '0 16px', marginTop: '8px' }}>
                    <button
                        onClick={async () => {
                            const toArchive = allDonations.filter(o => o.status === 'COMPLETED' || o.status === 'REGISTERED');
                            if (confirm(`Move ALL ${toArchive.length} Accepted donations to Storage?`)) {
                                setLoading(true);
                                try {
                                    for (const o of toArchive) {
                                        await TransactionService.archiveTransaction(o.id);
                                    }
                                } catch (_err) { alert("Archive Failed"); }
                                setLoading(false);
                            }
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Package size={18} /> Move All to Storage ({getCount('ACCEPTED')})
                    </button>
                </div>
            )}

            <div className="product-list" style={{ marginTop: '16px', padding: '0 16px' }}>
                {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>Loading donations...</div>}
                {!loading && displayedDonations.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--color-surface)', borderRadius: '1.5rem', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}>
                        <Heart size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>No donations found for this status</p>
                    </div>
                )}

                {displayedDonations.map((donation) => (
                    <motion.div
                        key={donation.id}
                        layout
                        onClick={() => navigate(`/donation-management/${donation.id}`)}
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            padding: '1.25rem',
                            borderRadius: '1.5rem',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>{donation.name}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>ID: {donation.donationId}</p>
                            </div>
                            <div style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                ...getDonationStatusStyles(donation.status)
                            }}>
                                {STATUS_LABELS[donation.status]}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="var(--color-text-muted)" />
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                    {formatDate(donation.timestamp)}
                                </span>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1.1rem' }}>
                                ₹{donation.amount}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={14} color="var(--color-text-muted)" />
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {donation.city}, {donation.state}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                                Details <ChevronRight size={16} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            {donation.hasImage ? (
                                <button
                                    onClick={() => handleViewImage(donation)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-alt)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}
                                >
                                    Verify Receipt
                                </button>
                            ) : (
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <button
                                        disabled={uploadingReceipt === donation.id}
                                        onClick={() => document.getElementById(`receipt-input-${donation.id}`).click()}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--color-primary-light)',
                                            backgroundColor: 'var(--color-primary-bg)',
                                            color: 'var(--color-primary)',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: uploadingReceipt === donation.id ? 'wait' : 'pointer'
                                        }}
                                    >
                                        {uploadingReceipt === donation.id ? 'Uploading...' : 'Add Receipt'}
                                    </button>
                                    <input
                                        type="file"
                                        id={`receipt-input-${donation.id}`}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={(e) => handleAddReceipt(e, donation.id)}
                                    />
                                </div>
                            )}
                            {(donation.status === 'PENDING' || (donation.isOffline && donation.status === 'REGISTERED' && activeTab === 'RECEIVED')) && (
                                <button
                                    onClick={() => handleUpdateStatus(donation.id, 'COMPLETED')}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-success)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                    <Check size={16} /> Accept Donation
                                </button>
                            )}
                            {(donation.status === 'COMPLETED' || (donation.isOffline && donation.status === 'REGISTERED' && activeTab === 'ACCEPTED')) && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(donation.id, 'PENDING')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TransactionService.archiveTransaction(donation.id);
                                            } catch (_err) { alert("Archive Failed"); }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Package size={16} /> Storage
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => handleDelete(donation.id)}
                                style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default DonationManagement;
