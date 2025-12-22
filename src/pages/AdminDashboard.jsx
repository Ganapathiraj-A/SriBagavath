import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Image, Users, Calendar, LayoutDashboard, Map as MapIcon, RefreshCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where, count, getCountFromServer } from 'firebase/firestore';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [geoStats, setGeoStats] = useState(null);
    const [geoView, setGeoView] = useState('overall'); // 'overall' or 'monthly'
    const [loading, setLoading] = useState(true);

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

            if (geoSnap.exists()) {
                setGeoStats(geoSnap.data());
            }

        } catch (e) {
            console.error("Dashboard fetch failed", e);
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PageHeader
                title="Admin Dashboard"
                leftAction={
                    <button onClick={() => navigate(-1)} className="p-2">
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <button onClick={fetchStats} className="p-2">
                        <RefreshCcw size={20} />
                    </button>
                }
            />

            <div style={{ padding: '20px', display: 'grid', gap: '20px' }}>

                {/* Image Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <StatCard
                        title="Total Images"
                        value={stats?.totalImages}
                        icon={Image}
                        color="#8b5cf6"
                    />
                    <StatCard
                        title="Total Size"
                        value={stats?.totalImageSizeMB?.toFixed(2)}
                        unit="MB"
                        icon={RefreshCcw}
                        color="#ec4899"
                    />
                </div>

                {/* Registration Stats */}
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

                {/* Current Stats */}
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

                {/* User Stats */}
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
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(() => {
                            const currentMonth = new Date().toISOString().substring(0, 7);
                            const data = geoView === 'overall' ? (geoStats?.counts || {}) : (geoStats?.monthly?.[currentMonth] || {});
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
            </div>
        </div>
    );
};

export default AdminDashboard;
