import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    X,
    Receipt,
    Search
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { TransactionService } from '../services/TransactionService';

const BankStatementView = () => {
    const navigate = useNavigate();

    // Fetched bank entries will go here
    const [bankEntries, setBankEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [activeTab, setActiveTab] = useState('All Entries');
    const [viewingImage, setViewingImage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'bank_entries'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBankEntries(entries);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const counts = {
        'All Entries': bankEntries.length,
        'Matched': bankEntries.filter(e => e.status === 'MATCHED').length,
        'Unmatched': bankEntries.filter(e => e.status === 'UNMATCHED').length,
        'Pending': bankEntries.filter(e => e.status === 'PENDING').length
    };

    const handleRunMatch = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const { ReconciliationService } = await import('../services/ReconciliationService');
            const result = await ReconciliationService.runMatching();
            alert(`Matching complete! Found ${result.matchCount} new matches.`);
        } catch (e) {
            alert("Matching failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReceipt = async (id, utr) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage({ base64, utr });
            } else {
                alert("No receipt image found for this transaction.");
            }
        } catch (e) {
            console.error("Error fetching receipt:", e);
            alert("Error loading receipt.");
        }
    };

    const filteredEntries = bankEntries.filter(entry => {
        // Tab Filtering
        const tabMatch = activeTab === 'All Entries' || entry.status?.toUpperCase() === activeTab.toUpperCase();
        if (!tabMatch) return false;

        // Search Filtering
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const descMatch = entry.desc?.toLowerCase().includes(query);
            const upiMatch = entry.upiId?.toLowerCase().includes(query);
            return descMatch || upiMatch;
        }

        return true;
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Bank Statement"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office/reconciliation')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <main style={{ padding: '1.5rem', maxWidth: '32rem', margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                    {/* Run Match Button - Centered under header */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                            onClick={handleRunMatch}
                            disabled={loading}
                            style={{
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.75rem',
                                padding: '10px 24px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: loading ? 'wait' : 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? 'Matching...' : 'Run Match Engine'}
                        </button>
                    </div>

                    {/* Receipt Modal */}
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
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '18px' }}>Payment Receipt</h2>
                                        {viewingImage.utr && <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600 }}>UTR: {viewingImage.utr}</div>}
                                    </div>
                                    <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                        <X size={24} color="#666" />
                                    </button>
                                </div>
                                <img
                                    src={`data:image/jpeg;base64,${viewingImage.base64}`}
                                    alt="Receipt"
                                    style={{ width: '100%', borderRadius: '8px', maxHeight: '65vh', objectFit: 'contain', border: '1px solid #eee' }}
                                />
                                <button
                                    onClick={() => setViewingImage(null)}
                                    style={{ width: '100%', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', height: '48px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search UPI or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                fontSize: '0.95rem'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={16} color="#9ca3af" />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'center' }}>
                        {['All Entries', 'Matched', 'Unmatched', 'Pending'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveTab(filter)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: activeTab === filter ? 'var(--color-primary)' : 'white',
                                    color: activeTab === filter ? 'white' : '#4b5563',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '2rem',
                                    fontSize: '0.8125rem',
                                    whiteSpace: 'nowrap',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {filter}
                                <span style={{
                                    backgroundColor: activeTab === filter ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontSize: '0.7rem'
                                }}>
                                    {counts[filter]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>Loading bank entries...</div>
                        ) : filteredEntries.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '1rem', color: '#6b7280' }}>
                                {activeTab === 'All Entries'
                                    ? 'No bank entries found. Upload a statement to get started.'
                                    : `No ${activeTab.toLowerCase()} entries found.`}
                            </div>
                        ) : (
                            filteredEntries.map(entry => (
                                <div key={entry.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8125rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={14} />
                                            {entry.date}
                                        </div>
                                        <div style={{ fontWeight: 700, color: entry.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                            {entry.amount >= 0 ? '+' : ''} ₹{entry.amount?.toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {entry.desc}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: entry.status === 'MATCHED' ? '#10b981' : entry.status === 'UNMATCHED' ? '#ef4444' : '#f59e0b'
                                        }}>
                                            {entry.status === 'MATCHED' && <CheckCircle2 size={14} />}
                                            {entry.status === 'UNMATCHED' && <XCircle size={14} />}
                                            {entry.status === 'PENDING' && <Clock size={14} />}
                                            {entry.status}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setSelectedEntry(entry)}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: '#4b5563',
                                                    background: 'white',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '0.375rem',
                                                    padding: '4px 8px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View
                                            </button>
                                            {entry.status !== 'MATCHED' && (
                                                <button style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--color-primary)',
                                                    background: 'none',
                                                    border: '1px solid var(--color-primary)',
                                                    borderRadius: '0.375rem',
                                                    padding: '4px 8px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}>
                                                    Reconcile
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </main>

            {/* Transaction Detail Modal */}
            {
                selectedEntry && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1.5rem'
                    }} onClick={() => setSelectedEntry(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '1rem',
                                maxWidth: '28rem',
                                width: '100%',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Transaction Details</h3>
                                <button
                                    onClick={() => setSelectedEntry(null)}
                                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 600, marginBottom: '0.25rem' }}>
                                        Full Description / Narration
                                    </div>
                                    <div style={{ fontSize: '1rem', color: '#111827', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                        {selectedEntry.desc}
                                    </div>
                                </div>

                                {selectedEntry.upiId && (
                                    <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #dbeafe' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 600, marginBottom: '0.25rem' }}>
                                            UPI ID Detected
                                        </div>
                                        <div style={{ fontSize: '1rem', color: '#1e3a8a', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {selectedEntry.upiId}
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Date</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedEntry.date}</div>
                                    </div>
                                    <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Amount</div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: selectedEntry.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                            {selectedEntry.amount >= 0 ? '+' : ''} ₹{selectedEntry.amount?.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Fingerprint (Deduplication ID)</div>
                                    <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>{selectedEntry.fingerprint}</div>
                                </div>
                            </div>

                            {selectedEntry.status === 'MATCHED' && selectedEntry.matchedTransactionId && (
                                <button
                                    onClick={() => handleViewReceipt(selectedEntry.matchedTransactionId, selectedEntry.matchedUtr)}
                                    style={{
                                        width: '100%',
                                        marginTop: '0.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: '#f3f4f6',
                                        color: '#374151',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.5rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Receipt size={16} /> View Matched Receipt
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedEntry(null)}
                                style={{
                                    width: '100%',
                                    marginTop: '1.5rem',
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close Details
                            </button>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};

export default BankStatementView;
