import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PageHeader = ({
    title,
    subtitle = null,
    showBack = true,
    leftAction = null,
    rightAction = null,
    bgColor = 'white',
    textColor = '#111827'
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Hierarchical navigate back
    const handleBack = () => {
        const { pathname, search } = location;

        // 1. If we have search params, handle them (like details or folder navigation)
        if (search) {
            const hierarchicalListingPaths = [
                '/monthly-magazine',
                '/programs/retreat',
                '/programs/online',
                '/programs/satsang'
            ];

            if (hierarchicalListingPaths.includes(pathname)) {
                navigate(pathname, { replace: true });
                return;
            }

            // Special case: Programs Hub - if we have search (like ?id=) stay on listings
            if (pathname === '/programs') {
                navigate(pathname, { replace: true });
                return;
            }

            // For admin edits, clear search but stay on page (hierarchical logic follows)
            navigate(pathname, { replace: true });
            return;
        }

        // 2. Custom Parent Mappings (Duplicate logic from App.jsx for UI consistency)
        if (pathname.includes('/admin/back-office/attendance/')) {
            navigate('/admin/back-office/programs');
            return;
        }

        if (pathname.startsWith('/book/')) {
            navigate('/bookstore');
            return;
        }

        const parentMappings = {
            '/admin/back-office': '/configuration',
            '/admin/settings': '/configuration',
            '/admin-review': '/configuration',
            '/admin/purchases': '/configuration',
            '/admin/donations': '/configuration',
            '/admin/books': '/configuration',
            '/admin/program-management': '/configuration',
            '/admin/online-meetings': '/admin/program-management',
            '/admin/satsang': '/admin/program-management',
            '/admin/consultation': '/admin/program-management',
            '/program': '/admin/program-management',
            '/schedule/manage': '/admin/program-management',
            '/configuration/program-types': '/admin/program-management',
            '/manage-users': '/configuration',
            '/admin-dashboard': '/configuration',
            '/conversations/programs': '/configuration',
            '/admin/back-office/reporting': '/admin/back-office',
            '/admin/back-office/programs': '/admin/back-office',
            '/admin/back-office/reconciliation': '/admin/back-office',
            '/admin/back-office/offline-registration': '/admin/back-office',
            '/admin/back-office/offline-books': '/admin/back-office',
            '/admin/back-office/offline-donation': '/admin/back-office',
            '/admin/back-office/import-export': '/admin/back-office',
            '/my-donations': '/donations',
            '/my-orders': '/bookstore',
            '/my-registrations': '/programs/retreat',
            '/programs/consultation': '/programs',
            '/schedule': '/programs',
            '/bookstore': '/books',
            '/pdf-books': '/books',
            '/audio-books': '/related-videos',
            '/videos': '/related-videos',
            '/monthly-magazine': '/books',
            '/conversations': '/books',
            '/conversations/recorded-programs': '/books'
        };

        if (location.state?.returnPath) {
            navigate(location.state.returnPath);
            return;
        }

        if (parentMappings[pathname]) {
            navigate(parentMappings[pathname]);
            return;
        }

        if (pathname.startsWith('/admin/back-office/') && pathname !== '/admin/back-office') {
            navigate('/admin/back-office');
            return;
        }

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 1) {
            const parentPath = '/' + segments.slice(0, -1).join('/');
            navigate(parentPath);
        } else {
            navigate('/');
        }
    };

    // Don't show back button on Home
    const canGoBack = showBack && location.pathname !== '/';

    return (
        <div style={{
            position: 'relative', // Not sticky anymore
            zIndex: 50,
            backgroundColor: 'transparent', // Transparent to blend with page
            color: textColor,
            // Header spacing similar to Books screen padding
            paddingTop: '40px',
            paddingBottom: '24px',
            paddingLeft: '16px',
            paddingRight: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.5rem'
        }}>
            {/* Left Action: Custom or Default Hierarchical Back */}
            <div style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center'
            }}>
                {leftAction ? leftAction : (
                    canGoBack && (
                        <button
                            onClick={handleBack}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: textColor
                            }}
                        >
                            <ChevronLeft size={28} />
                        </button>
                    )
                )}
            </div>

            {/* Center: Title */}
            <h1 style={{
                fontSize: '1.5rem', // Match Books-ish size (Books is 1.875rem, but 1.5 is safer for mobile headers)
                fontWeight: 500, // Match Registration screen look
                margin: 0,
                textAlign: 'center',
                color: '#111827', // Dark gray
                maxWidth: '60%', // Reduced slightly to make room for right icons
                lineHeight: 1.2
            }}>
                {title}
                {subtitle && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6b7280', marginTop: '2px' }}>
                        {subtitle}
                    </div>
                )}
            </h1>

            {/* Right: Action */}
            <div style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                {/* UpdateIcon removed (moved to App.jsx global) */}
                {rightAction}
            </div>
        </div>
    );
};

export default PageHeader;
