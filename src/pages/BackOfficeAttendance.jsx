import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Search,
    CheckCircle2,
    Loader2,
    Phone,
    Share2
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { db } from '../firebase';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    setDoc,
    deleteDoc
} from 'firebase/firestore';

const BackOfficeAttendance = () => {
    const { programId } = useParams();
    const navigate = useNavigate();

    const [program, setProgram] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState({});

    useEffect(() => {
        if (programId) {
            fetchData();
        }
    }, [programId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const pSnap = await getDoc(doc(db, 'programs', programId));
            if (pSnap.exists()) {
                setProgram({ id: pSnap.id, ...pSnap.data() });
            }

            const txRef = collection(db, 'transactions');
            const archTxRef = collection(db, 'archived_transactions');

            const q = query(txRef, where('programId', '==', programId), where('status', '==', 'BNK_VERIFIED'));
            const aq = query(archTxRef, where('programId', '==', programId), where('status', '==', 'BNK_VERIFIED'));

            const fetchDocs = async (qr) => {
                try {
                    const s = await getDocs(qr);
                    return s.docs;
                } catch (e) {
                    console.error("Query failed:", e);
                    return [];
                }
            };

            const [txDocs, archDocs] = await Promise.all([
                fetchDocs(q),
                fetchDocs(aq)
            ]);

            const allTx = [
                ...txDocs.map(d => ({ id: d.id, ...d.data() })),
                ...archDocs.map(d => ({ id: d.id, ...d.data() }))
            ];

            const pList = [];
            allTx.forEach(tx => {
                const txParticipants = tx.participants || [];
                txParticipants.forEach((p, idx) => {
                    pList.push({
                        ...p,
                        transactionId: tx.id,
                        index: idx,
                        id: `${programId}_${tx.id}_${idx}`.replace(/\//g, '_')
                    });
                });
            });

            pList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setParticipants(pList);

            const attQ = query(collection(db, 'attendance'), where('programId', '==', programId));
            const attDocs = await fetchDocs(attQ);

            const aMap = {};
            attDocs.forEach(doc => {
                aMap[doc.id] = true;
            });
            setAttendanceMap(aMap);

        } catch (err) {
            console.error("Error fetching attendance data:", err);
            alert("Failed to load participant list.");
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (p) => {
        const attId = p.id;
        const isPresent = !!attendanceMap[attId];

        setSyncing(prev => ({ ...prev, [attId]: true }));
        try {
            if (isPresent) {
                await deleteDoc(doc(db, 'attendance', attId));
                setAttendanceMap(prev => {
                    const next = { ...prev };
                    delete next[attId];
                    return next;
                });
            } else {
                await setDoc(doc(db, 'attendance', attId), {
                    programId,
                    transactionId: p.transactionId,
                    participantIndex: p.index,
                    participantName: p.name,
                    markedAt: new Date().toISOString()
                });
                setAttendanceMap(prev => ({ ...prev, [attId]: true }));
            }
        } catch (err) {
            console.error("Sync failed:", err);
            alert(`Sync failed: ${err.message || 'Check connection'}`);
        } finally {
            setSyncing(prev => ({ ...prev, [attId]: false }));
        }
    };

    const handleExport = async () => {
        try {
            const headers = ['Name', 'Gender', 'Age', 'Mobile', 'Status', 'Transaction ID'];
            const rows = participants.map(p => {
                const isPresent = !!attendanceMap[p.id];
                return [
                    p.name || 'Unknown',
                    p.gender || 'N/A',
                    p.age || 'N/A',
                    p.mobile || 'N/A',
                    isPresent ? 'PRESENT' : 'ABSENT',
                    p.transactionId
                ].join(',');
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            const filename = `attendance_${program?.programName || 'export'}_${new Date().toISOString().split('T')[0]}.csv`.replace(/\s+/g, '_');

            const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache,
                encoding: Encoding.UTF8
            });

            await Share.share({
                title: 'Export Attendance',
                text: `Attendance for ${program?.programName}`,
                url: result.uri,
                dialogTitle: 'Share Attendance CSV'
            });
        } catch (err) {
            console.error("Export failed:", err);
            const headers = ['Name', 'Gender', 'Age', 'Mobile', 'Status', 'Transaction ID'];
            const rows = participants.map(p => {
                const isPresent = !!attendanceMap[p.id];
                return [
                    p.name || 'Unknown',
                    p.gender || 'N/A',
                    p.age || 'N/A',
                    p.mobile || 'N/A',
                    isPresent ? 'PRESENT' : 'ABSENT',
                    p.transactionId
                ].join(',');
            });
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_${program?.programName || 'export'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const filteredParticipants = participants.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mobile?.includes(searchTerm)
    );

    const presentCount = Object.keys(attendanceMap).length;

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading participants...</span>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'white',
                borderBottom: '1px solid #f3f4f6',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate('/admin/back-office/programs')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{program?.programName}</h2>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Attendance Tracking</span>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            color: 'var(--color-primary)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        <Share2 size={18} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Export</span>
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '0.75rem',
                    marginTop: '0.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>REGISTERED</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>{participants.length}</div>
                        </div>
                        <div style={{ width: '1px', height: '1.5rem', backgroundColor: '#e2e8f0' }} />
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>PRESENT</div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#16a34a' }}>{presentCount}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: 'white',
                            backgroundColor: 'var(--color-primary)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px'
                        }}>
                            {participants.length > 0 ? Math.round((presentCount / participants.length) * 100) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            <main style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto', width: '100%', flex: 1 }}>
                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search
                        size={18}
                        color="#9ca3af"
                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search by name or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.625rem 1rem 0.625rem 2.75rem',
                            borderRadius: '2rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.9375rem',
                            outline: 'none',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredParticipants.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                            {searchTerm ? "No participants match your search." : "No active registrations found."}
                        </div>
                    ) : (
                        filteredParticipants.map((p, idx) => {
                            const isPresent = !!attendanceMap[p.id];
                            const isSyncing = !!syncing[p.id];

                            return (
                                <motion.div
                                    key={p.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        border: isPresent ? '1px solid #bbf7d0' : '1px solid #f3f4f6',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isPresent ? '#f0fdf4' : 'white'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', flex: 1 }}>
                                        <span style={{ fontWeight: 700, color: '#1f2937' }}>{p.name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                {p.gender}, Age: {p.age}
                                            </span>
                                            <span>•</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Phone size={12} />
                                                {p.mobile}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => !isSyncing && toggleAttendance(p)}
                                        disabled={isSyncing}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: isSyncing ? 'not-allowed' : 'pointer',
                                            backgroundColor: isPresent ? '#16a34a' : '#f1f5f9',
                                            color: isPresent ? 'white' : '#64748b',
                                            border: 'none',
                                            minWidth: '4rem',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        {isSyncing ? (
                                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : isPresent ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <CheckCircle2 size={18} />
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>PRESENT</span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ABSENT</span>
                                        )}
                                    </button>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
};

export default BackOfficeAttendance;
