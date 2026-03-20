import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Database, Users, TrendingUp, IndianRupee, Activity, ShieldAlert, RefreshCcw, Calendar, TrendingDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { doc, getDoc, collection, getDocs } from '@/utils/FirestoreProxy';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

// --- Cost Configuration ---
const READ_COST_PER_100K_USD = 0.06;
const WRITE_COST_PER_100K_USD = 0.18;
const USD_TO_INR = 83;

const YesterdaySnapshot = ({ data }) => {
    if (!data) return null;
    return (
        <div style={{
            background: 'var(--color-primary-transparent)',
            padding: '20px',
            borderRadius: '20px',
            border: '1px solid var(--color-primary)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            textAlign: 'center'
        }}>
            <div style={{ gridColumn: 'span 3', marginBottom: '4px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} /> Yesterday's Snapshot ({data.date})
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Users</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)' }}>{data.activeUsers || 0}</div>
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Reads</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)' }}>{(data.firestoreReads || 0).toLocaleString()}</div>
            </div>
            <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Writes</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)' }}>{(data.firestoreWrites || 0).toLocaleString()}</div>
            </div>
        </div>
    );
};

const WeeklyHistoryTable = ({ history }) => {
    const last7Days = history.slice(0, 7);
    return (
        <div style={{
            background: 'var(--color-card)',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{ padding: '16px', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--color-success)" />
                <span style={{ fontSize: '15px', fontWeight: '700' }}>Last 7 Days History</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', color: 'var(--color-text-muted)' }}>Date</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)' }}>Users</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)' }}>Reads</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-muted)' }}>Writes</th>
                    </tr>
                </thead>
                <tbody>
                    {last7Days.map((day, idx) => (
                        <tr key={day.date} style={{ borderBottom: idx === last7Days.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                            <td style={{ padding: '10px 16px', color: 'var(--color-text)' }}>{day.date.split('-').slice(1).join('/')}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', color: 'var(--color-text)' }}>{day.activeUsers || 0}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{(day.firestoreReads || 0).toLocaleString()}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{(day.firestoreWrites || 0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CostAnalysisCard = ({ reads, writes }) => {
    const readsCostUSD = (reads / 100000) * READ_COST_PER_100K_USD;
    const writesCostUSD = (writes / 100000) * WRITE_COST_PER_100K_USD;
    const totalUSD = readsCostUSD + writesCostUSD;
    const totalINR = totalUSD * USD_TO_INR;

    return (
        <div style={{
            background: 'var(--color-card)',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IndianRupee size={22} color="var(--color-success)" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Monthly Cost Breakdown</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Firestore Reads ({reads.toLocaleString()})</span>
                    <span style={{ fontWeight: '600' }}>₹{(readsCostUSD * USD_TO_INR).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Firestore Writes ({writes.toLocaleString()})</span>
                    <span style={{ fontWeight: '600' }}>₹{(writesCostUSD * USD_TO_INR).toFixed(2)}</span>
                </div>
                <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: 'var(--color-success)' }}>
                    <span>Total Monthly Estimate</span>
                    <span>₹{totalINR.toFixed(2)}</span>
                </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'right' }}>
                *Based on last 30 days usage ($1 = ₹{USD_TO_INR})
            </div>
        </div>
    );
};

const EconomicsCard = ({ activeAudience, avgDailyUsers, totalCostINR }) => {
    const costPerInstalled = activeAudience > 0 ? (totalCostINR / activeAudience) : 0;
    const costPerDAU = avgDailyUsers > 0 ? (totalCostINR / avgDailyUsers) : 0;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--color-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Cost / Active Audience</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-text)' }}>₹{costPerInstalled.toFixed(4)}</div>
            </div>
            <div style={{ background: 'var(--color-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Cost / Active User (DAU)</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-info)' }}>₹{costPerDAU.toFixed(2)}</div>
            </div>
        </div>
    );
};

const ScalingTable = ({ avgDAU, peakDAU, activeAudience, lifetimeUsers }) => (
    <div style={{
        background: 'var(--color-card)',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)'
    }}>
        <div style={{ padding: '16px', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--color-info)" />
            <span style={{ fontSize: '15px', fontWeight: '700' }}>Usage Scaling Metrics</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>Avg Daily Users (30d)</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700' }}>{avgDAU.toFixed(0)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>Peak Daily Users (30d)</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: 'var(--color-error)' }}>{peakDAU.toLocaleString()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>Active Audience (Approx 30d)</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: 'var(--color-info)' }}>{activeAudience.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>Lifetime Reach (Historical)</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>{lifetimeUsers.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>
    </div>
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { appVersion } = useGlobalSettings();

    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const summaryRef = doc(db, "app_analytics", "summary");
            const historyRef = collection(db, "app_analytics", "daily_history", "dates");

            const [summarySnap, historySnap] = await Promise.all([
                getDoc(summaryRef),
                getDocs(historyRef)
            ]);

            if (summarySnap.exists()) {
                setSummary(summarySnap.data());
            }

            const historyData = historySnap.docs
                .map(doc => ({ date: doc.id, ...doc.data() }))
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 30); // Last 30 days

            setHistory(historyData);
        } catch (err) {
            console.error("Dashboard fetch failed", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived Metrics
    const lifetimeUsers = summary?.lifetimeTotalUsers || 0;
    const activeAudience = summary?.activeAudience28d || 0;
    const totalReads30d = history.reduce((acc, d) => acc + (d.firestoreReads || 0), 0);
    const totalWrites30d = history.reduce((acc, d) => acc + (d.firestoreWrites || 0), 0);
    const avgDAU = history.length > 0 ? (history.reduce((acc, d) => acc + (d.activeUsers || 0), 0) / history.length) : 0;
    const peakDAU = history.length > 0 ? Math.max(...history.map(d => d.activeUsers || 0)) : 0;

    const totalCostUSD = ((totalReads30d / 100000) * READ_COST_PER_100K_USD) + ((totalWrites30d / 100000) * WRITE_COST_PER_100K_USD);
    const totalCostINR = totalCostUSD * USD_TO_INR;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', paddingBottom: '40px' }}>
            <PageHeader
                title="Economics Dashboard"
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <button onClick={fetchData} style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-primary)' }}>
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                }
            />

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                    <Activity className="animate-pulse" size={48} color="var(--color-primary)" />
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '42rem', margin: '0 auto' }}
                >
                    {/* Yesterday Snapshot Section */}
                    <YesterdaySnapshot data={history[0]} />

                    {/* Past Week History Table */}
                    <WeeklyHistoryTable history={history} />

                    {/* Cost Summary Section */}
                    <CostAnalysisCard reads={totalReads30d} writes={totalWrites30d} />
                    
                    {/* Per-User Economics Section */}
                    <EconomicsCard 
                        activeAudience={activeAudience} 
                        avgDailyUsers={avgDAU} 
                        totalCostINR={totalCostINR} 
                    />

                    {/* Usage Scaling Table */}
                    <ScalingTable 
                        avgDAU={avgDAU} 
                        peakDAU={peakDAU} 
                        activeAudience={activeAudience}
                        lifetimeUsers={lifetimeUsers}
                    />

                    {/* Diagnostics/Info */}
                    <div style={{
                        padding: '16px',
                        background: 'var(--color-info-transparent)',
                        borderRadius: '16px',
                        border: '1px solid var(--color-info)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                    }}>
                        <ShieldAlert size={20} color="var(--color-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ fontSize: '13px', color: 'var(--color-info-dark)', lineHeight: 1.5 }}>
                            <strong>Metric Note:</strong> 'Active Audience' matches Play Console more closely by counting unique users active in the last 30 days. 'Lifetime Reach' includes every user since inception.
                        </div>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginTop: '10px'
                    }}>
                        {import.meta.env.MODE.toUpperCase()} ENGINE | v{appVersion}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default AdminDashboard;
