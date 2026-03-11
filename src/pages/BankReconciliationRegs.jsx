import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Search, X, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, startAfter } from '@/utils/FirestoreProxy';
import { TransactionService } from '@/services/TransactionService';
import { compressImage, normalizeImageSrc } from '@/utils/imageUtils';
import OCR from '@/plugins/OCRPlugin';
import { Image } from 'lucide-react';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import LazyImage from '@/components/LazyImage';

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

        } catch (_err) {
            console.error("Error fetching transactions:", _err);
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
        } catch (_err) {
            console.error("Error loading more:", _err);
        } finally {
            setLoadingMore(false);
        }
    };

    const fetchPrograms = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'programs'));
            const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllPrograms(progs);
        } catch (_err) {
            console.error("Failed to fetch programs", _err);
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
        } catch (_err) {
            alert("Matching failed: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReceipt = async (tx) => {
        try {
            const base64 = tx.imageUrl || await TransactionService.getImage(tx.id);
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
        } catch (_err) {
            console.error("Receipt update failed", _err);
            alert("Update failed: " + _err.message);
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
        } catch (_err) {
            alert("Failed to update details: " + _err.message);
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
                        ? <span key={i} style={{ backgroundColor: 'var(--color-warning-transparent)', color: 'var(--color-warning)', fontWeight: 600, padding: '0 2px', borderRadius: '2px' }}>{part}</span>
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
        } catch (_err) {
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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Registrations & Orders"
                subtitle={`v${appVersion}`}
                leftAction={
                    <button onClick={() => navigate('/admin/back-office/reconciliation')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
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
                                background: 'var(--color-surface)',
                                padding: '15px',
                                borderRadius: '16px',
                                maxWidth: '30rem',
                                width: '100%',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>Payment Receipt</h2>
                                        {viewingImage.utr && <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>UTR: {viewingImage.utr}</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => document.getElementById('modal-receipt-update-reg').click()}
                                            disabled={savingUtr}
                                            style={{
                                                border: 'none',
                                                background: 'var(--color-primary-transparent)',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                color: 'var(--color-primary)',
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
                                            <X size={24} color="var(--color-text-muted)" />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ width: '100%', overflowY: 'auto', maxHeight: '65vh', border: '1px solid var(--color-border)', borderRadius: '8px', flexShrink: 0 }}>
                                    <LazyImage
                                        src={normalizeImageSrc(viewingImage.base64)}
                                        alt="Receipt"
                                        height="auto"
                                        objectFit="contain"
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
                                                            backgroundColor: editingUtrValue === num ? 'var(--color-primary-transparent)' : 'var(--color-background)',
                                                            color: editingUtrValue === num ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Edit UTR</label>
                                            <input
                                                type="text"
                                                value={editingUtrValue}
                                                onChange={(e) => setEditingUtrValue(e.target.value)}
                                                placeholder="UTR..."
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Reg. Amount</label>
                                            <input
                                                type="number"
                                                value={editingAmountValue}
                                                onChange={(e) => setEditingAmountValue(e.target.value)}
                                                placeholder="Reg Amount..."
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontSize: '14px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>OCR Amount (Detected from Receipt)</label>
                                        <input
                                            type="number"
                                            value={editingParsedAmountValue}
                                            onChange={(e) => setEditingParsedAmountValue(e.target.value)}
                                            placeholder="OCR Amount..."
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-text)', fontSize: '15px', outline: 'none' }}
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
                    )}

                    {/* Match Verification Modal */}
                    {viewingMatch && (
                        <div className="modal-overlay" onClick={() => setViewingMatch(null)} style={{ zIndex: 1100 }}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                                background: 'var(--color-surface)',
                                padding: '20px',
                                borderRadius: '16px',
                                maxWidth: '30rem',
                                width: '100%',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--color-border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-text)' }}>Match Verification</h2>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Technical double-check for the match</div>
                                    </div>
                                    <button onClick={() => setViewingMatch(null)} style={{ border: 'none', background: 'none', padding: '8px', cursor: 'pointer' }}>
                                        <X size={20} color="var(--color-text-muted)" />
                                    </button>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-surface-alt)', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid var(--color-border)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        From Receipt (OCR)
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary)' }}>UTR: {viewingMatch.utr || 'Not Found'}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Amount: ₹{viewingMatch.amount}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>User: {viewingMatch.userName}</div>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: 'var(--color-warning-transparent)', padding: '15px', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--color-warning-transparent)' }}>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-warning)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        From Bank Statement
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: '1.5' }}>
                                            <strong>Description:</strong><br />
                                            {viewingMatch.bankDescription ? highlightUTR(viewingMatch.bankDescription, viewingMatch.utr) : 'Bank description not captured for this match.'}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
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
                    <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>Filter by Program</label>
                        <select
                            value={selectedProgramId}
                            onChange={(e) => setSelectedProgramId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                fontSize: '14px',
                                outline: 'none',
                                backgroundColor: 'var(--color-background)',
                                color: 'var(--color-text)'
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
                        <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search registrations/orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
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
                                <X size={16} color="var(--color-text-muted)" />
                            </button>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--color-border)',
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
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
                                        backgroundColor: isActive ? 'var(--color-secondary)' : 'var(--color-surface-alt)',
                                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
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
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading transactions...</div>
                        ) : filteredTransactions.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-surface)', borderRadius: '1rem', color: 'var(--color-text-muted)' }}>
                                No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} transactions found.
                            </div>
                        ) : (
                            filteredTransactions.map(tx => (
                                <div key={tx.id} style={{ backgroundColor: 'var(--color-surface)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {(() => {
                                                    const details = getProgramDetails(tx);
                                                    return (
                                                        <>
                                                            {tx.itemName}
                                                            {details.date && (
                                                                <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                                                                    ({formatProgramDate(details.date)}{details.city ? ` - ${details.city}` : ''})
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                {tx.reconciled && (
                                                    <span style={{
                                                        backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <Check size={10} /> Bank Verified
                                                    </span>
                                                )}
                                                {tx.amountMismatch && (
                                                    <span style={{
                                                        backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--color-error-light)'
                                                    }}>
                                                        <X size={10} /> Amount Mismatch
                                                    </span>
                                                )}
                                            </div>
                                            {tx.amountMismatch && (
                                                <div style={{
                                                    fontSize: '0.75rem', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', borderLeft: '3px solid var(--color-error)'
                                                }}>
                                                    <strong>Bank Entry:</strong> ₹{tx.mismatchedBankAmount} <br />
                                                    <span style={{ fontSize: '11px' }}>{tx.mismatchedBankDesc}</span>
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', marginTop: '2px', alignItems: 'center' }}>
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
                                            {tx.utr && <div style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: '2px' }}>UTR: {tx.utr}</div>}
                                            {tx.userName && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>{tx.userName}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>₹{tx.amount}</div>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                color: tx.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--color-warning)',
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
                                                    backgroundColor: 'var(--color-surface)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: 'var(--color-primary)',
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
                                                        border: '1px solid var(--color-primary)',
                                                        backgroundColor: 'var(--color-primary-transparent)',
                                                        color: 'var(--color-primary)',
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
                                                    backgroundColor: 'var(--color-surface)',
                                                    border: '1px solid var(--color-border)',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    color: 'var(--color-primary)',
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
                                        backgroundColor: 'var(--color-surface)',
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
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No more transactions to load</span>
                            )}
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default BankReconciliationRegs;
