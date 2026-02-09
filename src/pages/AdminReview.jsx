import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X, LogOut, Package, Image, Info } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { TransactionService } from '../services/TransactionService';
import PageHeader from '../components/PageHeader';
import { compressImage } from '../utils/imageUtils';
import OCR from '../plugins/OCRPlugin';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'REGISTERED', 'HOLD', 'COMPLETED'];
const TAB_LABELS = {
    'PENDING': 'Pending',
    'REGISTERED': 'Approved',
    'HOLD': 'Hold',
    'COMPLETED': 'Completed'
};

import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AdminReview = () => {
    const navigate = useNavigate();
    const [allRegs, setAllRegs] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]); // Master Program List
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [filterProduct, setFilterProduct] = useState("All");
    const [filterSource, setFilterSource] = useState("All"); // All, Online, Offline

    // Receipt Editing States
    const [editingUtrValue, setEditingUtrValue] = useState('');
    const [editingAmountValue, setEditingAmountValue] = useState('');
    const [editingParsedAmountValue, setEditingParsedAmountValue] = useState('');
    const [savingDetails, setSavingDetails] = useState(false);
    const [uploadingReceipt, setUploadingReceipt] = useState(null); // stores id of tx being updated

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            if (Capacitor.isNativePlatform()) {
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
            }
            await signOut(auth);
            navigate('/');
        }
    };

    useEffect(() => {
        // Update last visit timestamp to clear badges
        localStorage.setItem('lastVisited_registrations', new Date().toISOString());
        localStorage.setItem('badge_registrations', '0');

        const unsubscribe = TransactionService.streamTransactions((data) => {
            const registrations = data.filter(tx => tx.itemType === 'PROGRAM');
            setAllRegs(registrations);
            setLoading(false);
        });

        // Fetch Master Programs for Date Fallback (for old transactions)
        const fetchPrograms = async () => {
            try {
                const { collection, getDocs } = await import('@/utils/FirestoreProxy');
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

    // Filter by Source (Refactored to be reusable)
    const filteredBySource = filteredByProduct.filter(r => {
        if (filterSource === 'Online' && r.isOffline) return false;
        if (filterSource === 'Offline' && !r.isOffline) return false;
        return true;
    });

    const displayedRegs = filteredBySource.filter(r => {
        if (activeTab === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'COMPLETED' && r.status !== 'REJECTED');
        return r.status === activeTab;
    });

    // Counts
    const getCount = (status) => {
        return filteredBySource.filter(r => {
            if (status === 'PENDING') return r.status === 'PENDING' || (r.status !== 'REGISTERED' && r.status !== 'HOLD' && r.status !== 'COMPLETED' && r.status !== 'REJECTED');
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

    const handleArchive = async (id) => {
        try {
            await TransactionService.archiveTransaction(id);
        } catch (e) {
            alert("Archive Failed");
        }
    };

    const handleArchiveAll = async () => {
        const toArchive = filteredByProduct.filter(r => r.status === 'COMPLETED');
        if (toArchive.length === 0) return;

        if (confirm(`Move ALL ${toArchive.length} Completed transactions to Storage?`)) {
            setLoading(true);
            try {
                for (const tx of toArchive) {
                    await TransactionService.archiveTransaction(tx.id);
                }
                alert("Move to storage successful!");
            } catch (e) {
                alert("Archive Failed");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteAllVerified = async () => {
        const toDelete = filteredByProduct.filter(r => r.status === 'COMPLETED');
        if (toDelete.length === 0) return;

        const password = prompt("Final Warning: This will permanently delete ALL completed records. Enter password to proceed:");
        if (password === "413800") {
            for (const tx of toDelete) {
                await TransactionService.deleteTransaction(tx.id);
            }
            alert(`Successfully deleted ${toDelete.length} records.`);
        } else if (password !== null) {
            alert("Incorrect password.");
        }
    };

    // State for Image Modal
    const [viewingImage, setViewingImage] = useState(null);
    const [viewingReg, setViewingReg] = useState(null);

    const extractUtrSuggestions = (text) => {
        if (!text) return [];
        const matches = text.match(/\b\d{12}\b/g) || [];
        return [...new Set(matches)];
    };

    const highlightUTR = (text, utr) => {
        if (!utr || !text) return text;
        const parts = text.split(new RegExp(`(${utr})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === utr.toLowerCase()
                        ? <span key={i} style={{ backgroundColor: '#fef08a', color: '#854d0e', fontWeight: 600, padding: '0 2px', borderRadius: '2px' }}>{part}</span>
                        : part
                )}
            </span>
        );
    };

    const handleViewImage = async (tx) => {
        try {
            const base64 = await TransactionService.getImage(tx.id);
            if (base64) {
                setViewingImage({
                    base64,
                    utr: tx.utr,
                    amount: tx.amount,
                    parsedAmount: tx.parsedAmount,
                    id: tx.id,
                    ocrText: tx.ocrText || '',
                    mismatchedBankEntryId: tx.mismatchedBankEntryId,
                    mismatchedBankAmount: tx.mismatchedBankAmount,
                    mismatchedBankDesc: tx.mismatchedBankDesc,
                    mismatchedBankDate: tx.mismatchedBankDate
                });
                setEditingUtrValue(tx.utr || '');
                setEditingAmountValue(tx.amount?.toString() || '');
                setEditingParsedAmountValue(tx.parsedAmount?.toString() || '');
            } else {
                alert("No Image Found");
            }
        } catch (e) {
            console.error("Error fetching receipt:", e);
            alert("Error loading receipt.");
        }
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

    const handleUpdateReceiptInModal = async (e) => {
        if (!viewingImage) return;
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSavingDetails(true); // Reuse savingDetails for modal loading
            const base64 = await compressImage(file);

            // 1. Run OCR on new image
            let ocrRes = { rawText: '', transactionId: '', amount: null };
            try {
                const result = await OCR.detectText({ base64Image: base64 });
                ocrRes = {
                    rawText: result.rawText || '',
                    transactionId: result.transactionId || '',
                    amount: result.amount || null
                };
            } catch (ocrErr) {
                console.warn("OCR failed during update", ocrErr);
            }

            // 2. Upload to storage
            await TransactionService.uploadReceipt(viewingImage.id, base64);

            // 3. Update Meta in Firestore (Update OCR Text)
            await TransactionService.updateTransactionDetails(viewingImage.id, {
                ocrText: ocrRes.rawText
            });

            // 4. Update Modal UI State
            setViewingImage(prev => ({
                ...prev,
                base64: base64,
                ocrText: ocrRes.rawText
            }));

            if (ocrRes.transactionId) setEditingUtrValue(ocrRes.transactionId);
            if (ocrRes.amount) setEditingParsedAmountValue(ocrRes.amount.toString());

            alert("Receipt updated and re-processed successfully!");
        } catch (error) {
            console.error("Receipt update failed", error);
            alert("Update failed: " + error.message);
        } finally {
            setSavingDetails(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleSaveDetails = async () => {
        if (!viewingImage || savingDetails) return;
        setSavingDetails(true);
        try {
            const { updateDoc, doc, deleteField, serverTimestamp, writeBatch } = await import('@/utils/FirestoreProxy');
            const { db } = await import('../firebase');
            const newAmount = parseFloat(editingAmountValue);
            const newParsedAmount = parseFloat(editingParsedAmountValue);

            if (isNaN(newAmount)) {
                alert("Please enter a valid number for the registration amount.");
                setSavingDetails(false);
                return;
            }

            const batch = writeBatch(db);
            let updateCount = 0;

            const updates = {
                utr: editingUtrValue,
                amount: newAmount,
                parsedAmount: isNaN(newParsedAmount) ? deleteField() : newParsedAmount,
            };

            const isNowMatchingBank = viewingImage.mismatchedBankEntryId &&
                (Math.abs(parseFloat(newAmount)) === Math.abs(parseFloat(viewingImage.mismatchedBankAmount)));

            if (isNowMatchingBank) {
                updates.reconciled = true;
                updates.reconciledAt = serverTimestamp();
                updates.reconciledBy = 'MANUAL_FIX_REVIEW';
                updates.bankEntryId = viewingImage.mismatchedBankEntryId;
                updates.bankDescription = viewingImage.mismatchedBankDesc;
                updates.bankDate = viewingImage.mismatchedBankDate;

                updates.amountMismatch = deleteField();
                updates.mismatchedBankAmount = deleteField();
                updates.mismatchedBankDesc = deleteField();
                updates.mismatchedBankDate = deleteField();
                updates.mismatchedBankEntryId = deleteField();

                batch.update(doc(db, 'transactions', viewingImage.id), updates);
                updateCount++;

                const bankRef = doc(db, 'bank_entries', viewingImage.mismatchedBankEntryId);
                batch.update(bankRef, {
                    status: 'MATCHED',
                    matchedTransactionId: viewingImage.id,
                    matchedAt: serverTimestamp()
                });
                updateCount++;
            } else {
                updates.amountMismatch = deleteField();
                updates.mismatchedBankAmount = deleteField();
                updates.mismatchedBankDesc = deleteField();
                updates.mismatchedBankDate = deleteField();
                updates.mismatchedBankEntryId = deleteField();

                batch.update(doc(db, 'transactions', viewingImage.id), updates);
                updateCount++;
            }

            if (updateCount > 0) {
                await batch.commit();
            }
            setViewingImage(null);
            alert(isNowMatchingBank ? "Match verified and corrected!" : "Details updated successfully!");
        } catch (e) {
            alert("Failed to update details: " + e.message);
        } finally {
            setSavingDetails(false);
        }
    };

    // Render Logic
    return (
        <div className="payment-container screen-wrapper" style={{ paddingBottom: '80px' }}>
            {/* Advanced Receipt View / Edit Modal */}
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        background: 'white',
                        padding: '1.25rem',
                        borderRadius: '1.5rem',
                        maxWidth: '28rem',
                        width: '100%',
                        maxHeight: '92vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Verify Receipt</h2>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>Check UTR and Amount against the image</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={() => document.getElementById('modal-receipt-update').click()}
                                    disabled={savingDetails}
                                    style={{
                                        border: 'none',
                                        background: '#eff6ff',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#2563eb',
                                        fontSize: '13px',
                                        fontWeight: 600
                                    }}
                                >
                                    <Image size={16} /> Update Receipt
                                </button>
                                <input
                                    type="file"
                                    id="modal-receipt-update"
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleUpdateReceiptInModal}
                                />
                                <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: '#f3f4f6', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                                    <X size={20} color="#6b7280" />
                                </button>
                            </div>
                        </div>

                        {/* Receipt Image */}
                        <div style={{ position: 'relative', borderRadius: '1rem', overflowY: 'auto', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <img
                                src={viewingImage.base64.startsWith('data:') ? viewingImage.base64 : `data:image/jpeg;base64,${viewingImage.base64}`}
                                alt="Receipt"
                                style={{ width: '100%', display: 'block' }}
                            />
                            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', backgroundColor: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: '#374151', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                Receipt Image
                            </div>
                        </div>

                        {/* OCR Text / Suggestions */}
                        <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>Detecting UTR from Receipt</span>
                                {extractUtrSuggestions(viewingImage.ocrText).length > 0 && <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Found Suggestions</span>}
                            </div>

                            {extractUtrSuggestions(viewingImage.ocrText).length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {extractUtrSuggestions(viewingImage.ocrText).map(sug => (
                                        <button
                                            key={sug}
                                            onClick={() => setEditingUtrValue(sug)}
                                            style={{ padding: '6px 12px', backgroundColor: editingUtrValue === sug ? '#dbeafe' : 'white', color: editingUtrValue === sug ? '#1e40af' : '#475569', border: `1px solid ${editingUtrValue === sug ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No UTR-like numbers detected. Please enter manually.</div>
                            )}

                            <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Raw OCR Preview</div>
                                <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5', maxHeight: '100px', overflowY: 'auto', backgroundColor: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap' }}>
                                    {highlightUTR(viewingImage.ocrText, editingUtrValue)}
                                </div>
                            </div>
                        </div>

                        {/* Edit Fields */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Reg. Amount</label>
                                    <input
                                        type="number"
                                        value={editingAmountValue}
                                        onChange={(e) => setEditingAmountValue(e.target.value)}
                                        placeholder="Reg Amount..."
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>OCR Amount (Detected from Receipt)</label>
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
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: savingDetails ? 'wait' : 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    marginTop: '4px'
                                }}
                            >
                                {savingDetails ? 'Saving Changes...' : 'Save Updated Details'}
                            </button>
                        </div>

                        <button
                            onClick={() => setViewingImage(null)}
                            style={{
                                width: '100%',
                                height: '48px',
                                minHeight: '48px',
                                flexShrink: 0,
                                background: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '15px',
                                cursor: 'pointer',
                                marginTop: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                        >
                            Dismiss
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
                                            {p.gender}, {p.age} yrs
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#4b5563' }}>Mobile: {p.mobile}</div>
                                    </div>
                                ))}
                            </div>

                            {viewingReg.selectedOptions && viewingReg.selectedOptions.length > 0 && (
                                <>
                                    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
                                    <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>Additional Options</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {viewingReg.selectedOptions.map((opt, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                background: '#eff6ff',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #dbeafe',
                                                fontSize: '14px'
                                            }}>
                                                <span style={{ fontWeight: 500, color: '#1e40af' }}>{opt.name}</span>
                                                <span style={{ fontWeight: 600, color: '#1e40af' }}>₹{opt.fee}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

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
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
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

                    <select
                        value={filterSource}
                        onChange={e => setFilterSource(e.target.value)}
                        className="styled-select"
                        style={{ width: '100%' }}
                    >
                        <option value="All">All Sources</option>
                        <option value="Online">Online Registration</option>
                        <option value="Offline">Offline Registration</option>
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
                                let totalMale = 0, totalFemale = 0;

                                filteredByProduct.forEach(r => {
                                    (r.participants || []).forEach(p => {
                                        if (p.gender === 'Female') totalFemale++;
                                        else totalMale++;
                                    });
                                });
                                return (
                                    <>
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

                {/* Specific Tab Action: Archive/Delete */}
                {activeTab === 'COMPLETED' && getCount('COMPLETED') > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="btn-approve" style={{ flex: 1, backgroundColor: '#4f46e5', color: 'white' }} onClick={handleArchiveAll}>
                            <Package size={16} /> Move All to Storage ({getCount('COMPLETED')} Participants)
                        </button>
                        <button className="btn-danger" style={{ padding: '10px' }} onClick={handleDeleteAllVerified}>
                            <Trash2 size={16} />
                        </button>
                    </div>
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
                                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {tx.itemName}
                                    {tx.reconciled && (
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
                                    {details.date && (
                                        <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#555' }}>
                                            ({new Date(details.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {details.city ? ` - ${details.city}` : ''})
                                        </span>
                                    )}
                                </h3>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                                    ₹{tx.amount}
                                </span>
                            </div>

                            {/* Offline Indicator */}
                            {tx.isOffline && (
                                <div style={{
                                    display: 'inline-block',
                                    backgroundColor: '#e0f2fe',
                                    color: '#0284c7',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    marginBottom: '4px'
                                }}>
                                    OFFLINE REGISTRATION
                                </div>
                            )}

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
                                {tx.utr && (
                                    <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>
                                        <strong>UTR:</strong> {tx.utr}
                                    </div>
                                )}
                            </div>

                            {/* Participants List */}
                            {tx.participants && tx.participants.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                                    <strong>Details:</strong>
                                    {tx.participants.map((p, idx) => (
                                        <div key={idx} style={{ marginLeft: '8px' }}>
                                            {idx + 1}. {p.name} ({p.gender}, {p.age})
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

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                                {tx.hasImage ? (
                                    <button
                                        onClick={() => handleViewImage(tx)}
                                        style={{
                                            flex: 1,
                                            background: 'white',
                                            color: '#1e40af',
                                            border: '1px solid #ddd',
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        Verify Receipt
                                    </button>
                                ) : (
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <button
                                            disabled={uploadingReceipt === tx.id}
                                            onClick={() => document.getElementById(`receipt-input-${tx.id}`).click()}
                                            style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                border: '1px solid #2563eb',
                                                backgroundColor: '#eff6ff',
                                                color: '#2563eb',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                cursor: uploadingReceipt === tx.id ? 'wait' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {uploadingReceipt === tx.id ? 'Uploading...' : 'Add Receipt'}
                                        </button>
                                        <input
                                            type="file"
                                            id={`receipt-input-${tx.id}`}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={(e) => handleAddReceipt(e, tx.id)}
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={() => setViewingReg(tx)}
                                    style={{
                                        background: '#f8fafc',
                                        color: '#475569',
                                        border: '1px solid #e2e8f0',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Info size={14} /> Details
                                </button>
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
                                        <button className="btn-bnk" onClick={() => handleUpdate(tx.id, 'COMPLETED')}><Check size={16} /> Mark Completed</button>
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

                                {activeTab === 'COMPLETED' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Rewind size={16} /> Revert</button>
                                        <button
                                            onClick={() => handleArchive(tx.id)}
                                            style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
                                        >
                                            <Package size={16} /> Storage
                                        </button>
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
