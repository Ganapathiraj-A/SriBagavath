import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useLocation, Navigate } from 'react-router-dom';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

const ProtectedRoute = ({ children, requiredPermission, requiredRole, requiredAdmin, allowedPermissions }) => {
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

    // Perform security checks
    let accessDenied = false;

    // 1. Check strict role if required (e.g. SUPER_ADMIN routes)
    if (requiredRole && role !== requiredRole) {
        accessDenied = true;
    }

    // 2. Check individual permission if required
    if (requiredPermission && !hasAccess(requiredPermission)) {
        accessDenied = true;
    }

    // 3. Check if any of a set of permissions are allowed
    if (allowedPermissions && Array.isArray(allowedPermissions) && allowedPermissions.length > 0) {
        const hasAny = allowedPermissions.some(perm => hasAccess(perm));
        if (!hasAny) accessDenied = true;
    }

    // 4. Check if admin status is explicitly required (redundant with !isAdmin but safe)
    if (requiredAdmin && !isAdmin) {
        accessDenied = true;
    }

    if (accessDenied) {
        console.warn(`Access Denied to ${location.pathname}. Role: ${role}, Required: ${requiredRole || requiredPermission || allowedPermissions?.join(',')}`);

        const handleLogout = async () => {
            if (window.confirm("Logout?")) {
                if (Capacitor.isNativePlatform()) {
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
