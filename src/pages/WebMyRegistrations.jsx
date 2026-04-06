import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransactionService } from '@/services/TransactionService';
import { auth } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { LogIn, Calendar, MapPin, ChevronRight } from 'lucide-react';

const WebMyRegistrations = () => {
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [allPrograms, setAllPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        const unsubAuth = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubAuth();
    }, []);

    const handleSignIn = async () => {
        setAuthLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Auth failed:", err);
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        if (!currentUser || currentUser.isAnonymous) return;

        const unsubscribe = TransactionService.streamUserTransactions((data) => {
            const filtered = (data || []).filter(tx => {
                const type = tx.itemType || 'PROGRAM';
                return type === 'PROGRAM';
            });
            setRegistrations(filtered);
            setLoading(false);
        });

        const fetchPrograms = async () => {
            try {
                const { collection, getDocsCacheFirst } = await import('@/utils/FirestoreProxy');
                const { db } = await import('../firebase');
                const snapshot = await getDocsCacheFirst(collection(db, 'programs'));
                const progs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllPrograms(progs);
            } catch (_err) {
                console.error("Failed to fetch programs", _err);
            }
        };
        fetchPrograms();

        return () => unsubscribe();
    }, [currentUser]);

    const formatProgramDate = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (!currentUser || currentUser.isAnonymous) {
        return (
            <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '3rem', backgroundColor: 'var(--color-card)', borderRadius: '1.5rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
                    <div style={{ backgroundColor: 'var(--color-primary-transparent)', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <LogIn size={40} color="var(--color-primary)" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Sign In Required</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Sign in to view and manage your program registrations.</p>
                    <button onClick={handleSignIn} disabled={authLoading} style={{ width: '100%', padding: '1rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                        {authLoading ? 'Connecting...' : 'Sign in with Google'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem 1rem', maxWidth: '64rem', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 900 }}>My Registrations</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Keep track of your upcoming and past events.</p>
            </header>

            {loading ? (
                <p>Loading your registrations...</p>
            ) : registrations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <p style={{ fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>No registrations found.</p>
                    <button onClick={() => navigate('/web/events')} style={{ marginTop: '1rem', color: 'var(--color-primary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}>Explore Programs</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {registrations.map(tx => (
                        <div key={tx.id} style={{ backgroundColor: 'var(--color-card)', borderRadius: '1.25rem', padding: '1.5rem', border: '1px solid var(--color-border)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{tx.itemName}</h3>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={14} /> {formatProgramDate(tx.programDate)}
                                        </div>
                                        {tx.programCity && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MapPin size={14} /> {tx.programCity}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 800, backgroundColor: tx.status === 'REGISTERED' || tx.status === 'COMPLETED' ? '#dcfce7' : '#fee2e2', color: tx.status === 'REGISTERED' || tx.status === 'COMPLETED' ? '#166534' : '#991b1b' }}>
                                    {tx.status}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Amount Paid:</span>
                                    <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>₹{tx.amount}</span>
                                </div>
                                <button 
                                    onClick={() => navigate(`/web/programs/retreat?id=${tx.programId}`)}
                                    style={{ color: 'var(--color-primary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    Details <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WebMyRegistrations;
