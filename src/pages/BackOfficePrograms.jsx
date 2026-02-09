import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Search,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from '@/utils/FirestoreProxy';

const BackOfficePrograms = () => {
    const navigate = useNavigate();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        setLoading(true);
        try {
            const programsRef = collection(db, 'programs');
            const q = query(programsRef, orderBy('programDate', 'desc'));
            const snap = await getDocs(q);
            setPrograms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error("Error fetching programs:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPrograms = programs.filter(p =>
        p.programName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.programCity?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
            <div style={{
                padding: '1rem 1.5rem',
                backgroundColor: 'white',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button onClick={() => navigate('/admin/back-office')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Attendance Tracking</h2>
            </div>

            <main style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                <div style={{ position: 'relative', marginBottom: '2rem' }}>
                    <Search
                        size={20}
                        color="#9ca3af"
                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search programs by name or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 3rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem',
                            outline: 'none',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                        }}
                    />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <div style={{ width: '2.5rem', height: '2.5rem', border: '3px solid var(--color-secondary)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredPrograms.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
                                No programs found.
                            </div>
                        ) : (
                            filteredPrograms.map((p, idx) => (
                                <motion.div
                                    key={p.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => navigate(`/admin/back-office/attendance/${p.id}`)}
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '1.25rem',
                                        borderRadius: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        border: '1px solid #f3f4f6',
                                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1.125rem', color: '#1f2937' }}>{p.programName}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Calendar size={14} />
                                                {new Date(p.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span>•</span>
                                            <span>{p.programCity}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Attendance</span>
                                        <ArrowRight size={18} />
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default BackOfficePrograms;
