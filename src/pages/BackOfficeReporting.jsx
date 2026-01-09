import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Calendar,
    Users,
    BookOpen,
    Heart,
    Download,
    Filter,
    BarChart3,
    ArrowRight,
    Search
} from 'lucide-react';
import { db } from '../firebase';
import { getLocalDateString } from '../utils/dateUtils';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

const ReportCard = ({ title, icon: Icon, value, subtitle, delay, color = 'var(--color-primary)' }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            border: '1px solid #f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>{title}</span>
            <div style={{ padding: '0.5rem', borderRadius: '9999px', backgroundColor: '#f9fafb' }}>
                <Icon size={18} color={color} />
            </div>
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{value}</div>
        {subtitle && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{subtitle}</span>}
    </motion.div>
);

const BackOfficeReporting = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState('overall');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: '',
        allTime: true
    });

    // Data states
    const [stats, setStats] = useState({
        programs: [],
        books: [],
        donations: { total: 0, count: 0 },
        summary: { totalRevenue: 0, totalParticipants: 0, totalDonations: 0, totalPrograms: 0 }
    });

    // Drill down states
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [programTypes, setProgramTypes] = useState([]);
    const [selectedType, setSelectedType] = useState('all');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [dateRange, activeTab, selectedType]);

    const fetchInitialData = async () => {
        try {
            const typeSnap = await getDocs(collection(db, 'programTypes'));
            setProgramTypes(typeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching types:", err);
        }
    };

    const getFilterSummary = () => {
        const dates = dateRange.allTime ? 'All Time' : (dateRange.start && dateRange.end ? `${dateRange.start} to ${dateRange.end}` : 'No range');
        const progType = selectedType === 'all' ? 'All Programs' : selectedType;
        return `Report: ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} | Period: ${dates} | Type: ${progType}`;
    };

    const fetchReports = async () => {
        setShowFilters(false);
        setLoading(true);
        try {
            let transQuery, archQuery;
            const transRef = collection(db, 'transactions');
            const archRef = collection(db, 'archived_transactions');

            if (dateRange.allTime) {
                transQuery = query(transRef, where('status', '==', 'COMPLETED'));
                archQuery = query(archRef, where('status', '==', 'COMPLETED'));
            } else if (dateRange.start && dateRange.end) {
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59, 999);

                transQuery = query(
                    transRef,
                    where('status', '==', 'COMPLETED'),
                    where('createdAt', '>=', startDate.toISOString()),
                    where('createdAt', '<=', endDate.toISOString())
                );
                archQuery = query(
                    archRef,
                    where('status', '==', 'COMPLETED'),
                    where('createdAt', '>=', startDate.toISOString()),
                    where('createdAt', '<=', endDate.toISOString())
                );
            } else {
                setLoading(false);
                return;
            }

            const fetchCollection = async (q) => {
                try {
                    const s = await getDocs(q);
                    return s.docs.map(doc => doc.data());
                } catch (e) {
                    console.error("Query failed:", e);
                    return [];
                }
            };

            const [activeData, archData] = await Promise.all([
                fetchCollection(transQuery),
                fetchCollection(archQuery)
            ]);

            const transactions = [...activeData, ...archData];

            const newStats = {
                programs: [],
                books: [],
                donations: { total: 0, count: 0 },
                summary: { totalRevenue: 0, totalParticipants: 0, totalDonations: 0, totalPrograms: 0 }
            };

            const programMap = new Map();
            const bookMap = new Map();

            transactions.forEach(t => {
                newStats.summary.totalRevenue += (t.amount || 0);

                if (t.itemType === 'PROGRAM') {
                    const pId = t.programId || 'unknown';
                    if (!programMap.has(pId)) {
                        programMap.set(pId, {
                            id: pId,
                            name: t.itemName || 'Unnamed Program',
                            count: 0,
                            amount: 0,
                            male: 0,
                            female: 0,
                            type: t.programType || 'Other'
                        });
                    }
                    const p = programMap.get(pId);
                    p.count += (t.participantCount || 0);
                    p.amount += (t.amount || 0);
                    newStats.summary.totalParticipants += (t.participantCount || 0);

                    if (t.participants) {
                        t.participants.forEach(pData => {
                            if (pData.gender === 'Male') p.male++;
                            else if (pData.gender === 'Female') p.female++;
                        });
                    }
                } else if (t.itemType === 'BOOK') {
                    if (t.orderItems) {
                        t.orderItems.forEach(item => {
                            const bId = item.id || 'unknown';
                            if (!bookMap.has(bId)) {
                                bookMap.set(bId, { id: bId, title: item.title || 'Unknown Book', count: 0, amount: 0 });
                            }
                            const b = bookMap.get(bId);
                            b.count += (item.quantity || 0);
                            b.amount += (item.price * item.quantity || 0);
                        });
                    }
                } else if (t.itemType === 'DONATION') {
                    newStats.donations.total += (t.amount || 0);
                    newStats.donations.count++;
                    newStats.summary.totalDonations += (t.amount || 0);
                }
            });

            let programList = Array.from(programMap.values());
            if (selectedType !== 'all') {
                programList = programList.filter(p => p.type === selectedType);
            }

            setStats({
                ...newStats,
                programs: programList,
                books: Array.from(bookMap.values()),
                summary: {
                    ...newStats.summary,
                    totalPrograms: programList.length
                }
            });

        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        let data = [];
        let filename = `report_${activeTab}_${getLocalDateString()}.csv`;

        if (activeTab === 'overall') {
            data = [{
                'Total Revenue': stats.summary.totalRevenue,
                'Total Participants': stats.summary.totalParticipants,
                'Total Programs': stats.summary.totalPrograms,
                'Total Donations': stats.donations.total,
                'Donation Count': stats.donations.count
            }];
        } else if (activeTab === 'programs') {
            data = stats.programs.map(p => ({
                'Program Name': p.name,
                'Type': p.type,
                'Participants': p.count,
                'Revenue': p.amount,
                'Male': p.male,
                'Female': p.female
            }));
        } else if (activeTab === 'books') {
            data = stats.books.map(b => ({
                'Book Title': b.title,
                'Quantity Sold': b.count,
                'Total Amount': b.amount
            }));
        } else if (activeTab === 'donations') {
            data = [{
                'Total Donation Amount': stats.donations.total,
                'Total Contributions': stats.donations.count
            }];
        }

        if (data.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                const val = row[h] === null || row[h] === undefined ? '' : row[h];
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(','))
        ];
        const csvContent = csvRows.join('\n');

        try {
            const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
            });

            await Share.share({
                title: `Export: ${activeTab}`,
                text: `SBB Admin Report - ${activeTab}`,
                url: result.uri,
                dialogTitle: 'Share Report CSV'
            });
        } catch (err) {
            console.error("Native export failed, falling back to web:", err);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
            <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'white',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/admin/back-office')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Reporting</h2>
                </div>
                <button
                    onClick={handleExport}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            <main style={{ padding: '1.5rem', maxWidth: '64rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        backgroundColor: 'white',
                        padding: '1rem 1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        border: '1px solid #f3f4f6'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Filter size={18} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4b5563' }}>
                            {getFilterSummary()}
                        </span>
                    </div>
                    <motion.div animate={{ rotate: showFilters ? 180 : 0 }}>
                        <ChevronLeft size={20} style={{ transform: 'rotate(-90deg)' }} />
                    </motion.div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.section
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1.5rem',
                                alignItems: 'center',
                                overflow: 'hidden',
                                border: '1px solid #f3f4f6',
                                marginTop: '-1.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>START DATE</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, allTime: false }))}
                                        disabled={dateRange.allTime}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                                <ArrowRight size={16} color="#9ca3af" style={{ marginTop: '1rem' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>END DATE</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value, allTime: false }))}
                                        disabled={dateRange.allTime}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem' }}>
                                <input
                                    type="checkbox"
                                    checked={dateRange.allTime}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, allTime: e.target.checked }))}
                                    style={{ width: '1.125rem', height: '1.125rem' }}
                                />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>All Time Report</span>
                            </label>

                            {((activeTab === 'programs' || activeTab === 'overall') && !selectedProgram) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '12rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>PROGRAM TYPE</label>
                                    <select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: 'white' }}
                                    >
                                        <option value="all">All Types</option>
                                        {programTypes.map(t => (
                                            <option key={t.id} value={t.name}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setShowFilters(false)}
                                    style={{
                                        padding: '0.5rem 1.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', gap: '2rem' }}>
                    {['overall', 'programs', 'books', 'donations'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setSelectedProgram(null); }}
                            style={{
                                padding: '0.75rem 0',
                                fontSize: '1rem',
                                fontWeight: 600,
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: activeTab === tab ? 'var(--color-primary)' : '#6b7280',
                                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : 'none',
                                marginBottom: '-2px',
                                textTransform: 'capitalize'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div style={{ position: 'relative', minHeight: '20rem' }}>
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}
                            >
                                <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid var(--color-secondary)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={activeTab + (selectedProgram?.id || '')}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {activeTab === 'overall' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                        <ReportCard
                                            title="Total Revenue"
                                            icon={BarChart3}
                                            value={`₹${stats.summary.totalRevenue.toLocaleString()}`}
                                            subtitle="Settled transactions"
                                        />
                                        <ReportCard
                                            title="Participants"
                                            icon={Users}
                                            value={stats.summary.totalParticipants}
                                            color="#3b82f6"
                                        />
                                        <ReportCard
                                            title="Programs"
                                            icon={Calendar}
                                            value={stats.summary.totalPrograms}
                                            color="#f59e0b"
                                        />
                                        <ReportCard
                                            title="Book Sales"
                                            icon={BookOpen}
                                            value={stats.books.length}
                                            color="#8b5cf6"
                                        />
                                        <ReportCard
                                            title="Donations"
                                            icon={Heart}
                                            value={`₹${stats.donations.total.toLocaleString()}`}
                                            subtitle={`${stats.donations.count} contributions`}
                                            color="#ef4444"
                                        />
                                    </div>
                                )}

                                {activeTab === 'programs' && (
                                    <>
                                        {selectedProgram ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                                <button
                                                    onClick={() => setSelectedProgram(null)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <ChevronLeft size={18} /> Back to all programs
                                                </button>
                                                <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>{selectedProgram.name}</h3>
                                                    <div style={{ display: 'flex', gap: '4rem' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Total Participants</div>
                                                            <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{selectedProgram.count}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Revenue</div>
                                                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a' }}>₹{selectedProgram.amount.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '2.5rem' }}>
                                                        <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Gender Distribution</h4>
                                                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                                            <div style={{ flex: 1, height: '1.5rem', backgroundColor: '#f3f4f6', borderRadius: '1rem', overflow: 'hidden', display: 'flex' }}>
                                                                <div style={{ width: `${(selectedProgram.male / selectedProgram.count) * 100}%`, backgroundColor: '#3b82f6' }} title="Male" />
                                                                <div style={{ width: `${(selectedProgram.female / selectedProgram.count) * 100}%`, backgroundColor: '#ec4899' }} title="Female" />
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }} /> Male: {selectedProgram.male}</span>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ec4899' }} /> Female: {selectedProgram.female}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {stats.programs.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>No program records found for this range.</div>
                                                ) : (
                                                    stats.programs.map((p, idx) => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => setSelectedProgram(p)}
                                                            style={{
                                                                backgroundColor: 'white',
                                                                padding: '1.25rem',
                                                                borderRadius: '0.75rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                cursor: 'pointer',
                                                                border: '1px solid #f3f4f6',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.type}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '3rem', textAlign: 'right', alignItems: 'center' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Participants</div>
                                                                    <div style={{ fontWeight: 600 }}>{p.count}</div>
                                                                </div>
                                                                <div style={{ width: '8rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Revenue</div>
                                                                    <div style={{ fontWeight: 700, color: '#16a34a' }}>₹{p.amount.toLocaleString()}</div>
                                                                </div>
                                                                <ChevronLeft size={20} color="#d1d5db" style={{ transform: 'rotate(180deg)' }} />
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'books' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {stats.books.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>No book sales records found.</div>
                                        ) : (
                                            stats.books.map(b => (
                                                <div
                                                    key={b.id}
                                                    style={{
                                                        backgroundColor: 'white',
                                                        padding: '1.25rem',
                                                        borderRadius: '0.75rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        border: '1px solid #f3f4f6'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600 }}>{b.title}</span>
                                                    <div style={{ display: 'flex', gap: '4rem', textAlign: 'right' }}>
                                                        <div>
                                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sold</div>
                                                            <div style={{ fontWeight: 600 }}>{b.count}</div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Amount</div>
                                                            <div style={{ fontWeight: 700, color: '#16a34a' }}>₹{b.amount.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'donations' && (
                                    <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                                        <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'inline-block', marginBottom: '1.5rem' }}>
                                            <Heart size={32} color="#ef4444" fill="#ef4444" />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Consolidated Donations</h3>
                                        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Summary for the selected period</p>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '2.5rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Amount</div>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a' }}>₹{stats.donations.total.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Count</div>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{stats.donations.count}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default BackOfficeReporting;
