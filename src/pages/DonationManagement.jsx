import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, Package, User, Heart } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import '../components/RegistrationStyles.css';

const TABS = ['RECEIVED', 'ACCEPTED'];
const TAB_LABELS = {
    'RECEIVED': 'Received',
    'ACCEPTED': 'Accepted'
};

const DonationManagement = () => {
    const navigate = useNavigate();
    const [allDonations, setAllDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('RECEIVED');
    const [viewingImage, setViewingImage] = useState(null);

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

    const displayedDonations = allDonations.filter(donation => {
        if (activeTab === 'RECEIVED') return donation.status === 'PENDING';
        return donation.status === 'COMPLETED' || donation.status === 'REGISTERED';
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
        } catch (e) {
            alert("Update Failed");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this donation record?")) {
            await TransactionService.deleteTransaction(id);
        }
    };

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
                title="Donations"
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
                                } catch (e) { alert("Archive Failed"); }
                                setLoading(false);
                            }
                        }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Package size={18} /> Move All to Storage ({getCount('ACCEPTED')})
                    </button>
                </div>
            )}

            <div className="product-list" style={{ marginTop: '16px', padding: '0 16px' }}>
                {loading && <p style={{ textAlign: 'center' }}>Loading Donations...</p>}
                {!loading && displayedDonations.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No {TAB_LABELS[activeTab].toLowerCase()} donations found.
                    </p>
                )}

                {displayedDonations.map(donation => (
                    <div key={donation.id} className="card" style={{ marginBottom: '16px', borderLeft: donation.status === 'PENDING' ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                Donation #{donation.id.substring(0, 8)}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                {new Date(donation.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Amount */}
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Heart size={14} className="text-red-500" /> DONATION AMOUNT
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                                ₹{donation.amount}
                            </div>
                            {donation.utr && (
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', marginTop: '4px' }}>
                                    UTR: {donation.utr}
                                </div>
                            )}
                        </div>

                        {/* Donor details */}
                        {(donation.shippingAddress || donation.primaryApplicant) && (
                            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={14} /> DONOR DETAILS {donation.isOffline && <span style={{ color: '#059669', fontSize: '10px' }}>(OFFLINE)</span>}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                    {(donation.shippingAddress || donation.primaryApplicant).name}
                                </div>
                                <div style={{ fontSize: '14px', color: '#4b5563' }}>
                                    {(donation.shippingAddress || donation.primaryApplicant).mobile}
                                </div>
                                {(donation.shippingAddress || donation.primaryApplicant).pan && (
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        PAN: {(donation.shippingAddress || donation.primaryApplicant).pan}
                                    </div>
                                )}
                                <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                                    {(donation.shippingAddress || donation.primaryApplicant).city || donation.place}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            {donation.hasImage && (
                                <button
                                    onClick={() => handleViewImage(donation.id)}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white', fontSize: '13px', fontWeight: 500 }}
                                >
                                    View Receipt
                                </button>
                            )}
                            {(donation.status === 'PENDING' || (donation.isOffline && donation.status === 'REGISTERED' && activeTab === 'RECEIVED')) && (
                                <button
                                    onClick={() => handleUpdateStatus(donation.id, 'COMPLETED')}
                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                    <Check size={16} /> Accept Donation
                                </button>
                            )}
                            {(donation.status === 'COMPLETED' || (donation.isOffline && donation.status === 'REGISTERED' && activeTab === 'ACCEPTED')) && (
                                <>
                                    <button
                                        onClick={() => handleUpdateStatus(donation.id, 'PENDING')}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #6b7280', backgroundColor: 'white', color: '#4b5563', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Rewind size={16} /> Revert
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await TransactionService.archiveTransaction(donation.id);
                                            } catch (e) { alert("Archive Failed"); }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: 'white', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Package size={16} /> Storage
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => handleDelete(donation.id)}
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

export default DonationManagement;
