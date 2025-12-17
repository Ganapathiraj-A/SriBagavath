import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'REGISTERED', 'HOLD', 'BNK_VERIFIED'];
const TAB_LABELS = {
    'PENDING': 'Pending',
    'REGISTERED': 'Approved',
    'HOLD': 'Hold',
    'BNK_VERIFIED': 'Verified'
};

const AdminReview = () => {
    const navigate = useNavigate();
    const [allRegs, setAllRegs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [filterProduct, setFilterProduct] = useState("All");

    useEffect(() => {
        const unsubscribe = TransactionService.streamTransactions((data) => {
            setAllRegs(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Derived State
    const filteredByProduct = filterProduct === "All"
        ? allRegs
        : allRegs.filter(r => r.itemName === filterProduct);

    const displayedRegs = filteredByProduct.filter(r => {
        if (activeTab === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'BNK_VERIFIED' && r.status !== 'REJECTED');
        return r.status === activeTab;
    });

    const distinctProducts = Array.from(new Set(allRegs.map(r => r.itemName))).filter(Boolean).sort();

    // Counts
    const getCount = (status) => {
        return filteredByProduct.filter(r => {
            if (status === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'BNK_VERIFIED' && r.status !== 'REJECTED');
            return r.status === status;
        }).length;
    };

    // Actions
    const handleUpdate = async (id, newStatus) => {
        try {
            await TransactionService.updateStatus(id, newStatus);
        } catch (e) {
            alert("Update Failed");
        }
    };

    const handleDelete = async (id) => {
        if (confirm("Delete this transaction?")) {
            await TransactionService.deleteTransaction(id);
        }
    };

    const handleDeleteAllVerified = async () => {
        const toDelete = filteredByProduct.filter(r => r.status === 'BNK_VERIFIED');
        if (toDelete.length === 0) return;

        if (confirm(`Delete ALL ${toDelete.length} Verified transactions?`)) {
            for (const tx of toDelete) {
                await TransactionService.deleteTransaction(tx.id);
            }
        }
    };

    // State for Image Modal
    const [viewingImage, setViewingImage] = useState(null);

    const handleViewImage = async (id) => {
        try {
            const base64 = await TransactionService.getImage(id);
            if (base64) {
                setViewingImage(base64);
            } else {
                alert("No Image Found");
            }
        } catch (e) { alert("Error"); }
    };

    // Render Logic
    return (
        <div className="payment-container screen-wrapper" style={{ paddingBottom: '80px' }}>
            {/* Image Modal */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'white', padding: '10px' }}>
                        <img src={`data:image/jpeg;base64,${viewingImage}`} alt="Receipt" className="modal-image" style={{ maxHeight: '80vh' }} />
                        <button className="btn-primary" onClick={() => setViewingImage(null)} style={{ width: '100%', background: '#333' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            <header className="header full-width-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', position: 'relative' }}>
                    {/* <button className="btn-text" onClick={() => navigate(-1)} style={{ position: 'absolute', left: 0 }}><ChevronLeft /></button> */}
                    <h1>Registration</h1>
                </div>

                {/* Filter Row */}
                <div className="filter-row" style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <select
                        value={filterProduct}
                        onChange={e => setFilterProduct(e.target.value)}
                        className="styled-select"
                        style={{ width: '100%' }}
                    >
                        <option value="All">All Programs</option>
                        {distinctProducts.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {/* Totals Summary */}
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        fontSize: '13px',
                        background: '#f3f4f6',
                        padding: '8px',
                        borderRadius: '6px',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ fontWeight: 'bold' }}>Total Regs: {displayedRegs.length}</div>
                        {/* Calculate Stats based on Participants in Displayed Regs */}
                        {(() => {
                            let lDorm = 0, gDorm = 0, rooms = 0, male = 0, female = 0;
                            displayedRegs.forEach(r => {
                                (r.participants || []).forEach(p => {
                                    if (p.accommodation === 'Dorm') {
                                        if (p.gender === 'Female') lDorm++;
                                        else gDorm++;
                                    }
                                    if (p.accommodation === 'Room') rooms++; // Count people in rooms? Or rooms? Assuming people for now based on context.

                                    if (p.gender === 'Female') female++;
                                    else male++;
                                });
                            });
                            return (
                                <>
                                    <div title="Ladies Dorm">L.Dorm: <strong>{lDorm}</strong></div>
                                    <div title="Gents Dorm">G.Dorm: <strong>{gDorm}</strong></div>
                                    <div title="Room">Rooms: <strong>{rooms}</strong></div>
                                    <div title="Male/Female">M/F: <strong>{male}/{female}</strong></div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Tabs */}
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

                {/* Specific Tab Action: Delete All */}
                {activeTab === 'BNK_VERIFIED' && getCount('BNK_VERIFIED') > 0 && (
                    <button className="btn-danger full-width" style={{ marginTop: '8px' }} onClick={handleDeleteAllVerified}>
                        <Trash2 size={16} /> Delete All Verified ({getCount('BNK_VERIFIED')})
                    </button>
                )}

            </header>

            <div className="product-list" style={{ marginTop: '16px' }}>
                {loading && <p>Loading...</p>}
                {!loading && displayedRegs.length === 0 && <p style={{ textAlign: 'center', padding: '20px' }}>No transactions in {TAB_LABELS[activeTab]}</p>}

                {displayedRegs.map(tx => {
                    const parsed = tx.parsedAmount ? parseFloat(tx.parsedAmount) : null;
                    const standardPrice = tx.amount || 0;
                    const isMatch = parsed !== null && Math.abs(parsed - standardPrice) < 1.0;
                    const amountColor = (parsed !== null) ? (isMatch ? '#006400' : 'red') : 'inherit';

                    return (
                        <div key={tx.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>{tx.itemName}</h3>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                                    ₹{tx.amount}
                                </span>
                            </div>

                            <div className="meta-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                {tx.participantCount > 1 && (
                                    <div style={{ fontSize: '14px', color: '#333' }}>
                                        <strong>Participants:</strong> {tx.participantCount}
                                    </div>
                                )}
                                {tx.place && (
                                    <div style={{ fontSize: '14px', color: '#333' }}>
                                        <strong>Place:</strong> {tx.place}
                                    </div>
                                )}
                                <div style={{ fontSize: '14px', color: '#333' }}>
                                    <strong>From:</strong> {(() => {
                                        const text = tx.ocrText || "";
                                        const lines = text.split('\n');
                                        const fromLine = lines.find(l => l.toLowerCase().includes("from"));
                                        return fromLine ? fromLine.replace(/from[:\s]*/i, "").trim() : 'OCR Unknown';
                                    })()}
                                </div>
                                <div style={{ fontSize: '14px', color: '#555' }}>
                                    <strong>Date Time:</strong> {new Date(tx.timestamp?.seconds * 1000 || Date.now()).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: amountColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <strong>Detected Amount:</strong> ₹{tx.parsedAmount || '0'}
                                    {isMatch ? <Check size={16} color="green" /> : <X size={16} color="red" />}
                                </div>
                            </div>

                            {/* Participants List */}
                            {tx.participants && tx.participants.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                    <strong>Details:</strong>
                                    {tx.participants.map((p, idx) => (
                                        <div key={idx} style={{ marginLeft: '8px' }}>
                                            {idx + 1}. {p.name} ({p.gender}, {p.age}) - {p.accommodation}
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '4px' }}><strong>Primary:</strong> {tx.primaryApplicant?.name} ({tx.primaryApplicant?.mobile})</div>
                                </div>
                            )}

                            {tx.hasImage && (
                                <button className="btn-text" onClick={() => handleViewImage(tx.id)} style={{ marginTop: '8px', padding: 0, textAlign: 'left' }}>View Receipt</button>
                            )}

                            {/* Workflows */}
                            <div className="action-row">
                                {/* PENDING Tab Actions */}
                                {activeTab === 'PENDING' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Check size={16} /> Approve</button>
                                        <button className="btn-hold" onClick={() => handleUpdate(tx.id, 'HOLD')}><AlertCircle size={16} /> Hold</button>
                                    </>
                                )}

                                {/* APPROVED (Registered) Tab Actions */}
                                {activeTab === 'REGISTERED' && (
                                    <>
                                        <button className="btn-bnk" onClick={() => handleUpdate(tx.id, 'BNK_VERIFIED')}><Check size={16} /> BNK Verify</button>
                                        <button className="btn-pink" onClick={() => handleUpdate(tx.id, 'PENDING')}><Rewind size={16} /> Pending</button>
                                        <button className="btn-hold" onClick={() => handleUpdate(tx.id, 'HOLD')}><AlertCircle size={16} /> Hold</button>
                                    </>
                                )}

                                {/* HOLD Tab Actions */}
                                {activeTab === 'HOLD' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Check size={16} /> Approve</button>
                                        <button className="btn-pink" onClick={() => handleUpdate(tx.id, 'PENDING')}><Rewind size={16} /> Pending</button>
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)}><Trash2 size={16} /> Delete</button>
                                    </>
                                )}

                                {/* VERIFIED Tab Actions */}
                                {activeTab === 'BNK_VERIFIED' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Rewind size={16} /> Revert</button>
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)}><Trash2 size={16} /> Delete</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminReview;
