import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Trash2, Rewind, AlertCircle, X, Package, Image, Info, Share2, Square, CheckSquare } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { TransactionService } from '@/services/TransactionService';
import { shareTransactions } from '@/utils/shareUtils';
import PageHeader from '@/components/PageHeader';
import LazyImage from '@/components/LazyImage';
import { compressImage, normalizeImageSrc } from '@/utils/imageUtils';
import OCR from '@/plugins/OCRPlugin';
import '../components/RegistrationStyles.css';

const TABS = ['PENDING', 'REGISTERED', 'HOLD', 'COMPLETED'];
const TAB_LABELS = {
    'PENDING': 'Pending',
    'REGISTERED': 'Approved',
    'HOLD': 'Hold',
    'COMPLETED': 'Completed'
};

import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

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
    const [selectedIds, setSelectedIds] = useState([]);

    const handleLogout = async () => {
        if (window.confirm("Logout?")) {
            if (Capacitor.isNativePlatform()) {
                try {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Disconnect failed:", dErr);
                    }
                } catch (_err) {
                    console.warn("Google SignOut Error", _err);
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
            } catch (_err) {
                console.error("Failed to fetch programs", _err);
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
            } catch (_err) { return true; }
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
        } catch (_err) {
            alert("Update Failed");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this transaction?")) {
            await TransactionService.deleteTransaction(id);
        }
    };

    const handleArchive = async (id) => {
        try {
            await TransactionService.archiveTransaction(id);
        } catch (_err) {
            alert("Archive Failed");
        }
    };

    const handleArchiveAll = async () => {
        const toArchive = filteredByProduct.filter(r => r.status === 'COMPLETED');
        if (toArchive.length === 0) return;

        if (window.confirm(`Move ALL ${toArchive.length} Completed transactions to Storage?`)) {
            setLoading(true);
            try {
                for (const tx of toArchive) {
                    await TransactionService.archiveTransaction(tx.id);
                }
                alert("Move to storage successful!");
            } catch (_err) {
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

    // Selection Handlers
    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === displayedRegs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayedRegs.map(r => r.id));
        }
    };

    const handleMultiShare = async () => {
        if (selectedIds.length === 0) return;
        const selectedItems = allRegs.filter(r => selectedIds.includes(r.id));
        await shareTransactions(selectedItems, 'PROGRAM', allPrograms);
    };

    // State for Image Modal
    const [viewingImage, setViewingImage] = useState(null);
    const [activeModalTab, setActiveModalTab] = useState('IMAGE'); // 'IMAGE' or 'DETAILS'

    useEffect(() => {
        if (viewingImage) {
            document.body.style.overflow = 'hidden';
            // Also prevent default touch move on body for iOS
            const preventDefault = (e) => e.preventDefault();
            document.addEventListener('touchmove', preventDefault, { passive: false });
            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('touchmove', preventDefault);
            };
        }
    }, [viewingImage]);
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
                        ? <span key={i} style={{ backgroundColor: 'var(--color-warning-transparent)', color: 'var(--color-warning)', fontWeight: 600, padding: '0 2px', borderRadius: '2px' }}>{part}</span>
                        : part
                )}
            </span>
        );
    };

    const handleViewImage = async (tx) => {
        try {
            // Optimization: If imageUrl already exists in the record, use it directly
            // Avoids a redundant Firestore Get in TransactionService.getImage
            const base64 = tx.imageUrl || await TransactionService.getImage(tx.id);
            if (base64) {
                setViewingImage({
                    base64,
                    id: tx.id,
                    utr: tx.utr,
                    amount: tx.amount,
                    parsedAmount: tx.parsedAmount,
                    ocrText: tx.ocrText || '',
                    mismatchedBankEntryId: tx.mismatchedBankEntryId,
                    mismatchedBankAmount: tx.mismatchedBankAmount,
                    mismatchedBankDesc: tx.mismatchedBankDesc,
                    mismatchedBankDate: tx.mismatchedBankDate
                });
                setActiveModalTab('IMAGE');
                setEditingUtrValue(tx.utr || '');
                setEditingAmountValue(tx.amount?.toString() || '');
                setEditingParsedAmountValue(tx.parsedAmount?.toString() || '');
            } else {
                alert("No Image Found");
            }
        } catch (_err) {
            console.error("Error fetching receipt:", _err);
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
        } catch (_err) {
            console.error("Upload failed", _err);
            alert("Upload failed: " + _err.message);
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
        } catch (_err) {
            console.error("Receipt update failed", _err);
            alert("Update failed: " + _err.message);
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
        } catch (_err) {
            alert("Failed to update details: " + _err.message);
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
                        background: 'var(--color-card)',
                        padding: '1.25rem',
                        borderRadius: '1.5rem',
                        maxWidth: '30rem',
                        width: '95%',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Verify Receipt</h2>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Check UTR and Amount against the image</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={() => document.getElementById('modal-receipt-update').click()}
                                    disabled={savingDetails}
                                    style={{
                                        border: 'none',
                                        background: 'var(--color-primary-transparent)',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: 'var(--color-primary)',
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
                                <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'var(--color-surface)', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                                    <X size={20} color="var(--color-text-muted)" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Tabs */}
                        <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid var(--color-border)', marginBottom: '15px' }}>
                            <button
                                onClick={() => setActiveModalTab('IMAGE')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeModalTab === 'IMAGE' ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    color: activeModalTab === 'IMAGE' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: activeModalTab === 'IMAGE' ? 700 : 500,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Receipt Image
                            </button>
                            <button
                                onClick={() => setActiveModalTab('DETAILS')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeModalTab === 'DETAILS' ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    color: activeModalTab === 'DETAILS' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: activeModalTab === 'DETAILS' ? 700 : 500,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Transaction Details
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div style={{
                            overflowY: 'auto',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            width: '100%',
                            paddingRight: '4px',
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain',
                            touchAction: 'manipulation'
                        }}>
                            {activeModalTab === 'IMAGE' ? (
                                <div style={{
                                    width: '100%',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--color-surface-alt)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <img
                                        src={normalizeImageSrc(viewingImage.base64)}
                                        alt="Receipt"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '65vh',
                                            objectFit: 'contain',
                                            display: 'block'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                                            backgroundColor: 'var(--color-success)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: savingDetails ? 'wait' : 'pointer',
                                            boxShadow: 'var(--shadow-md)',
                                            marginTop: '4px'
                                        }}
                                    >
                                        {savingDetails ? 'Saving Changes...' : 'Save Updated Details'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setViewingImage(null)}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    minHeight: '48px',
                                    flexShrink: 0,
                                    background: 'var(--color-surface)',
                                    color: 'var(--color-text-muted)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    cursor: 'pointer',
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Details Modal */}
            {viewingReg && (
                <div className="modal-overlay" onClick={() => setViewingReg(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        flexDirection: 'column',
                        background: 'var(--color-card)',
                        padding: '20px',
                        maxWidth: '90%',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>Registration Info</h2>
                            <button onClick={() => setViewingReg(null)} style={{ border: 'none', background: 'none', padding: '5px' }}>
                                <X size={24} color="var(--color-text-muted)" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Program</h3>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                    {viewingReg.itemName}
                                    {(() => {
                                        const details = getProgramDetails(viewingReg);
                                        if (details.date) {
                                            return (
                                                <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
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
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Amount Paid</h3>
                                    <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>₹{viewingReg.amount}</div>
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Coming From</h3>
                                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{viewingReg.place || 'Not Specified'}</div>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

                            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>Participants ({viewingReg.participants?.length || 0})</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {viewingReg.participants?.map((p, i) => (
                                    <div key={i} style={{
                                        background: 'var(--color-surface)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)' }}>{i + 1}. {p.name}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                                            {p.gender}, {p.age} yrs
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Mobile: {p.mobile}</div>
                                    </div>
                                ))}
                            </div>

                            {viewingReg.selectedOptions && viewingReg.selectedOptions.length > 0 && (
                                <>
                                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
                                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text)' }}>Additional Options</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {viewingReg.selectedOptions.map((opt, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                background: 'var(--color-primary-transparent)',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--color-primary-light)',
                                                fontSize: '14px'
                                            }}>
                                                <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{opt.name}</span>
                                                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{opt.fee}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>Primary Contact</h3>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{viewingReg.primaryApplicant?.name}</div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>{viewingReg.primaryApplicant?.mobile}</div>
                            </div>

                            <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '10px' }}>
                                Transaction ID: {viewingReg.id}
                            </div>
                        </div>

                        <button className="btn-primary" onClick={() => setViewingReg(null)} style={{ marginTop: '20px', width: '100%', background: 'var(--color-primary)' }}>
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
            <div style={{ backgroundColor: 'var(--color-card)', padding: '10px 16px', borderBottom: '1px solid var(--color-border)' }}>
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
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)'
                    }}>
                        {/* Line 1: Main Counts */}
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '0px' }}>
                            Registrations: {filteredByProduct.length} <span style={{ color: 'var(--color-text-light)', margin: '0 8px' }}>|</span> Participants: {filteredByProduct.reduce((acc, r) => acc + (r.participantCount || 1), 0)}
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
                                data-testid={`reg-tab-${tab}`}
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
                        <button className="btn-approve" style={{ flex: 1, backgroundColor: 'var(--color-primary)', color: 'white' }} onClick={handleArchiveAll}>
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

                {/* Multi-select actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '0 16px' }}>
                    <button onClick={handleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--color-text)', fontSize: '13px', fontWeight: 600 }}>
                        {selectedIds.length === displayedRegs.length && displayedRegs.length > 0 ? <CheckSquare size={16} color="var(--color-primary)" /> : <Square size={16} color="var(--color-text-muted)" />}
                        {selectedIds.length === displayedRegs.length && displayedRegs.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                    <button onClick={handleMultiShare} disabled={selectedIds.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: selectedIds.length ? 'var(--color-primary)' : 'var(--color-background)', color: selectedIds.length ? 'white' : 'var(--color-text-muted)', border: selectedIds.length ? 'none' : '1px solid var(--color-border)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, cursor: selectedIds.length ? 'pointer' : 'not-allowed' }}>
                        <Share2 size={16} /> Share Selected
                    </button>
                </div>

                {displayedRegs.map(tx => {
                    const parsed = tx.parsedAmount ? parseFloat(tx.parsedAmount) : null;
                    const standardPrice = tx.amount || 0;
                    const isMatch = parsed !== null && Math.abs(parsed - standardPrice) < 1.0;
                    const amountColor = (parsed !== null) ? (isMatch ? 'var(--color-success)' : 'var(--color-error)') : 'inherit';

                    // Fallback details
                    const details = getProgramDetails(tx);

                    return (
                        <div key={tx.id} className="card" data-testid={`reg-card-${tx.id}`} style={{ position: 'relative', WebkitTapHighlightColor: 'transparent' }}>
                            {/* Selection checkbox */}
                            <button onClick={(e) => { e.stopPropagation(); toggleSelection(tx.id); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}>
                                {selectedIds.includes(tx.id) ? <CheckSquare size={20} color="var(--color-primary)" /> : <Square size={20} color="var(--color-text-muted)" />}
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '30px' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    {tx.itemName}
                                    {tx.reconciled && (
                                        <span style={{
                                            backgroundColor: 'var(--color-primary-transparent)',
                                            color: 'var(--color-primary)',
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
                                        <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>
                                            ({new Date(details.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {details.city ? ` - ${details.city}` : ''})
                                        </span>
                                    )}
                                </h3>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                                    ₹{tx.amount}
                                </span>
                            </div>

                            {/* Offline Indicator */}
                            {tx.isOffline && (
                                <div style={{
                                    display: 'inline-block',
                                    backgroundColor: 'var(--color-primary-transparent)',
                                    color: 'var(--color-primary)',
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
                                    <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                                        <strong>Participants:</strong> {tx.participantCount}
                                    </div>
                                )}
                                <div style={{ fontSize: '14px', color: 'var(--color-text)' }}>
                                    <strong>Applied By:</strong> {(() => {
                                        if (tx.paymentSource === 'razorpay_native' || tx.razorpayPaymentId) return 'Razorpay System';
                                        const text = tx.ocrText || "";
                                        const lines = text.split('\n');
                                        const fromLine = lines.find(l => l.toLowerCase().includes("from"));
                                        return fromLine ? fromLine.replace(/from[:\s]*/i, "").trim() : 'OCR Unknown';
                                    })()}
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                                    <strong>Date Time:</strong> {new Date(tx.timestamp?.seconds * 1000 || Date.now()).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: (tx.paymentSource === 'razorpay_native' || tx.razorpayPaymentId) ? 'var(--color-success)' : amountColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <strong>{(tx.paymentSource === 'razorpay_native' || tx.razorpayPaymentId) ? 'Online Transaction Amount:' : 'Detected Amount:'}</strong> ₹{(tx.paymentSource === 'razorpay_native' || tx.razorpayPaymentId) ? tx.amount : (tx.parsedAmount || '0')}
                                    {(tx.paymentSource === 'razorpay_native' || tx.razorpayPaymentId) ? (
                                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', marginLeft: '4px', fontStyle: 'italic' }}>(Razorpay Transaction)</span>
                                    ) : (
                                        isMatch ? <Check size={16} color="var(--color-success)" /> : <X size={16} color="var(--color-error)" />
                                    )}
                                </div>
                                {tx.utr && (
                                    <div style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                        <strong>UTR:</strong> {tx.utr}
                                    </div>
                                )}
                            </div>

                            {/* Participants List */}
                            {tx.participants && tx.participants.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text)', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
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
                                <div style={{ fontSize: '14px', color: 'var(--color-text)', marginTop: '8px' }}>
                                    <strong>Coming From:</strong> {tx.place}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                                {tx.hasImage ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleViewImage(tx); }}
                                        style={{
                                            flex: 1,
                                            background: 'var(--color-card)',
                                            color: 'var(--color-primary)',
                                            border: '1px solid var(--color-border)',
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
                                            onClick={(e) => { e.stopPropagation(); document.getElementById(`receipt-input-${tx.id}`).click(); }}
                                            style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                border: '1px solid var(--color-primary)',
                                                backgroundColor: 'var(--color-primary-transparent)',
                                                color: 'var(--color-primary)',
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
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-text-muted)',
                                        border: '1px solid var(--color-border)',
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
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)} data-testid={`delete-reg-${tx.id}`}><Trash2 size={16} /> Delete</button>
                                    </>
                                )}

                                {/* APPROVED (Registered) Tab Actions */}
                                {activeTab === 'REGISTERED' && (
                                    <>
                                        <button className="btn-bnk" onClick={() => handleUpdate(tx.id, 'COMPLETED')}><Check size={16} /> Mark Completed</button>
                                        <button className="btn-pink" onClick={() => handleUpdate(tx.id, 'PENDING')}><Rewind size={16} /> Pending</button>
                                        <button className="btn-hold" onClick={() => handleUpdate(tx.id, 'HOLD')}><AlertCircle size={16} /> Hold</button>
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)} data-testid={`delete-reg-${tx.id}`}><Trash2 size={16} /> Delete</button>
                                    </>
                                )}

                                {/* HOLD Tab Actions */}
                                {activeTab === 'HOLD' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Check size={16} /> Approve</button>
                                        <button className="btn-pink" onClick={() => handleUpdate(tx.id, 'PENDING')}><Rewind size={16} /> Pending</button>
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)} data-testid={`delete-reg-${tx.id}`}><Trash2 size={16} /> Delete</button>
                                    </>
                                )}

                                {activeTab === 'COMPLETED' && (
                                    <>
                                        <button className="btn-approve" onClick={() => handleUpdate(tx.id, 'REGISTERED')}><Rewind size={16} /> Revert</button>
                                        <button
                                            onClick={() => handleArchive(tx.id)}
                                            style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
                                        >
                                            <Package size={16} /> Storage
                                        </button>
                                        <button className="btn-danger" onClick={() => handleDelete(tx.id)} data-testid={`delete-reg-${tx.id}`}><Trash2 size={16} /> Delete</button>
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
