import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Search, X, Receipt, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, orderBy, limit, getDocs, onSnapshot, getCountFromServer, where, startAfter } from '@/utils/FirestoreProxy';
import { TransactionService } from '../services/TransactionService';
import { compressImage } from '../utils/imageUtils';
import OCR from '../plugins/OCRPlugin';
import { RefreshCw, Image } from 'lucide-react';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const BankReconciliationRegs = () => {
    const navigate = useNavigate();
    const { appVersion } = useGlobalSettings();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [allPrograms, setAllPrograms] = useState([]);
    const [activeTab, setActiveTab] = useState('All');
    const [counts, setCounts] = useState({ All: 0, Matched: 0, Unmatched: 0, 'Amount Mismatch': 0, 'Multi Match': 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingImage, setViewingImage] = useState(null);
    const [viewingMatch, setViewingMatch] = useState(null);
    const [editingUtrValue, setEditingUtrValue] = useState('');
    const [editingAmountValue, setEditingAmountValue] = useState('');
    const [editingParsedAmountValue, setEditingParsedAmountValue] = useState('');
    const [savingUtr, setSavingUtr] = useState(false);
    const [selectedProgramId, setSelectedProgramId] = useState('ALL');
    const [uploadingReceipt, setUploadingReceipt] = useState(null);

    useEffect(() => {
        fetchData();
        fetchPrograms();
    }, [selectedProgramId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const txRef = collection(db, 'transactions');
            let q = query(txRef, orderBy('timestamp', 'desc'), limit(30));

            if (selectedProgramId !== 'ALL') {
                q = query(txRef, where('programId', '==', selectedProgramId), orderBy('timestamp', 'desc'), limit(30));
            }

            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(docs);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 30);

            // Fetch Counts using aggregation (Cheap and Fast)
            const countAll = await getCountFromServer(selectedProgramId === 'ALL' ? txRef : query(txRef, where('programId', '==', selectedProgramId)));
            const countMatched = await getCountFromServer(query(selectedProgramId === 'ALL' ? txRef : query(txRef, where('programId', '==', selectedProgramId)), where('reconciled', '==', true)));

            setCounts(prev => ({
                ...prev,
                All: countAll.data().count,
                Matched: countMatched.data().count,
                Unmatched: countAll.data().count - countMatched.data().count // Approximation
            }));

        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!lastVisible || loadingMore) return;
        setLoadingMore(true);
        try {
            const txRef = collection(db, 'transactions');
            let q = query(txRef, orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(30));

            if (selectedProgramId !== 'ALL') {
                q = query(txRef, where('programId', '==', selectedProgramId), orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(30));
            }

            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(prev => [...prev, ...docs]);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 30);
        } catch (error) {
            console.error("Error loading more:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const fetchPrograms = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'programs'));
            const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllPrograms(progs);
        } catch (e) {
            console.error("Failed to fetch programs", e);
        }
    };

    const baseProgramTransactions = transactions;
    // Note: 'counts' is now managed via state from fetchData() for better performance

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

    const handleViewReceipt = async (tx) => {
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
                    // Mismatch metadata for instant recovery
                    mismatchedBankEntryId: tx.mismatchedBankEntryId,
                    mismatchedBankAmount: tx.mismatchedBankAmount,
                    mismatchedBankDesc: tx.mismatchedBankDesc,
                    mismatchedBankDate: tx.mismatchedBankDate
                });
                setEditingUtrValue(tx.utr || '');
                setEditingAmountValue(tx.amount?.toString() || '');
                setEditingParsedAmountValue(tx.parsedAmount?.toString() || '');
            } else {
                alert("No receipt image found for this transaction.");
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
            setSavingUtr(true); // Reuse savingUtr for modal loading
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
            setSavingUtr(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleSaveDetails = async () => {
        if (!viewingImage || savingUtr) return;
        setSavingUtr(true);
        try {
            const { updateDoc, doc, deleteField, serverTimestamp, writeBatch } = await import('@/utils/FirestoreProxy');
            const newAmount = parseFloat(editingAmountValue);
            const newParsedAmount = parseFloat(editingParsedAmountValue);

            if (isNaN(newAmount)) {
                alert("Please enter a valid number for the registration amount.");
                setSavingUtr(false);
                return;
            }

            const batch = writeBatch(db);
            let updateCount = 0; // Track if any updates are added to the batch

            const updates = {
                utr: editingUtrValue,
                amount: newAmount,
                parsedAmount: isNaN(newParsedAmount) ? deleteField() : newParsedAmount,
            };

            // Check if this correction resolves an existing mismatch with a specific bank entry
            // Use parseFloat to ensure string vs number parity
            const isNowMatchingBank = viewingImage.mismatchedBankEntryId &&
                (Math.abs(parseFloat(newAmount)) === Math.abs(parseFloat(viewingImage.mismatchedBankAmount)));

            if (isNowMatchingBank) {
                // Perform Instant Reconciliation
                updates.reconciled = true;
                updates.reconciledAt = serverTimestamp();
                updates.reconciledBy = 'MANUAL_FIX';
                updates.bankEntryId = viewingImage.mismatchedBankEntryId;
                updates.bankDescription = viewingImage.mismatchedBankDesc;
                updates.bankDate = viewingImage.mismatchedBankDate;

                // Clear mismatch flags
                updates.amountMismatch = deleteField();
                updates.mismatchedBankAmount = deleteField();
                updates.mismatchedBankDesc = deleteField();
                updates.mismatchedBankDate = deleteField();
                updates.mismatchedBankEntryId = deleteField();

                // Add transaction update to batch
                batch.update(doc(db, 'transactions', viewingImage.id), updates);
                updateCount++;

                // Also update the bank entry status
                const bankRef = doc(db, 'bank_entries', viewingImage.mismatchedBankEntryId);
                batch.update(bankRef, {
                    status: 'MATCHED',
                    matchedTransactionId: viewingImage.id,
                    matchedAt: serverTimestamp()
                });
                updateCount++;
            } else {
                // Just clear flags and let engine re-run
                updates.amountMismatch = deleteField();
                updates.mismatchedBankAmount = deleteField();
                updates.mismatchedBankDesc = deleteField();
                updates.mismatchedBankDate = deleteField();
                updates.mismatchedBankEntryId = deleteField();

                // Add transaction update to batch
                batch.update(doc(db, 'transactions', viewingImage.id), updates);
                updateCount++;
            }

            if (updateCount > 0) {
                await batch.commit();
            }
            setViewingImage(null); // Close modal on success for smoother flow
            alert(isNowMatchingBank ? "Match verified and corrected!" : "Details updated successfully!");
        } catch (e) {
            alert("Failed to update details: " + e.message);
        } finally {
            setSavingUtr(false);
        }
    };

    const extractUtrSuggestions = (text) => {
        if (!text) return [];
        // Extract all 12-digit numbers
        const matches = text.match(/\b\d{12}\b/g) || [];
        // Remove duplicates
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

    const getProgramDetails = (tx) => {
        if (tx.programId) {
            const match = allPrograms.find(p => p.id === tx.programId);
            if (match) return { date: match.programDate, city: match.programCity };
        }
        // Fallback for older records
        const match = allPrograms.find(p => {
            const txName = (tx.itemName || "").toLowerCase().trim();
            const progName = (p.programName || "").toLowerCase().trim();
            return txName === progName || txName.includes(progName) || progName.includes(txName);
        });
        if (match) return { date: match.programDate, city: match.programCity };
        return { date: tx.programDate, city: tx.programCity };
    };

    const formatProgramDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const filteredTransactions = baseProgramTransactions.filter(tx => {
        // Tab Filtering
        if (activeTab === 'Matched') return tx.reconciled === true;
        if (activeTab === 'Unmatched') return tx.reconciled !== true && tx.amountMismatch !== true;
        if (activeTab === 'Amount Mismatch') return tx.amountMismatch === true;
        if (activeTab === 'Multi Match') {
            const utrs = baseProgramTransactions.map(t => t.utr).filter(u => u && u.length > 5);
            const duplicates = utrs.filter((u, i) => utrs.indexOf(u) !== i);
            const uniqueDuplicates = [...new Set(duplicates)];
            return tx.utr && uniqueDuplicates.includes(tx.utr);
        }

        // Search Filtering
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                tx.itemName?.toLowerCase().includes(query) ||
                tx.utr?.toLowerCase().includes(query) ||
                tx.userName?.toLowerCase().includes(query) ||
                tx.userEmail?.toLowerCase().includes(query)
            );
        }

        return true;
    });

    const sortedPrograms = [...allPrograms].sort((a, b) => {
        const dateA = a.programDate || '';
        const dateB = b.programDate || '';
        return dateB.localeCompare(dateA); // Newest first
    });

    const today = new Date().toISOString().split('T')[0];
    const activePrograms = sortedPrograms.filter(p => (p.programDate || '') >= today);
    const pastPrograms = sortedPrograms.filter(p => (p.programDate || '') < today);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Registrations & Orders"
                subtitle={`v${appVersion}`}
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
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => document.getElementById('modal-receipt-update-reg').click()}
                                            disabled={savingUtr}
                                            style={{
                                                border: 'none',
                                                background: '#eff6ff',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: '#2563eb',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Image size={14} /> Replace
                                        </button>
                                        <input
                                            type="file"
                                            id="modal-receipt-update-reg"
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={handleUpdateReceiptInModal}
                                        />
                                        <button onClick={() => setViewingImage(null)} style={{ border: 'none', background: 'none', padding: '5px', cursor: 'pointer' }}>
                                            <X size={24} color="#666" />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ width: '100%', overflowY: 'auto', maxHeight: '50vh', border: '1px solid #eee', borderRadius: '8px' }}>
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
                                        disabled={savingUtr}
                                        style={{
                                            width: '100%',
                                            height: '48px',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: savingUtr ? 'wait' : 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            marginTop: '4px'
                                        }}
                                    >
                                        {savingUtr ? 'Saving Changes...' : 'Save Updated Details'}
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

                    {/* Match Verification Modal */}
                    {viewingMatch && (
                        <div className="modal-overlay" onClick={() => setViewingMatch(null)} style={{ zIndex: 1100 }}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '16px',
                                maxWidth: '30rem',
                                width: '100%',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>Match Verification</h2>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Technical double-check for the match</div>
                                    </div>
                                    <button onClick={() => setViewingMatch(null)} style={{ border: 'none', background: 'none', padding: '8px', cursor: 'pointer' }}>
                                        <X size={20} color="#9ca3af" />
                                    </button>
                                </div>

                                <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        From Receipt (OCR)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e40af' }}>UTR: {viewingMatch.utr || 'Not Found'}</div>
                                        <div style={{ fontSize: '13px', color: '#334155' }}>Amount: ₹{viewingMatch.amount}</div>
                                        <div style={{ fontSize: '13px', color: '#334155' }}>User: {viewingMatch.userName}</div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#fff7ed', padding: '15px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #ffedd5' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#9a3412', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        From Bank Statement
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '13px', color: '#431407', lineHeight: '1.5' }}>
                                            <strong>Description:</strong><br />
                                            {viewingMatch.bankDescription ? highlightUTR(viewingMatch.bankDescription, viewingMatch.utr) : 'Bank description not captured for this match.'}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#431407' }}>
                                            <strong>Date:</strong> {viewingMatch.bankDate || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewingMatch(null)}
                                    style={{ width: '100%', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', height: '48px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Program Filter */}
                    <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', display: 'block' }}>Filter by Program</label>
                        <select
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: '#f9fafb'
                            }}
                        >
                            <option value="ALL">All Programs</option>
                            {activePrograms.length > 0 && (
                                <optgroup label="Active / Upcoming">
                                    {activePrograms.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.programName} ({formatProgramDate(p.programDate)}{p.programCity ? ` - ${p.programCity}` : ''})
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {pastPrograms.length > 0 && (
                                <optgroup label="Past Programs">
                                    {pastPrograms.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.programName} ({formatProgramDate(p.programDate)}{p.programCity ? ` - ${p.programCity}` : ''})
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search registrations/orders..."
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

                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #e5e7eb',
                        gap: '24px',
                        marginBottom: '0.5rem',
                        overflowX: 'auto',
                        scrollbarWidth: 'none'
                    }}>
                        {['All', 'Matched', 'Unmatched', 'Amount Mismatch', 'Multi Match'].map(tab => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '12px 4px',
                                        border: 'none',
                                        borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                        backgroundColor: 'transparent',
                                        color: isActive ? 'var(--color-primary)' : '#6b7280',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab}
                                    <span style={{
                                        backgroundColor: isActive ? 'var(--color-secondary)' : '#f3f4f6',
                                        color: isActive ? 'var(--color-primary)' : '#6b7280',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {counts[tab]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>Loading transactions...</div>
                        ) : filteredTransactions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '1rem', color: '#6b7280' }}>
                                No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} transactions found.
                            </div>
                        ) : (
                            filteredTransactions.map(tx => (
                                <div key={tx.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {(() => {
                                                    const details = getProgramDetails(tx);
                                                    return (
                                                        <>
                                                            {tx.itemName}
                                                            {details.date && (
                                                                <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b', marginLeft: '4px' }}>
                                                                    ({formatProgramDate(details.date)}{details.city ? ` - ${details.city}` : ''})
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                {tx.reconciled && (
                                                    <span style={{
                                                        backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <Check size={10} /> Bank Verified
                                                    </span>
                                                )}
                                                {tx.amountMismatch && (
                                                    <span style={{
                                                        backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fecaca'
                                                    }}>
                                                        <X size={10} /> Amount Mismatch
                                                    </span>
                                                )}
                                            </div>
                                            {tx.amountMismatch && (
                                                <div style={{
                                                    fontSize: '0.75rem', backgroundColor: '#fdf2f2', color: '#991b1b', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', borderLeft: '3px solid #dc2626'
                                                }}>
                                                    <strong>Bank Entry:</strong> ₹{tx.mismatchedBankAmount} <br />
                                                    <span style={{ fontSize: '11px' }}>{tx.mismatchedBankDesc}</span>
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.8125rem', color: '#6b7280', display: 'flex', gap: '0.5rem', marginTop: '2px', alignItems: 'center' }}>
                                                <span>{tx.itemType}</span>
                                                {tx.participantCount > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{tx.participantCount} People</span>
                                                    </>
                                                )}
                                                <span>•</span>
                                                <span>{new Date(tx.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                                            </div>
                                            {tx.utr && <div style={{ fontSize: '0.8125rem', color: '#1e40af', fontWeight: 600, marginTop: '2px' }}>UTR: {tx.utr}</div>}
                                            {tx.userName && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1px' }}>{tx.userName}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: '#111827' }}>₹{tx.amount}</div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: tx.status === 'COMPLETED' ? '#10b981' : '#f59e0b',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            }}>
                                                {tx.status}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                        {tx.hasImage ? (
                                            <button
                                                onClick={() => handleViewReceipt(tx)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: '#1e40af',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: 'pointer'
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
                                                        padding: '0.5rem',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid #2563eb',
                                                        backgroundColor: '#eff6ff',
                                                        color: '#2563eb',
                                                        fontSize: '0.8125rem',
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
                                        {tx.reconciled && (
                                            <button
                                                onClick={() => setViewingMatch(tx)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: '#1e40af',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Check size={16} /> View Match
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'white',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary)',
                                        borderRadius: '0.75rem',
                                        fontWeight: 600,
                                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {loadingMore ? 'Loading...' : 'Load More Transactions'}
                                </button>
                            )}
                            {!hasMore && transactions.length > 0 && (
                                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>No more transactions to load</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default BankReconciliationRegs;
