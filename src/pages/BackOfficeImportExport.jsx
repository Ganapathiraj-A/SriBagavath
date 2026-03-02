import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, Upload, FileSpreadsheet, X, CloudUpload, ShoppingBag, Heart } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db, auth } from '@/firebase';
import { collection, getDocs, doc, writeBatch, serverTimestamp, query, where, getCountFromServer } from '@/utils/FirestoreProxy';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import Spinner from '@/components/Spinner';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const BackOfficeImportExport = () => {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null); // 'FETCH', 'IMPORT', 'MERGE', 'EXPORT_CSV', 'EXPORT_SHEET', 'PUSH', 'PULL'

    // Selection State
    const [selectedProgram, setSelectedProgram] = useState('');

    // Import State
    const [parsedData, setParsedData] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [activeTab, setActiveTab] = useState('PROGRAMS'); // PROGRAMS, STORE, DONATION

    // Date Range State (for Store/Donation)
    const [dateMode, setDateMode] = useState('ALL'); // ALL, RANGE
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const {
        sheetLink,
        programImportUrl, programExportUrl, programUpdateUrl,
        bookImportUrl, bookExportUrl, bookUpdateUrl,
        donationImportUrl, donationExportUrl, donationUpdateUrl,
        scriptUrl,
        appVersion
    } = useGlobalSettings();

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
                    const count = await getCountFromServer(q);
                    return { ...p, regCount: count.data().count };
                }));

                setPrograms(withCounts);
            } catch (_err) {
                console.error("Error fetching programs", _err);
            }
        };
        fetchPrograms();
    }, []);

    // Clear data when tab changes
    useEffect(() => {
        setParsedData([]);
        setSelectedIndices(new Set());
    }, [activeTab]);

    // --- HELPERS ---
    const cleanAmount = (val) => {
        if (!val) return 0;
        // Stringify and Remove everything except digits and decimal point
        const cleaned = val.toString().replace(/[^0-9.]/g, '');
        return parseFloat(cleaned) || 0;
    };

    const parseCSVLine = (text) => {
        const result = [];
        let inQuotes = false;
        let current = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];
            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    // --- EXPORT LOGIC ---
    const handleExport = async () => {
        const config = getTargetConfig();
        if (activeTab === 'PROGRAMS' && !selectedProgram) return alert("Select a program to export");
        setLoading(true);
        setLoadingAction('EXPORT_CSV');
        // await new Promise(r => setTimeout(r, 800)); // Removed delay to prevent browser blocking download
        try {
            let q;
            if (activeTab === 'PROGRAMS') {
                q = query(
                    collection(db, 'transactions'),
                    where('programId', '==', selectedProgram)
                );
            } else {
                const wheres = [where('itemType', '==', config.itemType)];
                if (dateMode === 'RANGE') {
                    wheres.push(where('timestamp', '>=', new Date(startDate)));
                    wheres.push(where('timestamp', '<=', new Date(endDate + 'T23:59:59')));
                }
                q = query(collection(db, 'transactions'), ...wheres);
            }

            const snap = await getDocs(q);

            if (snap.empty) {
                alert("No records found for " + activeTab);
                setLoading(false);
                return;
            }

            const headers = activeTab === 'PROGRAMS'
                ? ['RegID', 'Date', 'PrimaryName', 'PrimaryMobile', 'ParticipantName', 'Gender', 'Age', 'City', 'Amount', 'Status', 'Source', 'RefNo']
                : activeTab === 'STORE'
                    ? ['OrderID', 'Date', 'CustomerName', 'Mobile', 'Items', 'Amount', 'Status', 'City', 'Source', 'RefNo']
                    : ['DonationID', 'Date', 'DonorName', 'Mobile', 'Amount', 'Place', 'PAN', 'UTR', 'Status', 'Source'];

            const records = snap.docs.map(d => {
                const data = d.data();
                const ts = data.timestamp;
                const dateStr = ts?.seconds
                    ? new Date(ts.seconds * 1000).toLocaleDateString()
                    : (ts instanceof Date ? ts.toLocaleDateString() : new Date().toLocaleDateString());

                if (activeTab === 'PROGRAMS') {
                    const primary = data.primaryApplicant || {};
                    const participants = data.participants || [{ name: primary.name, gender: '', age: '' }];

                    return participants.map(p => ({
                        RegID: d.id,
                        Date: dateStr,
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
                    }));
                } else if (activeTab === 'STORE') {
                    const contact = data.shippingAddress || data.primaryApplicant || {};
                    const items = (data.orderItems || []).map(i => `${i.title} (x${i.quantity})`).join(', ');
                    return [{
                        OrderID: d.id,
                        Date: dateStr,
                        CustomerName: contact.name || '',
                        Mobile: contact.mobile || '',
                        Items: items,
                        Amount: data.amount || 0,
                        Status: data.status || '',
                        City: contact.city || data.place || '',
                        Source: data.isOffline ? 'Offline' : 'Online',
                        RefNo: data.offlineRefNo || data.paymentId || ''
                    }];
                } else {
                    const contact = data.primaryApplicant || data.shippingAddress || {};
                    return [{
                        DonationID: d.id,
                        Date: dateStr,
                        DonorName: contact.name || '',
                        Mobile: contact.mobile || '',
                        Amount: data.amount || 0,
                        Place: contact.city || data.place || '',
                        PAN: contact.pan || '',
                        UTR: data.utr || '',
                        Status: data.status || '',
                        Source: data.isOffline ? 'Offline' : 'Online'
                    }];
                }
            }).flat();

            let csvContent = '';

            // Metadata for Programs only (as before)
            if (activeTab === 'PROGRAMS') {
                const program = programs.find(p => p.id === selectedProgram) || {};
                const programMetadata = [
                    ['Program Name:', program.programName || ''],
                    ['City:', program.programCity || ''],
                    ['Date:', program.programDate || ''],
                    ['Total Count:', "'" + records.length],
                    ['']
                ];

                const csvPadMetadata = (row) => {
                    const newRow = new Array(headers.length).fill('');
                    row.forEach((val, i) => { newRow[i] = val; });
                    return newRow;
                };

                csvContent += programMetadata.map(row =>
                    csvPadMetadata(row).map(v => `"${v.toString().replace(/"/g, '""')}"`).join(',')
                ).join('\n') + '\n';
            }

            // Combine Headers and Rows
            csvContent += headers.join(',') + '\n';
            csvContent += records.map(r =>
                headers.map(h => `"${(r[h] !== undefined && r[h] !== null ? r[h] : '').toString().replace(/"/g, '""')}"`).join(',')
            ).join('\n');

            // Download or Share
            const filename = activeTab === 'PROGRAMS'
                ? `Program_Export_${programs.find(p => p.id === selectedProgram)?.programName || selectedProgram}.csv`
                : activeTab === 'STORE' ? 'Store_Orders_Export.csv' : 'Donations_Export.csv';

            if (Capacitor.isNativePlatform()) {
                const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
                const result = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8
                });

                await Share.share({
                    title: 'Export CSV',
                    text: 'Exported CSV file',
                    url: result.uri,
                    dialogTitle: 'Share CSV'
                });
            } else {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (_err) {
            console.error("Login verification failed:", _err);
            alert("Export failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    const handleExportToSheet = async () => {
        const config = getTargetConfig();

        // Use EXPORT URLs for this action
        const sheetUrls = {
            'PROGRAMS': programExportUrl,
            'STORE': bookExportUrl,
            'DONATION': donationExportUrl
        };
        const sheetUrl = sheetUrls[activeTab];

        if (activeTab === 'PROGRAMS' && !selectedProgram) return alert("Select a program first");
        if (!scriptUrl) return alert("Apps Script URL not configured.");
        if (!sheetUrl) return alert("Sheet URL for " + activeTab + " not configured.");

        setLoading(true);
        setLoadingAction('EXPORT_SHEET');
        await new Promise(r => setTimeout(r, 800));
        try {
            let q;
            if (activeTab === 'PROGRAMS') {
                q = query(collection(db, 'transactions'), where('programId', '==', selectedProgram));
            } else {
                const wheres = [where('itemType', '==', config.itemType)];
                if (dateMode === 'RANGE') {
                    wheres.push(where('timestamp', '>=', new Date(startDate)));
                    wheres.push(where('timestamp', '<=', new Date(endDate + 'T23:59:59')));
                }
                q = query(collection(db, 'transactions'), ...wheres);
            }
            const snap = await getDocs(q);
            if (snap.empty) { alert("No records found."); setLoading(false); return; }

            const headers = activeTab === 'PROGRAMS'
                ? ['RegID', 'Date', 'PrimaryName', 'PrimaryMobile', 'ParticipantName', 'Gender', 'Age', 'City', 'Amount', 'Status', 'Source', 'RefNo']
                : activeTab === 'STORE'
                    ? ['OrderID', 'Date', 'CustomerName', 'Mobile', 'Items', 'Amount', 'Status', 'City', 'Source', 'RefNo', '', '']
                    : ['DonationID', 'Date', 'DonorName', 'Mobile', 'Amount', 'Place', 'PAN', 'UTR', 'Status', 'Source', '', ''];

            const dataRows = snap.docs.map(d => {
                const data = d.data();
                const ts = data.timestamp;
                const dateStr = ts?.seconds
                    ? new Date(ts.seconds * 1000).toLocaleDateString()
                    : (ts instanceof Date ? ts.toLocaleDateString() : new Date().toLocaleDateString());

                if (activeTab === 'PROGRAMS') {
                    const primary = data.primaryApplicant || {};
                    const participants = data.participants || [{ name: primary.name, gender: '', age: '' }];
                    return participants.map(p => headers.map(h => {
                        if (h === 'ParticipantName') return p.name || '';
                        if (h === 'Gender') return p.gender || '';
                        if (h === 'Age') return p.age || '';
                        if (h === 'RegID') return d.id;
                        if (h === 'Date') return dateStr;
                        if (h === 'PrimaryName') return primary.name || '';
                        if (h === 'PrimaryMobile') return primary.mobile || '';
                        if (h === 'City') return data.place || primary.city || '';
                        if (h === 'Amount') return data.amount || 0;
                        if (h === 'Status') return data.status || '';
                        if (h === 'Source') return data.isOffline ? 'Offline' : 'Online';
                        if (h === 'RefNo') return data.offlineRefNo || data.paymentId || '';
                        return '';
                    }));
                } else if (activeTab === 'STORE') {
                    const contact = data.shippingAddress || data.primaryApplicant || {};
                    const items = (data.orderItems || []).map(i => `${i.title} (x${i.quantity})`).join(', ');
                    return [headers.map(h => {
                        if (h === 'OrderID') return d.id;
                        if (h === 'Date') return dateStr;
                        if (h === 'CustomerName') return contact.name || '';
                        if (h === 'Mobile') return contact.mobile || '';
                        if (h === 'Items') return items;
                        if (h === 'Amount') return data.amount || 0;
                        if (h === 'Status') return data.status || '';
                        if (h === 'City') return contact.city || data.place || '';
                        if (h === 'Source') return data.isOffline ? 'Offline' : 'Online';
                        if (h === 'RefNo') return data.offlineRefNo || data.paymentId || '';
                        return ''; // Pad with empty string for columns not relevant to STORE
                    })];
                } else { // Donations
                    const contact = data.primaryApplicant || data.shippingAddress || {};
                    return [headers.map(h => {
                        if (h === 'DonationID') return d.id;
                        if (h === 'Date') return dateStr;
                        if (h === 'DonorName') return contact.name || '';
                        if (h === 'Mobile') return contact.mobile || '';
                        if (h === 'Amount') return data.amount || 0;
                        if (h === 'Place') return contact.city || data.place || '';
                        if (h === 'PAN') return contact.pan || '';
                        if (h === 'UTR') return data.utr || '';
                        if (h === 'Status') return data.status || '';
                        if (h === 'Source') return data.isOffline ? 'Offline' : 'Online';
                        // RefNo is not typically present for donations, so it will be an empty string
                        return ''; // Pad with empty string for columns not relevant to DONATIONS
                    })];
                }
            }).flat();

            const gidMatch = sheetUrl?.match(/gid=([0-9]+)/);
            const targetGid = gidMatch ? gidMatch[1] : null;

            const payload = {
                action: 'push_update',
                targetTab: activeTab,
                targetGid,
                rows: [headers, ...dataRows]
            };

            await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert("Export signal sent! Check GSheet.");
        } catch (_err) {
            console.error("Export Error:", _err);
            alert("Export Failed: " + _err.message);
        } finally { setLoading(false); setLoadingAction(null); }
    };

    // --- IMPORT LOGIC ---
    const handleFetchSheet = async () => {
        const importUrl = activeTab === 'PROGRAMS' ? programImportUrl : activeTab === 'STORE' ? bookImportUrl : donationImportUrl;
        if (!importUrl) return alert("Sheet URL not configured.");

        setLoading(true);
        setLoadingAction('FETCH');
        await new Promise(r => setTimeout(r, 800));
        try {
            const spreadsheetIdMatch = importUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            const gidMatch = importUrl.match(/gid=([0-9]+)/);
            const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetIdMatch[1]}/export?format=csv&gid=${gidMatch ? gidMatch[1] : '0'}`;

            const response = await fetch(exportUrl);
            const csvContent = await response.text();
            setParsedData([]);
            setTimeout(() => handleParseDirect(csvContent), 100);
            alert(`Fetched data successfully!`);
        } catch (_err) {
            alert("Fetch Failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    const handleParseDirect = (data) => {
        if (!data.trim()) return;
        const isTSV = data.includes('\t');
        const allRows = data.trim().split('\n').filter(r => r.trim());
        if (allRows.length === 0) return;

        // Header detection logic
        const headerRow = isTSV ? allRows[0].split('\t') : parseCSVLine(allRows[0]);
        const mapping = {
            name: -1,
            mobile: -1,
            city: -1,
            gender: -1,
            age: -1,
            amount: -1
        };

        headerRow.forEach((col, idx) => {
            const h = col.trim().toLowerCase();
            if (h.includes('name')) mapping.name = idx;
            if (h.includes('mobile') || h.includes('phone')) mapping.mobile = idx;
            if (h.includes('city') || h.includes('place')) mapping.city = idx;
            if (h.includes('gender')) mapping.gender = idx;
            if (h.includes('age')) mapping.age = idx;
            if (h.includes('amount') || h.includes('fees') || h.includes('price')) mapping.amount = idx;
            if (h.includes('pan')) mapping.pan = idx;
            if (h.includes('utr')) mapping.utr = idx;
            if (h.includes('item')) mapping.items = idx;
        });

        // Fallback to fixed positions if no clear headers detected
        const hasHeaders = Object.values(mapping).some(v => v !== -1);
        let dataStartIdx = hasHeaders ? 1 : 0;

        if (!hasHeaders) {
            mapping.name = 0;
            mapping.mobile = 1;
            mapping.city = 2;
            mapping.gender = 3;
            mapping.age = 4;
            mapping.amount = 5;
        } else {
            // Fill in gaps for standard 6-column layout if some fields are still unmapped
            if (headerRow.length >= 6) {
                if (mapping.name === -1) mapping.name = 0;
                if (mapping.mobile === -1) mapping.mobile = 1;
                if (mapping.city === -1) mapping.city = 2;
                if (mapping.gender === -1) mapping.gender = 3;
                if (mapping.age === -1) mapping.age = 4;
                if (mapping.amount === -1) mapping.amount = 5;
            } else if (headerRow.length === 5 && mapping.amount === -1) {
                // Legacy 5-column fallback
                if (mapping.name === -1) mapping.name = 0;
                if (mapping.mobile === -1) mapping.mobile = 1;
                if (mapping.city === -1) mapping.city = 2;
                if (mapping.gender === -1) mapping.gender = 3;
                if (mapping.age === -1) mapping.age = 4;
            }
        }

        const parsed = [];
        for (let i = dataStartIdx; i < allRows.length; i++) {
            const cols = isTSV ? allRows[i].split('\t') : parseCSVLine(allRows[i]);
            const nameVal = mapping.name !== -1 ? cols[mapping.name]?.trim() : '';

            if (!nameVal || nameVal.toLowerCase().includes('name')) continue;

            parsed.push({
                name: nameVal,
                mobile: mapping.mobile !== -1 ? cols[mapping.mobile]?.trim() : '',
                city: mapping.city !== -1 ? cols[mapping.city]?.trim() : '',
                gender: mapping.gender !== -1 ? cols[mapping.gender]?.trim() : '',
                age: mapping.age !== -1 ? cols[mapping.age]?.trim() : '',
                amount: mapping.amount !== -1 ? cleanAmount(cols[mapping.amount]) : 0,
                pan: mapping.pan !== -1 ? cols[mapping.pan]?.trim() : '',
                utr: mapping.utr !== -1 ? cols[mapping.utr]?.trim() : '',
                items: mapping.items !== -1 ? cols[mapping.items]?.trim() : '',
                status: 'PENDING'
            });
        }
        setParsedData(parsed);
        setSelectedIndices(new Set());
    };

    const handleToggleSelect = (idx) => {
        const next = new Set(selectedIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedIndices(next);
    };

    const handleToggleSelectAll = () => {
        if (selectedIndices.size === parsedData.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(parsedData.map((_, i) => i)));
        }
    };

    const handleMergeImportSelected = async () => {
        if (!selectedProgram) return alert("Select a program first");
        if (selectedIndices.size === 0) return alert("No rows selected");

        const selectedRows = Array.from(selectedIndices).map(i => parsedData[i]);
        if (!confirm(`Merge ${selectedRows.length} participants into ONE registration?`)) return;

        setLoading(true);
        try {
            const selectedProg = programs.find(p => p.id === selectedProgram);
            const timestamp = serverTimestamp();

            // First person is primary
            const first = selectedRows[0];

            const docRef = doc(collection(db, 'transactions'));
            const batch = writeBatch(db);

            batch.set(docRef, {
                itemName: selectedProg.programName,
                itemType: 'PROGRAM',
                userId: auth.currentUser?.uid, // Required by security rules
                programId: selectedProg.id,
                programDate: selectedProg.programDate,
                programCity: selectedProg.programCity,

                amount: selectedRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
                isOffline: true,
                status: 'PENDING',
                offlineRefNo: 'MERGED_IMPORT',

                primaryApplicant: {
                    name: first.name,
                    mobile: first.mobile,
                    city: first.city
                },
                participants: selectedRows.map(row => ({
                    name: row.name,
                    gender: row.gender,
                    age: row.age,
                    mobile: row.mobile
                })),
                participantCount: selectedRows.length,
                place: first.city,
                createdAt: timestamp,
                timestamp: timestamp,
                importedAt: timestamp
            });

            await batch.commit();

            // Success: Remove from preview
            const remaining = parsedData.filter((_, i) => !selectedIndices.has(i));
            setParsedData(remaining);
            setSelectedIndices(new Set());
            alert(`Successfully merged and imported ${selectedRows.length} participants!`);

        } catch (_err) {
            console.error(_err);
            alert("Merge Import Failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    const handleImportIndividualSelected = async () => {
        if (activeTab === 'PROGRAMS') {
            if (!selectedProgram) return alert("Select a Program first (Required for Programs)");
        }
        if (selectedIndices.size === 0) return alert("No rows selected");

        const selectedRows = Array.from(selectedIndices).map(i => parsedData[i]);
        if (!confirm(`Import ${selectedRows.length} ${activeTab.toLowerCase()} records?`)) return;

        setLoading(true);
        try {
            const selectedProg = activeTab === 'PROGRAMS' ? programs.find(p => p.id === selectedProgram) : null;
            const timestamp = serverTimestamp();
            const BATCH_SIZE = 450;

            const selectedIndicesArr = Array.from(selectedIndices);
            let successCount = 0;

            for (let i = 0; i < selectedIndicesArr.length; i += BATCH_SIZE) {
                const chunkIndices = selectedIndicesArr.slice(i, i + BATCH_SIZE);
                const batch = writeBatch(db);

                chunkIndices.forEach(idx => {
                    const row = parsedData[idx];
                    const docRef = doc(collection(db, 'transactions'));

                    let dataToSave = {
                        itemType: activeTab === 'PROGRAMS' ? 'PROGRAM' : activeTab === 'STORE' ? 'BOOK' : 'DONATION',
                        userId: auth.currentUser?.uid, // Required by security rules
                        amount: Number(row.amount) || 0,
                        isOffline: true,
                        status: 'PENDING',
                        createdAt: timestamp,
                        timestamp: timestamp,
                        importedAt: timestamp
                    };

                    if (activeTab === 'PROGRAMS') {
                        Object.assign(dataToSave, {
                            itemName: selectedProg.programName,
                            programId: selectedProg.id,
                            programDate: selectedProg.programDate,
                            programCity: selectedProg.programCity,
                            offlineRefNo: 'INDIVIDUAL_IMPORT',
                            primaryApplicant: { name: row.name, mobile: row.mobile, city: row.city },
                            participants: [{ name: row.name, gender: row.gender, age: row.age, mobile: row.mobile }],
                            participantCount: 1,
                            place: row.city
                        });
                    } else if (activeTab === 'STORE') {
                        Object.assign(dataToSave, {
                            itemName: row.items || 'Book Order',
                            shippingAddress: { name: row.name, mobile: row.mobile, city: row.city },
                            place: row.city,
                            offlineRefNo: 'STORE_IMPORT',
                            orderItems: row.items ? [{ title: row.items, quantity: 1, price: Number(row.amount) || 0 }] : []
                        });
                    } else if (activeTab === 'DONATION') {
                        Object.assign(dataToSave, {
                            itemName: 'Donation',
                            primaryApplicant: { name: row.name, mobile: row.mobile, city: row.city, pan: row.pan },
                            place: row.city,
                            utr: row.utr,
                            offlineRefNo: 'DONATION_IMPORT'
                        });
                    }

                    batch.set(docRef, dataToSave);
                });
                await batch.commit();
                successCount += chunkIndices.length;
            }

            const remaining = parsedData.filter((_, i) => !selectedIndices.has(i));
            setParsedData(remaining);
            setSelectedIndices(new Set());
            alert(`Successfully imported ${successCount} individual records!`);

        } catch (_err) {
            console.error(_err);
            alert("Import Failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    // --- GENERIC SYNC HELPERS (Shared across tabs) ---
    const getTargetConfig = () => {
        if (activeTab === 'PROGRAMS') return { collection: 'transactions', itemType: 'PROGRAM', gidField: 'updateSheetUrl' };
        if (activeTab === 'STORE') return { collection: 'transactions', itemType: 'BOOK', gidField: 'bookSheetUrl' };
        if (activeTab === 'DONATION') return { collection: 'transactions', itemType: 'DONATION', gidField: 'donationSheetUrl' };
        return {};
    };

    const handleUniversalPush = async () => {
        const config = getTargetConfig();
        // Use UPDATE URLs for Sync Push
        const sheetUrls = {
            'PROGRAMS': programUpdateUrl,
            'STORE': bookUpdateUrl,
            'DONATION': donationUpdateUrl
        };
        const sheetUrl = sheetUrls[activeTab];

        if (activeTab === 'PROGRAMS' && !selectedProgram) return alert("Select a program first");
        if (!scriptUrl) return alert("Apps Script URL not configured");

        setLoading(true);
        setLoadingAction('PUSH');
        await new Promise(r => setTimeout(r, 800));
        try {
            let q;
            if (activeTab === 'PROGRAMS') {
                q = query(collection(db, 'transactions'), where('programId', '==', selectedProgram));
            } else {
                const wheres = [where('itemType', '==', config.itemType)];
                if (dateMode === 'RANGE') {
                    wheres.push(where('timestamp', '>=', new Date(startDate)));
                    wheres.push(where('timestamp', '<=', new Date(endDate + 'T23:59:59')));
                }
                q = query(collection(db, 'transactions'), ...wheres);
            }

            const snap = await getDocs(q);
            if (snap.empty) {
                alert("No records found to push.");
                setLoading(false);
                return;
            }

            if (!confirm(`Found ${snap.docs.length} records. Push them to the Sheet?`)) {
                setLoading(false);
                return;
            }

            const gidMatch = sheetUrl?.match(/gid=([0-9]+)/);
            const targetGid = gidMatch ? gidMatch[1] : null;

            const headers = activeTab === 'PROGRAMS'
                ? ['RegID', 'Date', 'PrimaryName', 'PrimaryMobile', 'ParticipantName', 'Gender', 'Age', 'City', 'Amount', 'Status', 'Source', 'RefNo']
                : activeTab === 'STORE'
                    ? ['OrderID', 'Date', 'CustomerName', 'Mobile', 'Items', 'Amount', 'Status', 'City', 'Source', 'RefNo', '', '']
                    : ['DonationID', 'Date', 'DonorName', 'Mobile', 'Amount', 'Place', 'PAN', 'UTR', 'Status', 'Source', '', ''];

            const dataRows = snap.docs.map(d => {
                const data = d.data();
                const dateStr = new Date(data.timestamp?.seconds * 1000 || Date.now()).toLocaleDateString();

                if (activeTab === 'PROGRAMS') {
                    const primary = data.primaryApplicant || {};
                    const participants = data.participants || [{ name: primary.name, gender: '', age: '' }];
                    return participants.map(p => [
                        d.id, dateStr, primary.name || '', primary.mobile || '',
                        p.name || '', p.gender || '', p.age || '',
                        data.place || primary.city || '', data.amount || 0,
                        data.status || 'REGISTERED', data.isOffline ? 'Offline' : 'Online',
                        data.offlineRefNo || data.paymentId || ''
                    ]);
                } else if (activeTab === 'STORE') {
                    const items = (data.orderItems || []).map(i => `${i.title} (x${i.quantity})`).join(', ');
                    const contact = data.shippingAddress || data.primaryApplicant || {};
                    return [[
                        d.id, dateStr, contact.name || '', contact.mobile || '',
                        items, data.amount || 0, data.status || 'PENDING',
                        contact.city || data.place || '', data.isOffline ? 'Offline' : 'Online',
                        data.offlineRefNo || data.paymentId || '', '', ''
                    ]];
                } else {
                    const contact = data.primaryApplicant || data.shippingAddress || {};
                    return [[
                        d.id, dateStr, contact.name || '', contact.mobile || '',
                        data.amount || 0, data.place || contact.city || '',
                        contact.pan || '', data.utr || '', data.status || 'REGISTERED',
                        data.isOffline ? 'Offline' : 'Online', '', ''
                    ]];
                }
            }).flat();

            const payload = { action: 'push_update', targetGid, rows: [headers, ...dataRows] };
            await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert("Success! Signal sent. Check the sheet.");
        } catch (_err) {
            alert("Push Failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    const handleUniversalPull = async () => {
        // Use UPDATE URLs for Sync Pull
        const sheetUrls = {
            'PROGRAMS': programUpdateUrl,
            'STORE': bookUpdateUrl,
            'DONATION': donationUpdateUrl
        };
        const sheetUrl = sheetUrls[activeTab];
        if (!sheetUrl) return alert("Sheet URL not configured");

        setLoading(true);
        setLoadingAction('PULL');
        await new Promise(r => setTimeout(r, 800));
        try {
            const spreadsheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
            const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetIdMatch[1]}/export?format=csv&gid=${gidMatch ? gidMatch[1] : '0'}`;

            const response = await fetch(exportUrl);
            const csvContent = await response.text();

            const parsedRows = csvContent.split(/\r?\n/).filter(l => l.trim()).map(parseCSVLine);
            if (parsedRows.length === 0) return;

            // Header Matching (Fuzzy)
            const headerRow = parsedRows[0];
            const mapping = {
                regid: -1, orderid: -1, donationid: -1,
                name: -1, mobile: -1, status: -1, amount: -1,
                city: -1, place: -1, pan: -1, utr: -1,
                primaryname: -1, customername: -1, donorname: -1
            };

            headerRow.forEach((col, idx) => {
                const h = col.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                if (h.includes('regid')) mapping.regid = idx;
                if (h.includes('orderid')) mapping.orderid = idx;
                if (h.includes('donationid')) mapping.donationid = idx;

                if (h === 'name' || h.includes('participantname')) mapping.name = idx;
                if (h.includes('primaryname')) mapping.primaryname = idx;
                if (h.includes('customername')) mapping.customername = idx;
                if (h.includes('donorname')) mapping.donorname = idx;

                if (h.includes('mobile')) mapping.mobile = idx;
                if (h.includes('status')) mapping.status = idx;
                if (h.includes('amount')) mapping.amount = idx;
                if (h.includes('city')) mapping.city = idx;
                if (h.includes('place')) mapping.place = idx;
                if (h.includes('pan')) mapping.pan = idx;
                if (h.includes('utr')) mapping.utr = idx;
            });

            // Determine ID column based on tab
            const idColIdx = activeTab === 'PROGRAMS' ? mapping.regid : activeTab === 'STORE' ? mapping.orderid : mapping.donationid;

            if (idColIdx === -1) {
                alert("Could not find ID column (RegID/OrderID/DonationID) in sheet.");
                setLoading(false);
                return;
            }

            const groups = {};
            for (let i = 1; i < parsedRows.length; i++) {
                const row = parsedRows[i];
                const id = row[idColIdx];
                if (id && id.length > 5) {
                    if (!groups[id]) groups[id] = [];
                    groups[id].push(row);
                }
            }

            const batch = writeBatch(db);
            let count = 0;
            Object.entries(groups).forEach(([id, rows]) => {
                const row = rows[0];
                const docRef = doc(db, 'transactions', id);
                let updates = { updatedAt: serverTimestamp() };

                if (activeTab === 'PROGRAMS') {
                    updates = {
                        ...updates,
                        'primaryApplicant.name': row[mapping.primaryname] || row[mapping.name],
                        // 'primaryApplicant.mobile': Not updating mobile on pull to avoid overrides/formatting issues unless specific
                        status: row[mapping.status],
                        amount: cleanAmount(row[mapping.amount]),
                        // Not updating participants array on deep sync yet to avoid complex diffs
                    };
                } else if (activeTab === 'STORE') {
                    updates = {
                        ...updates,
                        status: row[mapping.status],
                        'shippingAddress.name': row[mapping.customername],
                        'shippingAddress.city': row[mapping.city],
                        amount: cleanAmount(row[mapping.amount])
                    };
                } else {
                    updates = {
                        ...updates,
                        status: row[mapping.status],
                        amount: cleanAmount(row[mapping.amount]),
                        'primaryApplicant.name': row[mapping.donorname],
                        'primaryApplicant.pan': row[mapping.pan],
                        place: row[mapping.place],
                        utr: row[mapping.utr]
                    };
                }
                batch.update(docRef, updates);
                count++;
            });

            await batch.commit();
            alert(`Updated ${count} records!`);
        } catch (_err) {
            alert("Pull Failed: " + _err.message);
        } finally {
            setLoading(false);
            setLoadingAction(null);
        }
    };

    const renderImportPreview = () => {
        if (parsedData.length === 0) return null;
        return (
            <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>{activeTab === 'PROGRAMS' ? 'Program' : activeTab === 'STORE' ? 'Store' : 'Donation'} Import Preview ({parsedData.length} records)</h3>
                    <button onClick={() => setParsedData([])} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={16} /> Clear
                    </button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: 'var(--color-text)' }}>
                        <thead style={{ backgroundColor: 'var(--color-surface-alt)', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                                    <input type="checkbox" checked={selectedIndices.size === parsedData.length} onChange={handleToggleSelectAll} />
                                </th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Name</th>
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Mobile</th>
                                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Amount</th>
                                {activeTab === 'DONATION' && <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Place</th>}
                                {activeTab === 'DONATION' && <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>PAN</th>}
                                {activeTab === 'STORE' && <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Items</th>}
                                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.map((row, idx) => (
                                <tr key={idx} style={{ backgroundColor: selectedIndices.has(idx) ? 'var(--color-primary-transparent)' : 'var(--color-surface)' }}>
                                    <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>
                                        <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => handleToggleSelect(idx)} />
                                    </td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>{row.name}</td>
                                    <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>{row.mobile}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>₹{row.amount}</td>
                                    {activeTab === 'DONATION' && <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>{row.city}</td>}
                                    {activeTab === 'DONATION' && <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>{row.pan}</td>}
                                    {activeTab === 'STORE' && <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)' }}>{row.items}</td>}
                                    <td style={{ padding: '10px', borderBottom: '1px solid var(--color-border)', fontSize: '11px' }}>{row.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleImportIndividualSelected}
                        disabled={loading || selectedIndices.size === 0}
                        style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, opacity: (loading || selectedIndices.size === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {loadingAction === 'IMPORT' ? <Spinner size={16} /> : null} Import Selected ({selectedIndices.size})
                    </button>
                    {activeTab === 'PROGRAMS' && (
                        <button
                            onClick={handleMergeImportSelected}
                            disabled={loading || selectedIndices.size === 0}
                            style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, opacity: (loading || selectedIndices.size === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loadingAction === 'MERGE' ? <Spinner size={16} /> : null} Merge & Import ({selectedIndices.size})
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderSyncSection = (title) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Import Data */}
            <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-primary)' }}>
                    <Upload size={24} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Import {title}</h2>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={handleFetchSheet} disabled={loading} style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                        {loadingAction === 'FETCH' ? <Spinner size={18} /> : <Upload size={18} />} Sync from Sheet
                    </button>
                </div>
                {renderImportPreview()}
            </div>

            {/* Export Data */}
            <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-success)' }}>
                    <Download size={24} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Export {title}</h2>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleExportToSheet} disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                        {loadingAction === 'EXPORT_SHEET' ? <Spinner size={16} /> : null} GSheet Export
                    </button>
                    <button onClick={handleExport} disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                        {loadingAction === 'EXPORT_CSV' ? <Spinner size={16} color="var(--color-text)" /> : null} CSV
                    </button>
                </div>
            </div>

            {/* Update Sync */}
            <div className="card" style={{ padding: '20px', borderRadius: '16px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: 'var(--color-primary)' }}>
                    <CloudUpload size={24} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Sync Updates</h2>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>Bulk edit details in the sheet and pull them back.</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleUniversalPush} disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                        {loadingAction === 'PUSH' ? <Spinner size={16} /> : null} Push to Sheet
                    </button>
                    <button onClick={handleUniversalPull} disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                        {loadingAction === 'PULL' ? <Spinner size={16} /> : null} Pull Updates
                    </button>
                </div>
            </div>
        </div>
    );


    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '40px' }}>
            <PageHeader
                title="Import / Export Data"
                subtitle={`v${appVersion}`}
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* --- MASTER SPREADSHEET (TOP LVL) --- */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-primary-transparent)', border: '1px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <FileSpreadsheet size={20} color="var(--color-primary)" />
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>Master Spreadsheet</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => window.open(sheetLink, '_blank')}
                            style={{ flex: 2, padding: '10px', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            Open Spreadsheet
                        </button>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(sheetLink);
                                alert("Link copied to clipboard!");
                            }}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                            Copy URL
                        </button>
                    </div>
                </div>

                {/* --- TAB NAVIGATION --- */}
                <div style={{
                    display: 'flex',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: '12px',
                    padding: '4px',
                    border: '1px solid var(--color-border)',
                    marginBottom: '8px'
                }}>
                    {[
                        { id: 'PROGRAMS', label: 'Programs', icon: <FileSpreadsheet size={18} /> },
                        { id: 'STORE', label: 'Store', icon: <ShoppingBag size={18} /> },
                        { id: 'DONATION', label: 'Donation', icon: <Heart size={18} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--color-text-muted)'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'PROGRAMS' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* --- PROGRAM SELECTION (Top) --- */}
                        <div style={{
                            position: 'sticky',
                            top: '0',
                            zIndex: 10,
                            backgroundColor: 'var(--color-background)',
                            padding: '8px 0',
                            borderBottom: '1px solid var(--color-border)'
                        }}>
                            <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-primary)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <FileSpreadsheet size={18} color="var(--color-primary)" />
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>Select Active Program</label>
                                </div>
                                <select
                                    value={selectedProgram}
                                    onChange={(e) => setSelectedProgram(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '2px solid var(--color-primary)',
                                        backgroundColor: 'var(--color-background)',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        color: 'var(--color-text)',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">-- Choose Program for Import/Export --</option>
                                    {programs.map(p => (
                                        <option key={p.id} value={p.id}>{p.programName} ({p.programCity}) - [{p.regCount || 0} Registered]</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {renderSyncSection("Program Registrations")}
                    </div>
                )}

                {activeTab === 'STORE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-primary-transparent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <ShoppingBag size={18} color="var(--color-primary)" />
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)' }}>Select Scope</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <button onClick={() => setDateMode('ALL')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: dateMode === 'ALL' ? 'var(--color-primary)' : 'var(--color-surface)', color: dateMode === 'ALL' ? 'white' : 'var(--color-primary)', fontWeight: 600, fontSize: '13px' }}>All Data</button>
                                <button onClick={() => setDateMode('RANGE')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: dateMode === 'RANGE' ? 'var(--color-primary)' : 'var(--color-surface)', color: dateMode === 'RANGE' ? 'white' : 'var(--color-primary)', fontWeight: 600, fontSize: '13px' }}>Date Range</button>
                            </div>
                            {dateMode === 'RANGE' && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>to</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                </div>
                            )}
                        </div>
                        {renderSyncSection("Book Orders")}
                    </div>
                )}

                {activeTab === 'DONATION' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-error-transparent)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Heart size={18} color="var(--color-error)" />
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-error)' }}>Select Scope</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <button onClick={() => setDateMode('ALL')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-error)', backgroundColor: dateMode === 'ALL' ? 'var(--color-error)' : 'var(--color-surface)', color: dateMode === 'ALL' ? 'white' : 'var(--color-error)', fontWeight: 600, fontSize: '13px' }}>All Data</button>
                                <button onClick={() => setDateMode('RANGE')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-error)', backgroundColor: dateMode === 'RANGE' ? 'var(--color-error)' : 'var(--color-surface)', color: dateMode === 'RANGE' ? 'white' : 'var(--color-error)', fontWeight: 600, fontSize: '13px' }}>Date Range</button>
                            </div>
                            {dateMode === 'RANGE' && (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>to</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }} />
                                </div>
                            )}
                        </div>
                        {renderSyncSection("Donations")}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackOfficeImportExport;
