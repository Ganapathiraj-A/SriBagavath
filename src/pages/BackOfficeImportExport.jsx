import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Upload, FileSpreadsheet, Check, AlertTriangle, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, getCountFromServer } from 'firebase/firestore';

const BackOfficeImportExport = () => {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);

    // Export State
    const [exportProgram, setExportProgram] = useState('');

    // Import State
    const [importProgram, setImportProgram] = useState('');
    const [importData, setImportData] = useState('');
    const [parsedData, setParsedData] = useState([]);
    const [importErrors, setImportErrors] = useState([]);
    const [sheetLink, setSheetLink] = useState(localStorage.getItem('admin_import_export_sheet_url') || 'https://docs.google.com/spreadsheets/d/1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs/edit');
    const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('admin_import_export_script_url') || 'https://script.google.com/macros/s/AKfycbyZdzyrwNzIQeGwXDo6M0if45IIxHgLDr-81-puhZmfpPgl2pVk1ZK4N8L7jpDX9FrhpA/exec');

    // Persistence Effect
    useEffect(() => {
        localStorage.setItem('admin_import_export_sheet_url', sheetLink);
        localStorage.setItem('admin_import_export_script_url', scriptUrl);
    }, [sheetLink, scriptUrl]);

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const programsRef = collection(db, 'programs');
                const snap = await getDocs(programsRef);
                const loaded = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => new Date(b.programDate || 0) - new Date(a.programDate || 0)); // Sort by date desc

                // Fetch counts for each program
                const withCounts = await Promise.all(loaded.map(async (p) => {
                    const q = query(
                        collection(db, 'transactions'),
                        where('programId', '==', p.id),
                        where('itemType', '==', 'PROGRAM')
                    );
                    const countSnap = await getCountFromServer(p.id === 'ALL' ? collection(db, 'transactions') : q); // Handle "ALL" if needed, but normally it's per program
                    // Wait, getCountFromServer(q) is what we need.
                    const count = await getCountFromServer(q);
                    return { ...p, regCount: count.data().count };
                }));

                setPrograms(withCounts);
            } catch (error) {
                console.error("Error fetching programs", error);
            }
        };
        fetchPrograms();
    }, []);

    // --- EXPORT LOGIC ---
    const handleExport = async () => {
        if (!exportProgram) return alert("Select a program to export");
        setLoading(true);
        try {
            const q = query(
                collection(db, 'transactions'),
                where('programId', '==', exportProgram),
                where('itemType', '==', 'PROGRAM')
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("No records found for this program.");
                setLoading(false);
                return;
            }

            const records = snap.docs.map(d => {
                const data = d.data();
                const primary = data.primaryApplicant || {};

                // Flatten participants
                const rows = [];
                // If participants array exists
                if (data.participants && data.participants.length > 0) {
                    data.participants.forEach((p, idx) => {
                        rows.push({
                            RegID: d.id,
                            Date: new Date(data.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString(),
                            PrimaryName: primary.name || '',
                            PrimaryMobile: primary.mobile || '',
                            ParticipantName: p.name || '',
                            Gender: p.gender || '',
                            Age: p.age || '',
                            City: data.place || primary.city || '',
                            Amount: data.amount || 0,
                            Status: data.status || '',
                            Source: data.isOffline ? 'Offline' : 'Online',
                            RefNo: data.offlineRefNo || data.paymentId || ''
                        });
                    });
                } else {
                    // Fallback for old legacy data without participants array
                    rows.push({
                        RegID: d.id,
                        Date: new Date(data.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString(),
                        PrimaryName: primary.name || '',
                        PrimaryMobile: primary.mobile || '',
                        ParticipantName: primary.name || '',
                        Gender: '',
                        Age: '',
                        City: data.place || primary.city || '',
                        Amount: data.amount || 0,
                        Status: data.status || '',
                        Source: data.isOffline ? 'Offline' : 'Online',
                        RefNo: data.offlineRefNo || data.paymentId || ''
                    });
                }
                return rows;
            }).flat();

            // Convert to CSV
            const headers = ['RegID', 'Date', 'PrimaryName', 'PrimaryMobile', 'ParticipantName', 'Gender', 'Age', 'City', 'Amount', 'Status', 'Source', 'RefNo'];
            const csvContent = [
                headers.join(','),
                ...records.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Program_Export_${exportProgram}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (e) {
            console.error(e);
            alert("Export Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportToSheet = async () => {
        if (!exportProgram) return alert("Select a program to export");
        if (!scriptUrl) return alert("Please enter the Google Apps Script Web App URL first (see help section below).");

        setLoading(true);
        try {
            const q = query(
                collection(db, 'transactions'),
                where('programId', '==', exportProgram),
                where('itemType', '==', 'PROGRAM')
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("No records found for this program.");
                setLoading(false);
                return;
            }

            const headers = ['RegID', 'Date', 'PrimaryName', 'PrimaryMobile', 'ParticipantName', 'Gender', 'Age', 'City', 'Amount', 'Status', 'Source', 'RefNo'];
            const dataRows = snap.docs.map(d => {
                const data = d.data();
                const primary = data.primaryApplicant || {};
                const base = {
                    RegID: d.id,
                    Date: new Date(data.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString(),
                    PrimaryName: primary.name || '',
                    PrimaryMobile: primary.mobile || '',
                    City: data.place || primary.city || '',
                    Amount: data.amount || 0,
                    Status: data.status || '',
                    Source: data.isOffline ? 'Offline' : 'Online',
                    RefNo: data.offlineRefNo || data.paymentId || ''
                };

                if (data.participants && data.participants.length > 0) {
                    return data.participants.map(p => headers.map(h => {
                        if (h === 'ParticipantName') return p.name || '';
                        if (h === 'Gender') return p.gender || '';
                        if (h === 'Age') return p.age || '';
                        return base[h] || '';
                    }));
                } else {
                    return [headers.map(h => {
                        if (h === 'ParticipantName') return primary.name || '';
                        if (h === 'Gender') return '';
                        if (h === 'Age') return '';
                        return base[h] || '';
                    })];
                }
            }).flat();

            const response = await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Apps Script requires no-cors sometimes or handles it differently
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'export', rows: dataRows })
            });

            alert("Export signal sent to Google Sheet! Please check the sheet in a few seconds.");
        } catch (e) {
            console.error(e);
            alert("Sheet Export Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- IMPORT LOGIC ---
    const handleFetchSheet = async () => {
        if (!sheetLink) return alert("Please enter the Google Sheet URL first.");

        setLoading(true);
        try {
            const spreadsheetIdMatch = sheetLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
            const gidMatch = sheetLink.match(/gid=([0-9]+)/);

            if (!spreadsheetIdMatch) throw new Error("Could not find Spreadsheet ID in the URL. Make sure it's a full Google Sheets link.");

            const spreadsheetId = spreadsheetIdMatch[1];
            const gid = gidMatch ? gidMatch[1] : '0';

            const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

            console.log("Fetching from:", exportUrl);
            const response = await fetch(exportUrl);
            if (!response.ok) throw new Error("Failed to fetch sheet data. Ensure the sheet is shared with 'Anyone with the link as Viewer/Editor'.");

            const csvContent = await response.text();

            // Basic cleanup: split rows, check for headers
            const rows = csvContent.split('\n').map(r => r.trim()).filter(r => r);

            if (rows.length > 0) {
                // If first row looks like a header, skip it
                const firstRow = rows[0].toLowerCase();
                if (firstRow.includes('name') || firstRow.includes('mobile') || firstRow.includes('primary')) {
                    rows.shift();
                }
            }

            const cleanContent = rows.join('\n');
            setImportData(cleanContent);
            setParsedData([]); // Reset previous parse
            setImportErrors([]);

            alert(`Fetched ${rows.length} rows of data. Please click 'Preview Data' to verify.`);
        } catch (e) {
            console.error(e);
            alert("Fetch Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleParse = () => {
        if (!importData.trim()) return;

        // Detect if Tab Separated (Excel Copy) or Comma Separated
        const isTSV = importData.includes('\t');
        const rows = importData.trim().split('\n');

        const parsed = [];
        const errors = [];

        rows.forEach((row, idx) => {
            if (!row.trim()) return;
            const cols = isTSV ? row.split('\t') : row.split(',');

            // Expected Format: Name, Mobile, City, Gender, Age, Status(Optional)
            // Flexible mapping: 
            // 0: Name (Req)
            // 1: Mobile (Req)
            // 2: City
            // 3: Gender
            // 4: Age

            const name = cols[0]?.trim();
            const mobile = cols[1]?.trim();

            if (!name) {
                errors.push(`Row ${idx + 1}: Name is missing`);
                return;
            }

            parsed.push({
                name,
                mobile: mobile || '',
                city: cols[2]?.trim() || '',
                gender: cols[3]?.trim() || '',
                age: cols[4]?.trim() || '',
                status: 'REGISTERED' // Default Valid Status
            });
        });

        setParsedData(parsed);
        setImportErrors(errors);
    };

    const handleImportSubmit = async () => {
        if (!importProgram) return alert("Select a program first");
        if (parsedData.length === 0) return alert("No valid data to import");
        if (importErrors.length > 0 && !confirm(`There are ${importErrors.length} errors. Import valid rows only?`)) return;

        setLoading(true);
        try {
            const selectedProg = programs.find(p => p.id === importProgram);
            const batch = writeBatch(db);
            const timestamp = serverTimestamp();

            let count = 0;
            const BATCH_SIZE = 450; // Firestore limit 500

            // We need to commit every 450 writes
            const chunks = [];
            for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
                chunks.push(parsedData.slice(i, i + BATCH_SIZE));
            }

            for (const chunk of chunks) {
                const currentBatch = writeBatch(db); // Create new batch for each chunk

                chunk.forEach(row => {
                    const docRef = doc(collection(db, 'transactions'));
                    currentBatch.set(docRef, {
                        itemName: selectedProg.programName,
                        itemType: 'PROGRAM',
                        programId: selectedProg.id,
                        programDate: selectedProg.programDate,
                        programCity: selectedProg.programCity,

                        amount: 0, // Imported usually has no payment info or cash
                        isOffline: true,
                        status: 'REGISTERED',
                        offlineRefNo: 'IMPORTED',

                        primaryApplicant: {
                            name: row.name,
                            mobile: row.mobile,
                            city: row.city
                        },
                        participants: [{
                            name: row.name,
                            gender: row.gender,
                            age: row.age,
                            mobile: row.mobile,
                            accommodation: 'Not Specified'
                        }],
                        participantCount: 1,
                        place: row.city,
                        createdAt: timestamp,
                        timestamp: timestamp,
                        importedAt: timestamp
                    });
                });

                await currentBatch.commit();
                count += chunk.length;
            }

            alert(`Successfully imported ${count} records!`);
            setImportData('');
            setParsedData([]);
            setImportErrors([]);

        } catch (e) {
            console.error(e);
            alert("Import Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '40px' }}>
            <PageHeader
                title="Import / Export Data"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* --- EXPORT SECTION --- */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#047857' }}>
                        <Download size={24} />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Export Data</h2>
                    </div>

                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Select a program to download all registrations (Online & Offline) as a CSV file.</p>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            value={exportProgram}
                            onChange={(e) => setExportProgram(e.target.value)}
                            style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        >
                            <option value="">-- Select Program --</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.programName} ({p.programCity}) - [{p.regCount || 0}]</option>
                            ))}
                        </select>
                        <button
                            onClick={handleExport}
                            disabled={loading || !exportProgram}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !exportProgram ? 0.5 : 1
                            }}
                        >
                            <Download size={18} /> CSV
                        </button>
                        <button
                            onClick={handleExportToSheet}
                            disabled={loading || !exportProgram}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !exportProgram ? 0.5 : 1
                            }}
                        >
                            <FileSpreadsheet size={18} /> Export to GSheet
                        </button>
                    </div>

                    {/* Script URL Config */}
                    <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Apps Script Web App URL (Required for Direct Export)</label>
                        <input
                            placeholder="Paste Web App URL here..."
                            value={scriptUrl}
                            onChange={e => setScriptUrl(e.target.value)}
                            style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #86efac' }}
                        />
                    </div>
                </div>

                {/* --- HELP / GUIDE SECTION --- */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e40af' }}>
                        <FileSpreadsheet size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Syncing with Google Sheets</h3>
                    </div>
                    <div style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 10px 0' }}>1. <b>Export to GSheet:</b> Select a program and click "Export to GSheet". This requires setting up an Apps Script (see step 3 below).</p>
                        <p style={{ margin: '0 0 10px 0' }}>2. <b>Import:</b> Add data to the "Import" tab in your Google Sheet. Click "Sync" below to fetch it, then "Preview" and "Import".</p>
                        <p style={{ margin: '0 0 10px 0' }}>3. <b>Direct Sync Setup:</b> Go to Extensions &gt; Apps Script in your Sheet, paste the provide code, deploy as "Web App", and paste the URL above.</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText("RegID,Date,PrimaryName,PrimaryMobile,ParticipantName,Gender,Age,City,Amount,Status,Source,RefNo");
                                    alert("Export Headers copied to clipboard!");
                                }}
                                style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'white', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Copy Export Headers
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText("Name,Mobile,City,Gender,Age");
                                    alert("Import Headers copied to clipboard!");
                                }}
                                style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'white', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Copy Import Headers
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- IMPORT SECTION --- */}
                <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#2563eb' }}>
                        <Upload size={24} />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Import Data</h2>
                    </div>

                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                        Copy details from Excel/Sheets and paste below. Data will be added as "Offline Registrations".
                    </p>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Target Program</label>
                        <select
                            value={importProgram}
                            onChange={(e) => setImportProgram(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        >
                            <option value="">-- Select Program --</option>
                            {programs.map(p => (
                                <option key={'imp_' + p.id} value={p.id}>{p.programName} ({p.programCity}) - [{p.regCount || 0}]</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Google Sheet Link (Optional - for Reference)</label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                            <input
                                placeholder="Paste Google Sheet URL here..."
                                value={sheetLink}
                                onChange={e => setSheetLink(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                            />
                            <button
                                onClick={handleFetchSheet}
                                disabled={loading || !sheetLink}
                                style={{
                                    padding: '0 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    opacity: (loading || !sheetLink) ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Upload size={16} /> Sync
                            </button>
                        </div>
                        {sheetLink && (
                            <button
                                onClick={() => window.open(sheetLink, '_blank')}
                                style={{ width: '100%', padding: '8px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                            >
                                Open Spreadsheet in Browser
                            </button>
                        )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600 }}>Paste Data (Name, Mobile, City, Gender, Age)</label>
                            <span style={{ fontSize: '11px', color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>Tab or Comma Separated</span>
                        </div>
                        <textarea
                            rows={8}
                            placeholder={`Example:\nJohn Doe\t9876543210\tChennai\tM\t30\nJane Smith\t9988776655\tMadurai\tF\t25`}
                            value={importData}
                            onChange={(e) => {
                                setImportData(e.target.value);
                                setParsedData([]); // Reset parse
                                setImportErrors([]);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontFamily: 'monospace',
                                fontSize: '12px'
                            }}
                        />
                    </div>

                    {/* Parse Preview */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <button
                            onClick={handleParse}
                            disabled={!importData}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#f3f4f6',
                                color: '#4b5563',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                flex: 1
                            }}
                        >
                            Preview Data
                        </button>
                        <button
                            onClick={handleImportSubmit}
                            disabled={loading || parsedData.length === 0}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                flex: 1,
                                opacity: parsedData.length === 0 ? 0.5 : 1
                            }}
                        >
                            {loading ? 'Importing...' : `Import ${parsedData.length} Records`}
                        </button>
                    </div>

                    {/* Stats & Errors */}
                    {parsedData.length > 0 && (
                        <div style={{ padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Check size={16} /> Ready to import {parsedData.length} rows.
                        </div>
                    )}
                    {importErrors.length > 0 && (
                        <div style={{ marginTop: '8px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '13px', maxHeight: '150px', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', fontWeight: 600 }}>
                                <AlertTriangle size={16} /> Found {importErrors.length} issues:
                            </div>
                            {importErrors.map((err, i) => (
                                <div key={i}>• {err}</div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default BackOfficeImportExport;
