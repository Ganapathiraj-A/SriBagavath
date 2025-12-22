import { signOut } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth } from '../firebase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useLocation, Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredPermission }) => {
    const { isAdmin, role, hasAccess, loading } = useAdminAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#ffffff'
            }}>
                <div className="spinner">Verifying access...</div>
            </div>
        );
    }

    if (!isAdmin) {
        // Redirect to admin-login, saving the current location for post-login redirect
        return <Navigate to="/admin-login" state={{ from: location }} replace />;
    }

    // Check specific permission if required
    if (requiredPermission && !hasAccess(requiredPermission)) {
        console.warn(`Access Denied. Role: ${role}, Required: ${requiredPermission}`);

        const handleLogout = async () => {
            if (confirm("Logout?")) {
                try {
                    await GoogleAuth.signOut();
                    try {
                        await GoogleAuth.disconnect();
                    } catch (dErr) {
                        console.warn("Disconnect failed:", dErr);
                    }
                } catch (e) {
                    console.warn("Google SignOut Error", e);
                }
                await signOut(auth);
                window.location.href = '/';
            }
        };

        return (
            <div style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem', backgroundColor: '#fee2e2', minHeight: '100vh' }}>
                <h2 style={{ color: '#dc2626' }}>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Role: {role || 'Unknown'}</p>
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', border: '1px solid #dc2626', background: 'white', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}>
                        Sign Out
                    </button>
                    <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Return Home</a>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
