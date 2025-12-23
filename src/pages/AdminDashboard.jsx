import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image, Users, Calendar, LayoutDashboard, Map as MapIcon, RefreshCcw, Database } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { StatsService } from '../services/StatsService';
import { doc, getDoc, collection, getDocs, query, where, count, getCountFromServer } from 'firebase/firestore';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [geoStats, setGeoStats] = useState(null);
    const [geoView, setGeoView] = useState('overall'); // 'overall' or 'monthly'
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]); // Last 30 days daily counts
    const [health, setHealth] = useState({ status: 'good', reason: 'System performance within limits' });

    const fetchStats = async () => {
        setLoading(true);
        try {
            const totalsRef = doc(db, "system_stats", "totals");
            const totalsSnap = await getDoc(totalsRef);

            const geoRef = doc(db, "geo_stats", "login_counts");
            const geoSnap = await getDoc(geoRef);

            // Fetch Today's Count
            const today = new Date().toISOString().split('T')[0];
            const todayRef = doc(db, "system_stats", `daily_${today}`);
            const todaySnap = await getDoc(todayRef);

            // Fetch Current Stats (Today & Future)
            const currentProgsQuery = query(collection(db, 'programs'), where('programDate', '>=', today));
            const currentProgsSnap = await getCountFromServer(currentProgsQuery);

            const currentRegsQuery = query(collection(db, 'transactions'), where('programDate', '>=', today));
            const currentRegsSnap = await getDocs(currentRegsQuery);
            const activeParticipants = currentRegsSnap.docs.reduce((acc, d) => acc + (d.data().participantCount || d.data().participants?.length || 1), 0);

            setStats({
                ...(totalsSnap.exists() ? totalsSnap.data() : {}),
                todayUsers: todaySnap.exists() ? todaySnap.data().count : 0,
                activePrograms: currentProgsSnap.data().count,
                activeParticipants: activeParticipants
            });

            // Fetch Last 30 Days History
            const last30Days = [];
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last30Days.push(date.toISOString().split('T')[0]);
            }

            const historySnaps = await Promise.all(
                last30Days.map(date => getDoc(doc(db, "system_stats", `daily_${date}`)))
            );

            const historyData = historySnaps
                .filter(s => s.exists())
                .map(s => ({ date: s.id.replace('daily_', ''), count: s.data().count || 0 }));

            setHistory(historyData);

            // Calculate Health
            const totalSizeMB = totalsSnap.exists() ? (totalsSnap.data().totalImageSizeMB || 0) : 0;
            const avgUsers = historyData.length > 0 ? (historyData.reduce((acc, d) => acc + d.count, 0) / historyData.length) : 0;
            const peakUsers = historyData.length > 0 ? Math.max(...historyData.map(d => d.count)) : 0;

            let healthStatus = 'good';
            let healthReason = 'System performance within limits';

            if (totalSizeMB > 500) {
                healthStatus = 'warning';
                healthReason = `Image storage (${totalSizeMB.toFixed(1)}MB) exceeds 500MB limit.`;
            } else if (avgUsers > 400) {
                healthStatus = 'warning';
                healthReason = `Average daily usage (${avgUsers.toFixed(0)} users) exceeds 400 user limit.`;
            } else if (peakUsers > 700) {
                healthStatus = 'warning';
                healthReason = `Peak daily usage reached ${peakUsers} users, exceeding 700 user threshold.`;
            } else if (historyData.length > 0) {
                healthReason = `Healthy: ${avgUsers.toFixed(0)} avg / ${peakUsers} peak users. Storage: ${totalSizeMB.toFixed(1)}MB`;
            }

            setHealth({ status: healthStatus, reason: healthReason });

            if (geoSnap.exists()) {
                setGeoStats(geoSnap.data());
            }

        } catch (e) {
            console.error("Dashboard fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        if (!window.confirm("This will scan the database to fix any count discrepancies. Continue?")) return;
        setLoading(true);
        try {
            await StatsService.recalculateTotals();
            alert("Stats recalculated successfully!");
            await fetchStats();
        } catch (e) {
            alert("Recalculate failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };
    const handleClearAll = async () => {
        const confirm1 = window.confirm("WARNING: This will delete ALL programs, registrations, and images. THIS CANNOT BE UNDONE. Are you absolutely sure?");
        if (!confirm1) return;
        const confirm2 = window.prompt("Type 'DELETE ALL' to confirm (Caps lock on):");
        if (confirm2 !== 'DELETE ALL') return;

        setLoading(true);
        try {
            await StatsService.clearAllData();
            alert("System has been reset successfully!");
            await fetchStats();
        } catch (e) {
            alert("Reset failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForceVisit = async () => {
        setLoading(true);
        try {
            await StatsService.trackUserLogin(true);
            alert("This device has been force-recorded as a visitor for today!");
            await fetchStats();
        } catch (e) {
            alert("Force visit failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const StatCard = ({ title, value, unit = "", icon: Icon, color }) => (
        <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        }}>
            <div style={{
                background: `${color}15`,
                padding: '12px',
                borderRadius: '12px',
                color: color
            }}>
                <Icon size={24} />
            </div>
            <div>
                <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{title}</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                    {value || 0}{unit}
                </div>
            </div>
        </div>
    );

    const SystemHealthCard = () => {
        const isGood = health.status === 'good';
        return (
            <div style={{
                background: isGood ? '#f0fdf4' : '#fffbeb',
                padding: '20px',
                borderRadius: '16px',
                border: `1px solid ${isGood ? '#bbf7d0' : '#fde68a'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isGood ? '#22c55e' : '#f59e0b', boxShadow: `0 0 8px ${isGood ? '#22c55e88' : '#f59e0b88'}` }} />
                    <span style={{ fontSize: '16px', fontWeight: '700', color: isGood ? '#166534' : '#92400e' }}>
                        System Status: {isGood ? 'Good' : 'Check Resources'}
                    </span>
                </div>
                <div style={{ fontSize: '14px', color: isGood ? '#15803d' : '#b45309' }}>
                    {health.reason}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PageHeader
                title="Admin Dashboard"
                leftAction={
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '20px', display: 'grid', gap: '20px' }}>

                {/* System Health Section */}
                <SystemHealthCard />

                {/* 1. Active Stats (Today & Future) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        title="Active Progs"
                        value={stats?.activePrograms}
                        icon={Calendar}
                        color="#f59e0b"
                    />
                    <StatCard
                        title="Active Participants"
                        value={stats?.activeParticipants}
                        icon={Users}
                        color="#ef4444"
                    />
                </div>

                {/* 2. User User Activity (Row 2) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        title="Users Today"
                        value={stats?.todayUsers}
                        icon={Users}
                        color="#06b6d4"
                    />
                    <StatCard
                        title="Users Month"
                        value={geoStats?.monthly?.[new Date().toISOString().substring(0, 7)] ?
                            Object.values(geoStats.monthly[new Date().toISOString().substring(0, 7)]).reduce((a, b) => a + b, 0) : 0
                        }
                        icon={Users}
                        color="#6366f1"
                    />
                </div>

                {/* 3. Overall Totals (Row 3) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        title="Overall Progs"
                        value={stats?.totalPrograms}
                        icon={LayoutDashboard}
                        color="#3b82f6"
                    />
                    <StatCard
                        title="Overall Participants"
                        value={stats?.totalParticipants}
                        icon={Users}
                        color="#10b981"
                    />
                </div>

                {/* 4. Image Stats (Row 4) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        title="Program Banners"
                        value={stats?.totalBanners}
                        icon={Image}
                        color="#8b5cf6"
                    />
                    <StatCard
                        title="Receipt Images"
                        value={stats?.totalReceipts}
                        icon={Image}
                        color="#ec4899"
                    />
                    <StatCard
                        title="Online Banners"
                        value={stats?.totalOnlineBanners}
                        icon={Image}
                        color="#3b82f6"
                    />
                    <StatCard
                        title="Sathsang Banners"
                        value={stats?.totalSathsangBanners}
                        icon={Image}
                        color="#f97316"
                    />
                </div>

                {/* 5. Total Storage */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    <StatCard
                        title="Total Image Storage Size"
                        value={stats?.totalImageSizeMB?.toFixed(2)}
                        unit="MB"
                        icon={RefreshCcw}
                        color="#6b7280"
                    />
                </div>

                {/* Geographic Distribution */}
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapIcon size={20} color="#3b82f6" />
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{geoView === 'overall' ? 'Overall' : 'Monthly'} Distribution</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                                <button
                                    onClick={() => setGeoView('overall')}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '12px',
                                        borderRadius: '6px',
                                        background: geoView === 'overall' ? 'white' : 'transparent',
                                        boxShadow: geoView === 'overall' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        border: 'none',
                                        fontWeight: '500'
                                    }}
                                >Overall</button>
                                <button
                                    onClick={() => setGeoView('monthly')}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '12px',
                                        borderRadius: '6px',
                                        background: geoView === 'monthly' ? 'white' : 'transparent',
                                        boxShadow: geoView === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        border: 'none',
                                        fontWeight: '500'
                                    }}
                                >Month</button>
                            </div>

                            {geoView === 'monthly' && geoStats?.monthly && (
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    overflowX: 'auto',
                                    maxWidth: '100%',
                                    paddingBottom: '4px',
                                    WebkitOverflowScrolling: 'touch',
                                    msOverflowStyle: 'none',
                                    scrollbarWidth: 'none'
                                }}>
                                    {Object.keys(geoStats.monthly).sort().reverse().map(m => {
                                        const isActive = selectedMonth === m;
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => setSelectedMonth(m)}
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '11px',
                                                    borderRadius: '8px',
                                                    border: '1px solid',
                                                    borderColor: isActive ? '#3b82f6' : '#e5e7eb',
                                                    background: isActive ? '#3b82f6' : 'white',
                                                    color: isActive ? 'white' : '#6b7280',
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {new Date(m + "-02").toLocaleString('default', { month: 'short', year: '2-digit' })}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                            const data = geoView === 'overall' ? (geoStats?.counts || {}) : (geoStats?.monthly?.[selectedMonth] || {});
                            const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
                            const total = Object.values(data).reduce((a, b) => a + b, 0);

                            if (entries.length === 0) {
                                return (
                                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>
                                        No data for this view.
                                    </div>
                                );
                            }

                            return entries.slice(0, 10).map(([loc, count]) => {
                                const percentage = ((count / total) * 100).toFixed(1);
                                return (
                                    <div key={loc}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                                            <span style={{ fontWeight: '500' }}>{loc}</span>
                                            <span style={{ color: '#6b7280' }}>{count} users ({percentage}%)</span>
                                        </div>
                                        <div style={{ background: '#f3f4f6', height: '8px', borderRadius: '4px' }}>
                                            <div style={{
                                                background: '#3b82f6',
                                                height: '100%',
                                                width: `${percentage}%`,
                                                borderRadius: '4px',
                                                transition: 'width 0.5s ease-out'
                                            }} />
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Diagnostics (Debug Only) */}
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fffbeb',
                    borderRadius: '16px',
                    border: '1px solid #fde68a',
                    fontSize: '13px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>📊 Diagnostics</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#b45309' }}>
                        <div>Last Data Sync: {stats?.updatedAt?.toDate?.()?.toLocaleString() || "Never"}</div>
                        <div>Total Unique Devices: {stats?.totalUniqueDevices || 0}</div>
                        <button
                            onClick={handleForceVisit}
                            style={{
                                padding: '8px 12px',
                                background: '#fef3c7',
                                border: '1px solid #fcd34d',
                                borderRadius: '8px',
                                color: '#92400e',
                                fontWeight: '600',
                                width: 'fit-content'
                            }}
                        >
                            Force Track This Device
                        </button>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px 20px 32px 20px',
                    backgroundColor: 'white',
                    borderTop: '1px solid #e5e7eb',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    marginBottom: '-20px',
                    marginLeft: '-20px',
                    marginRight: '-20px'
                }}>
                    <button
                        onClick={fetchStats}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: '#f3f4f6',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#4b5563',
                            fontWeight: '600'
                        }}
                    >
                        <RefreshCcw size={18} /> Refresh
                    </button>
                    <button
                        onClick={handleRecalculate}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: '#e0f2fe',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#0369a1',
                            fontWeight: '600'
                        }}
                    >
                        <Database size={18} /> Sync
                    </button>
                    <button
                        onClick={handleClearAll}
                        style={{
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: '#fee2e2',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#b91c1c'
                        }}
                    >
                        <RefreshCcw size={18} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
