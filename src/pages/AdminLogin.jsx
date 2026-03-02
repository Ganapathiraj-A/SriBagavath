import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, Timestamp } from '@/utils/FirestoreProxy';
import { auth, db } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Lock, Mail, Chrome, RefreshCw } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import '../components/RegistrationStyles.css';

const AdminLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin, isPending, loading: authLoading, setIsPending, checkAdminStatus } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [appInfo, setAppInfo] = useState({ version: '', id: '' });

    useEffect(() => {
        const fetchInfo = async () => {
            if (Capacitor.isNativePlatform()) {
                const { App } = await import('@capacitor/app');
                const info = await App.getInfo();
                setAppInfo({ version: info.version, id: info.id });
            }
        };
        fetchInfo();
    }, []);

    // Get the page the user was trying to access
    const from = location.state?.from?.pathname || '/admin-review';
    useEffect(() => {
        // If already admin, redirect away
        if (!authLoading && isAdmin) {
            navigate(from, { replace: true });
        }
    }, [isAdmin, authLoading, navigate, from]);




    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch {
            setError('Invalid email or password.');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await ensureGoogleAuthInitialized();

            let idToken = null;

            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // Already signed in via popup
                // Redirect will be handled by the useEffect watching isAdmin
                return;
            }

            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);

            // Redirect will be handled by the useEffect watching isAdmin
        } catch (_err) {
            console.error("Login verification failed:", _err);
            setError('Login failed: ' + _err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAccess = async () => {
        if (!user) return;
        try {
            await setDoc(doc(db, 'admin_requests', user.uid), {
                email: user.email,
                name: user.displayName || '',
                timestamp: Timestamp.now(),
                status: 'PENDING'
            });
            setIsPending(true);
            alert("Access request sent! Please wait for approval.");
        } catch (err) {
            setError('Request failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                await GoogleAuth.signOut();
                try {
                    await GoogleAuth.disconnect();
                } catch (dErr) {
                    console.warn("Disconnect failed:", dErr);
                }
            }
        } catch (_err) {
            console.warn("GoogleAuth signout error:", error);
        }
        await auth.signOut();
        navigate('/');
    };

    if (authLoading) {
        return <div className="spinner">Checking access...</div>;
    }

    return (
        <div className="payment-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--color-text)' }}>Admin Login</h2>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--color-error-transparent)',
                        color: 'var(--color-error)',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '14px',
                        border: '1px solid var(--color-error)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {/* Only show login form if user is not authenticated OR exists but not admin/pending */}
                    {(!user || user.isAnonymous) ? (
                        <>
                            <div className="form-group">
                                <label style={{ color: 'var(--color-text)' }}>Email</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 10px', background: 'var(--color-surface)' }}>
                                    <Mail size={20} color="var(--color-text-muted)" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{ border: 'none', boxShadow: 'none', background: 'none', color: 'var(--color-text)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ color: 'var(--color-text)' }}>Password</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '0 10px', background: 'var(--color-surface)' }}>
                                    <Lock size={20} color="var(--color-text-muted)" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ border: 'none', boxShadow: 'none', background: 'none', color: 'var(--color-text)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary full-width"
                                style={{ marginTop: '20px' }}
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>

                            <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                                    Build v{appInfo.version} ({appInfo.id})
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
                                    <span style={{ padding: '0 10px', color: 'var(--color-text-muted)', fontSize: '13px' }}>OR</span>
                                    <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="btn-secondary full-width"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                disabled={loading}
                            >
                                <Chrome size={20} color="#4285F4" />
                                Sign in with Google
                            </button>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ marginBottom: '1.5rem', color: 'var(--color-text)' }}>
                                <p>Signed in as: <b>{user.email}</b></p>
                                <div style={{ backgroundColor: isPending ? 'var(--color-warning-transparent)' : 'var(--color-error-transparent)', color: isPending ? 'var(--color-warning)' : 'var(--color-error)', padding: '1rem', borderRadius: '0.75rem', marginTop: '1rem', border: '1px solid currentColor' }}>
                                    <b>{isPending ? 'Approval Pending' : 'Unauthorized'}</b>
                                    <p style={{ fontSize: '13px', marginTop: '0.5rem' }}>
                                        {isPending
                                            ? "Your request is being reviewed. Please wait for an administrator to approve."
                                            : "You do not have administrative privileges. Request access or contact an admin."}
                                    </p>
                                </div>
                                {isPending && (
                                    <button
                                        onClick={async () => {
                                            setLoading(true);
                                            await checkAdminStatus(user.uid);
                                            setLoading(false);
                                        }}
                                        disabled={loading}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '0.5rem 1rem',
                                            backgroundColor: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '0.5rem',
                                            color: 'var(--color-text)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            margin: '1rem auto 0 auto'
                                        }}
                                    >
                                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                        Refresh Status
                                    </button>
                                )}
                                {!isPending && !isAdmin && (
                                    <button
                                        onClick={handleRequestAccess}
                                        disabled={loading}
                                        className="btn-primary full-width"
                                        style={{ marginTop: '1rem' }}
                                    >
                                        {loading ? 'Sending Request...' : 'Request Admin Access'}
                                    </button>
                                )}
                            </div>
                            <button type="button" onClick={handleSignOut} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Sign out</button>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Back to Home</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
