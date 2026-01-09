import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Upload, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { parseHdfcStatement } from '../utils/BankStatementParser';
import { db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const BankStatementUpload = () => {
    const navigate = useNavigate();
    const [isParsing, setIsParsing] = useState(false);
    const [parsedEntries, setParsedEntries] = useState([]);
    const [error, setError] = useState(null);
    const [saveResult, setSaveResult] = useState(null); // { saved: 0, skipped: 0 }
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setParsedEntries([]);
        setSaveResult(null);
        setError(null);
        setCopied(false);
        const password = localStorage.getItem('bank_statement_password');
        if (!password) {
            setError("Please set the Bank Statement PDF password in Admin Settings first.");
            return;
        }

        setIsParsing(true);
        setError(null);
        try {
            const entries = await parseHdfcStatement(file, password);
            setParsedEntries(entries);
        } catch (err) {
            console.error("Parsing failed:", err);
            setError(err.message || "Failed to parse PDF. Check if the password is correct in Settings.");
        } finally {
            setIsParsing(false);
        }
    };

    const copyAllTransactions = () => {
        if (parsedEntries.length === 0) return;

        const text = parsedEntries.map(tx => `${tx.date} | ₹${tx.amount?.toLocaleString()} | ${tx.desc}`).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const importTransactions = async () => {
        setIsSaving(true);
        setError(null);
        try {
            let saved = 0;
            let skipped = 0;

            for (const entry of parsedEntries) {
                const docRef = doc(db, 'bank_entries', entry.fingerprint);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    await setDoc(docRef, {
                        ...entry,
                        timestamp: serverTimestamp(),
                        status: 'UNMATCHED',
                        source: 'UPLOAD'
                    });
                    saved++;
                } else {
                    skipped++;
                }
            }
            setSaveResult({ saved, skipped });
        } catch (err) {
            console.error("Save failed:", err);
            setError("Failed to save transactions to database.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Upload Statement"
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
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    <label style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '1rem',
                        border: '2px dashed #d1d5db',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        cursor: (isParsing || isSaving) ? 'wait' : 'pointer',
                        transition: 'border-color 0.2s',
                        pointerEvents: (isParsing || isSaving) ? 'none' : 'auto'
                    }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        <div style={{
                            padding: '1rem',
                            borderRadius: '50%',
                            backgroundColor: '#eff6ff',
                            color: 'var(--color-primary)'
                        }}>
                            {isParsing ? (
                                <div style={{ width: '32px', height: '32px', border: '3px solid #eff6ff', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Upload size={32} />
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
                                {isParsing ? 'Parsing statement...' : 'Click to upload bank statement'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>Supports PDF format (HDFC)</div>
                        </div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </label>

                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>
                            {error}
                        </div>
                    )}

                    {saveResult && (
                        <div style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Success: Processed {parsedEntries.length} entries</span>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                <span style={{ color: '#059669' }}>{saveResult.saved} New</span>
                                <span style={{ margin: '0 0.5rem', color: '#6b7280' }}>|</span>
                                <span style={{ color: '#6b7280' }}>{saveResult.skipped} Existing</span>
                            </div>
                        </div>
                    )}

                    {parsedEntries.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Parsed Entries ({parsedEntries.length})</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={copyAllTransactions}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: copied ? '#059669' : '#f3f4f6',
                                                color: copied ? 'white' : '#374151',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {copied ? 'Copied!' : 'Copy All'}
                                        </button>
                                        {saveResult ? (
                                            <button
                                                onClick={() => navigate('/admin/back-office/reconciliation/view')}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: '#f3f4f6',
                                                    color: '#374151',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View Statement
                                            </button>
                                        ) : (
                                            <button
                                                onClick={importTransactions}
                                                disabled={isSaving}
                                                style={{
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: 'var(--color-primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.8125rem',
                                                    fontWeight: 600,
                                                    cursor: isSaving ? 'wait' : 'pointer',
                                                    opacity: isSaving ? 0.7 : 1
                                                }}
                                            >
                                                {isSaving ? 'Importing...' : 'Import to Reconciliation'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                                    {parsedEntries.map((tx, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #f3f4f6' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{tx.desc}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{tx.date}</div>
                                            </div>
                                            <div style={{ fontWeight: 700, color: '#10b981', flexShrink: 0 }}>₹{tx.amount?.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default BankStatementUpload;
