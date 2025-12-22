import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Lock, Mail, Chrome } from 'lucide-react';
import '../components/RegistrationStyles.css';

const AdminLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin, isPending, loading: authLoading, setIsPending } = useAdminAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        } catch (err) {
            setError('Invalid email or password.');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        console.log("handleGoogleLogin initiated");
        try {
            console.log("Calling GoogleAuth.signIn()...");
            const googleUser = await GoogleAuth.signIn();
            console.log("GoogleAuth.signIn success:", JSON.stringify(googleUser));

            const idToken = googleUser?.authentication?.idToken;
            if (!idToken) {
                console.error("No ID Token received:", googleUser);
                throw new Error("No ID Token received. Please try again.");
            }

            console.log("Signing in to Firebase...");
            const credential = GoogleAuthProvider.credential(idToken);
            const result = await signInWithCredential(auth, credential);
            console.log("Firebase sign-in success for:", result.user.email);

            // Redirect or state update will be handled by onAuthStateChanged in AdminAuthContext
        } catch (err) {
            console.error("Google login error detail:", err);
            let msg = 'Unknown error';
            if (err.message) msg = err.message;
            else if (typeof err === 'string') msg = err;
            else if (err.error) msg = err.error;
            else msg = JSON.stringify(err);

            setError('Google login failed: ' + msg);
            setLoading(false);
        }
    };

    const handleRequestAccess = async () => {
        if (!user) return;
        console.log("Starting handleRequestAccess for user:", user.uid);
        setLoading(true);
        try {
            console.log("Writing to Firestore...");
            // Use setDoc with merge: true to avoid overwriting existing data if unnecessary, 
            // but here we want to ensure status is PENDING and timestamp is updated.
            await setDoc(doc(db, 'admin_requests', user.uid), {
                email: user.email,
                displayName: user.displayName || '',
                timestamp: Timestamp.now(),
                status: 'PENDING'
            });
            console.log("Firestore write successful.");

            // Update local state immediately before alert
            setIsPending(true);

            alert("Access request sent! Please wait for approval.");

        } catch (err) {
            console.error("Request failed:", err);
            setError('Request failed: ' + err.message);
        } finally {
            console.log("Finishing handleRequestAccess");
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await GoogleAuth.signOut();
            try {
                await GoogleAuth.disconnect();
            } catch (dErr) {
                console.warn("Disconnect failed:", dErr);
            }
        } catch (error) {
            console.warn("GoogleAuth signout error:", error);
        }
        await auth.signOut();
        navigate('/');
    };

    if (authLoading) {
        return <div className="spinner">Checking access...</div>;
    }

    return (
        <div className="payment-container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Login</h2>

                {error && (
                    <div style={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '10px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {/* Only show login form if user is not authenticated OR exists but not admin/pending */}
                    {(!user || user.isAnonymous) ? (
                        <>
                            <div className="form-group">
                                <label>Email</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                                    <Mail size={20} color="#6b7280" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{ border: 'none', boxShadow: 'none' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '8px', padding: '0 10px', background: 'white' }}>
                                    <Lock size={20} color="#6b7280" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ border: 'none', boxShadow: 'none' }}
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

                            <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center' }}>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
                                <span style={{ padding: '0 10px', color: '#6b7280', fontSize: '13px' }}>OR</span>
                                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid #e5e7eb' }} />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="btn-secondary full-width"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                                disabled={loading}
                            >
                                <Chrome size={20} color="#4285F4" />
                                Sign in with Google
                            </button>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
                                <p>Signed in as: <b>{user.email}</b></p>
                                <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '1rem', borderRadius: '0.75rem', marginTop: '1rem' }}>
                                    <b>Unauthorized</b>
                                    <p style={{ fontSize: '13px', marginTop: '0.5rem' }}>You do not have administrative privileges. Please contact an administrator to grant you access.</p>
                                </div>
                            </div>
                            <button type="button" onClick={handleSignOut} style={{ color: '#6b7280', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Sign out</button>
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>Back to Home</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
