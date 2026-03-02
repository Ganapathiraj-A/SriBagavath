import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { parseHdfcStatement } from '@/utils/BankStatementParser';
import { db } from '@/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from '@/utils/FirestoreProxy';

import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const BankStatementUpload = () => {
    const { bankPassword } = useGlobalSettings();
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
        const password = bankPassword;
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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Upload Statement"
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
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                >
                    <label style={{
                        backgroundColor: 'var(--color-surface)',
                        padding: '2rem',
                        borderRadius: '1rem',
                        border: '2px dashed var(--color-border)',
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
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
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
                            backgroundColor: 'var(--color-primary-transparent)',
                            color: 'var(--color-primary)'
                        }}>
                            {isParsing ? (
                                <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-primary-transparent)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Upload size={32} />
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                {isParsing ? 'Parsing statement...' : 'Click to upload bank statement'}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Supports PDF format (HDFC)</div>
                        </div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </label>

                    {error && (
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--color-error-transparent)' }}>
                            {error}
                        </div>
                    )}

                    {saveResult && (
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-success-transparent)', color: 'var(--color-success)', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-success-transparent)' }}>
                            <span>Success: Processed {parsedEntries.length} entries</span>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                <span style={{ color: 'var(--color-success)' }}>{saveResult.saved} New</span>
                                <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>|</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{saveResult.skipped} Existing</span>
                            </div>
                        </div>
                    )}

                    {parsedEntries.length > 0 && (
                        <div style={{ backgroundColor: 'var(--color-surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Parsed Entries ({parsedEntries.length})</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={copyAllTransactions}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                backgroundColor: copied ? 'var(--color-success)' : 'var(--color-surface-alt)',
                                                color: copied ? 'white' : 'var(--color-text)',
                                                border: '1px solid var(--color-border)',
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
                                                    backgroundColor: 'var(--color-surface-alt)',
                                                    color: 'var(--color-text)',
                                                    border: '1px solid var(--color-border)',
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
                                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-surface-alt)', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{tx.desc}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{tx.date}</div>
                                            </div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-success)', flexShrink: 0 }}>₹{tx.amount?.toLocaleString()}</div>
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
