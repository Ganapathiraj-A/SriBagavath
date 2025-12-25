import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X, LogOut } from 'lucide-react';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'REGISTERED', 'HOLD', 'BNK_VERIFIED'];
const TAB_LABELS = {
    'PENDING': 'Pending',
    'REGISTERED': 'Approved',
    'HOLD': 'Hold',
    'BNK_VERIFIED': 'Completed'
};

import { signOut } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';

const AdminReview = () => {
    const navigate = useNavigate();
    const [allRegs, setAllRegs] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]); // Master Program List
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [filterProduct, setFilterProduct] = useState("All");

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            try {
                await GoogleAuth.signOut();
                try {
                    await GoogleAuth.disconnect();
                } catch (dErr) {
                    console.warn("Disconnect failed:", dErr);
                }
            } catch (e) {
                console.warn("Google SignOut Error", e);
            }
            await signOut(auth);
            navigate('/');
        }
    };

    useEffect(() => {
        const unsubscribe = TransactionService.streamTransactions((data) => {
            setAllRegs(data);
            setLoading(false);
        });

        // Fetch Master Programs for Date Fallback (for old transactions)
        const fetchPrograms = async () => {
            try {
                const { collection, getDocs } = await import('firebase/firestore');
                const { db } = await import('../firebase');
                const snapshot = await getDocs(collection(db, 'programs'));
                const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllPrograms(progs);
            } catch (e) {
                console.error("Failed to fetch programs", e);
            }
        };
        fetchPrograms();

        return () => unsubscribe();
    }, []);

    // Helper: Find Program Details if missing in Transaction
    const getProgramDetails = (tx) => {
        // First try by ID (Exact Match)
        if (tx.programId) {
            const match = allPrograms.find(p => p.id === tx.programId);
            if (match) {
                return {
                    date: match.programDate,
                    city: match.programCity
                };
            }
        }

        // Second try explicit saved fields (Backward Compatibility)
        if (tx.programDate && tx.programCity) {
            return { date: tx.programDate, city: tx.programCity };
        }

        // Fallback: Find by Name in Master List (Collision Risk)
        const match = allPrograms.find(p => p.programName === tx.itemName);
        if (match) {
            return {
                date: tx.programDate || match.programDate,
                city: tx.programCity || match.programCity
            };
        }
        return { date: "", city: "" }; // None found
    };

    // Derived State
    // Group unique programs by Name + Date + City
    const distinctPrograms = Array.from(new Set(allRegs.map(r => {
        const details = getProgramDetails(r);
        const key = JSON.stringify({
            name: r.itemName,
            date: details.date || "",
            city: details.city || ""
        });
        return key;
    }))).map(k => JSON.parse(k)).sort((a, b) => a.name.localeCompare(b.name));

    const filteredByProduct = filterProduct === "All"
        ? allRegs
        : allRegs.filter(r => {
            if (filterProduct === "All") return true;
            try {
                const criteria = JSON.parse(filterProduct);
                const details = getProgramDetails(r);
                return r.itemName === criteria.name &&
                    (details.date || "") === criteria.date &&
                    (details.city || "") === criteria.city;
            } catch (e) { return true; }
        });

    const displayedRegs = filteredByProduct.filter(r => {
        if (activeTab === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'BNK_VERIFIED' && r.status !== 'REJECTED');
        return r.status === activeTab;
    });

    // Counts
    const getCount = (status) => {
        return filteredByProduct.filter(r => {
            if (status === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'BNK_VERIFIED' && r.status !== 'REJECTED');
            return r.status === status;
        }).reduce((acc, r) => acc + (r.participantCount || 1), 0);
    };

    const formatProgramLabel = (p) => {
        let label = p.name;
        if (p.date) {
            const d = new Date(p.date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            label += ` (${dateStr}`;
            if (p.city) label += ` - ${p.city}`;
            label += `)`;
        }
        return label;
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

        if (confirm(`Delete ALL ${toDelete.length} Completed transactions?`)) {
            for (const tx of toDelete) {
                await TransactionService.deleteTransaction(tx.id);
            }
        }
    };

    // State for Image Modal
    const [viewingImage, setViewingImage] = useState(null);
    const [viewingReg, setViewingReg] = useState(null);

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
                        <button className="btn-primary" onClick={() => setViewingImage(null)} style={{ width: '100%', background: '#2563eb' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Registration Details Modal */}
            {viewingReg && (
                <div className="modal-overlay" onClick={() => setViewingReg(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        flexDirection: 'column',
                        background: 'white',
                        padding: '20px',
                        maxWidth: '90%',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        borderRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Registration Info</h2>
                            <button onClick={() => setViewingReg(null)} style={{ border: 'none', background: 'none', padding: '5px' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>Program</h3>
                                <div style={{ fontWeight: 600 }}>
                                    {viewingReg.itemName}
                                    {(() => {
                                        const details = getProgramDetails(viewingReg);
                                        if (details.date) {
                                            return (
                                                <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginLeft: '6px' }}>
                                                    ({new Date(details.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {details.city ? ` - ${details.city}` : ''})
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>Amount Paid</h3>
                                    <div style={{ fontWeight: 600, color: '#006400' }}>₹{viewingReg.amount}</div>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>Coming From</h3>
                                    <div style={{ fontWeight: 600 }}>{viewingReg.place || 'Not Specified'}</div>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />

                            <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Participants ({viewingReg.participants?.length || 0})</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {viewingReg.participants?.map((p, i) => (
                                    <div key={i} style={{
                                        background: '#f9fafb',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid #f3f4f6'
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#111' }}>{i + 1}. {p.name}</div>
                                        <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px' }}>
                                            {p.gender}, {p.age} yrs • {p.accommodation}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#4b5563' }}>Mobile: {p.mobile}</div>
                                    </div>
                                ))}
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />

                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#666' }}>Primary Contact</h3>
                                <div style={{ fontWeight: 600 }}>{viewingReg.primaryApplicant?.name}</div>
                                <div style={{ fontSize: '14px' }}>{viewingReg.primaryApplicant?.mobile}</div>
                            </div>

                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px' }}>
                                Transaction ID: {viewingReg.id}
                            </div>
                        </div>

                        <button className="btn-primary" onClick={() => setViewingReg(null)} style={{ marginTop: '20px', width: '100%', background: '#2563eb' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            <PageHeader
                title="Registration"
                rightAction={
                    <button onClick={handleLogout} className="btn-icon" style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>
                        <LogOut size={20} />
                    </button>
                }
            />

            {/* Sub-Header / Filters Wrapper */}
            <div style={{ backgroundColor: 'white', padding: '10px 16px', borderBottom: '1px solid #eee' }}>
                {/* Filter Row */}
                <div className="filter-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <select
                        value={filterProduct}
                        onChange={e => setFilterProduct(e.target.value)}
                        className="styled-select"
                        style={{ width: '100%' }}
                    >
                        <option value="All">All Programs</option>
                        {distinctPrograms.map((p, idx) => (
                            <option key={idx} value={JSON.stringify(p)}>{formatProgramLabel(p)}</option>
                        ))}
                    </select>

                    {/* Totals Summary */}
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column', // Stack vertically
                        gap: '8px',
                        fontSize: '13px',
                        background: '#f3f4f6',
                        padding: '8px',
                        borderRadius: '6px',
                    }}>
                        {/* Line 1: Main Counts */}
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '0px' }}>
                            Registrations: {filteredByProduct.length} <span style={{ color: '#ccc', margin: '0 8px' }}>|</span> Participants: {filteredByProduct.reduce((acc, r) => acc + (r.participantCount || 1), 0)}
                        </div>

                        {/* Line 2: Details */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
                            {/* Calculate Stats */}
                            {(() => {
                                let dormMale = 0, dormFemale = 0;
                                let roomMale = 0, roomFemale = 0;
                                let totalMale = 0, totalFemale = 0;

                                // FIX: Use filteredByProduct (All tabs)
                                filteredByProduct.forEach(r => {
                                    (r.participants || []).forEach(p => {
                                        const isFemale = p.gender === 'Female';

                                        if (isFemale) totalFemale++;
                                        else totalMale++;

                                        if (p.accommodation === 'Dorm') {
                                            if (isFemale) dormFemale++;
                                            else dormMale++;
                                        } else if (p.accommodation === 'Room') {
                                            if (isFemale) roomFemale++;
                                            else roomMale++;
                                        }
                                    });
                                });
                                return (
                                    <>
                                        <div title="Dorms (Male/Female)">Dorms(M/F): <strong>{dormMale}/{dormFemale}</strong></div>
                                        <div title="Rooms (Male/Female)">Rooms(M/F): <strong>{roomMale}/{roomFemale}</strong></div>
                                        <div title="Total (Male/Female)">Total(M/F): <strong>{totalMale}/{totalFemale}</strong></div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs-row" style={{ justifyContent: 'center', marginTop: '10px' }}>
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
                        <Trash2 size={16} /> Delete All Completed ({getCount('BNK_VERIFIED')} Participants)
                    </button>
                )}
            </div>

            <div className="product-list" style={{ marginTop: '16px' }}>
                {loading && <p>Loading...</p>}
                {!loading && displayedRegs.length === 0 && <p style={{ textAlign: 'center', padding: '20px' }}>No transactions in {TAB_LABELS[activeTab]}</p>}

                {displayedRegs.map(tx => {
                    const parsed = tx.parsedAmount ? parseFloat(tx.parsedAmount) : null;
                    const standardPrice = tx.amount || 0;
                    const isMatch = parsed !== null && Math.abs(parsed - standardPrice) < 1.0;
                    const amountColor = (parsed !== null) ? (isMatch ? '#006400' : 'red') : 'inherit';

                    // Fallback details
                    const details = getProgramDetails(tx);

                    return (
                        <div key={tx.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <h3 style={{ margin: 0, fontSize: '16px' }}>
                                    {tx.itemName}
                                    {details.date && (
                                        <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#555', marginLeft: '6px' }}>
                                            ({new Date(details.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {details.city ? ` - ${details.city}` : ''})
                                        </span>
                                    )}
                                </h3>
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
                                <div style={{ fontSize: '14px', color: '#333' }}>
                                    <strong>Applied By:</strong> {(() => {
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

                            {tx.place && (
                                <div style={{ fontSize: '14px', color: '#333', marginTop: '8px' }}>
                                    <strong>Coming From:</strong> {tx.place}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                                {tx.hasImage && (
                                    <button className="btn-text" onClick={() => handleViewImage(tx.id)} style={{ padding: 0 }}>View Receipt</button>
                                )}
                                <button className="btn-text" onClick={() => setViewingReg(tx)} style={{ padding: 0 }}>View Registration Info</button>
                            </div>

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
                                        <button className="btn-bnk" onClick={() => handleUpdate(tx.id, 'BNK_VERIFIED')}><Check size={16} /> Mark Completed</button>
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
