import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';

const PageHeader = ({
    title,
    subtitle = null,
    showBack = true,
    leftAction = null,
    rightAction = null,
    bgColor = 'transparent',
    textColor = 'var(--color-text)'
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { role } = useAdminAuth();
    const { t } = useGlobalSettings();

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
            '/admin/url-settings': '/admin/settings',
            '/admin/related-videos': '/admin/books-media',
            '/admin/digital-books-settings': '/admin/books-media',
            '/admin/personal-profile': '/admin/settings',
            '/admin/cloud-settings': '/admin/settings',
            '/admin/hide-screens': '/admin/settings',
            '/admin-review': '/configuration',
            '/admin/purchases': '/configuration',
            '/admin/donations': '/configuration',
            '/admin/books': '/admin/books-media',
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
            '/programs/retreat': '/programs',
            '/programs/online': '/programs',
            '/programs/satsang': '/programs',
            '/programs/consultation': '/programs',
            '/programs/online/daily': '/programs',
            '/schedule': '/programs',
            '/bookstore': '/books',
            '/pdf-books': '/books',
            '/audio-books': '/related-videos',
            '/videos': '/books',
            '/monthly-magazine': '/books',
            '/conversations': '/books',
            '/conversations/recorded-programs': '/books',
            '/admin/audio-books': '/configuration',
            '/digital-books': '/books',
            '/related-videos': '/books',
            '/gallery': '/books',
            '/admin/gallery': '/admin/settings',
            '/admin/contacts-settings': '/admin/settings',
            '/admin/media-migration': '/admin/settings',
            '/admin/books-media': '/admin/settings',
            '/admin/analytics-system': '/admin/settings'
        };

        if (location.state?.returnPath) {
            navigate(location.state.returnPath);
            return;
        }

        if (parentMappings[pathname]) {
            // Power User Restriction: Always go back to Admin Home for admin paths
            const isAdminPath = pathname.startsWith('/admin/') ||
                pathname === '/program' ||
                pathname === '/manage-users' ||
                pathname === '/schedule/manage' ||
                pathname === '/configuration/program-types' ||
                pathname === '/admin-review' ||
                pathname === '/admin-dashboard';

            if (role === 'POWER_USER' && isAdminPath) {
                navigate('/configuration');
                return;
            }

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
            position: 'relative',
            zIndex: 50,
            backgroundColor: 'transparent',
            color: textColor,
            paddingTop: '40px',
            paddingBottom: '24px',
            paddingLeft: '16px',
            paddingRight: '16px',
            display: 'grid',
            gridTemplateColumns: 'minmax(44px, auto) 1fr minmax(44px, auto)',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '0.5rem'
        }}>
            {/* Left Action Container */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
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
                fontSize: '1.4rem',
                fontWeight: 500,
                margin: 0,
                textAlign: 'center',
                color: 'var(--color-text)',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                overflow: 'hidden',
                display: '-webkit-box',
                webkitLineClamp: 2,
                webkitBoxOrient: 'vertical'
            }}>
                {(() => {
                    const isAdminPage = location.pathname.startsWith('/admin') || 
                                       location.pathname.startsWith('/configuration') ||
                                       location.pathname === '/manage-users' ||
                                       location.pathname === '/program';
                    
                    if (isAdminPage) return title;

                    // Mapping for common titles to translation keys
                    const titleKeyMap = {
                        'Donations': 'DONATIONS',
                        'Programs': 'PROGRAMS',
                        'Books': 'BOOKS_MEDIA',
                        'Contact': 'CONTACT',
                        'About Ayya': 'ABOUT',
                        'Retreat Programs': 'RETREAT_PROGRAMS',
                        'Online Programs': 'ONLINE_PROGRAMS',
                        'Satsangs': 'SATSANGS',
                        'Consultation': 'CONSULTATION',
                        'Daily Zoom': 'DAILY_ZOOM',
                        'Monthly Magazine': 'MAGAZINE',
                        'Gallery': 'GALLERY',
                        'Audio Books': 'AUDIO_BOOKS',
                        'Videos': 'VIDEOS',
                        'PDF Books': 'PDF_BOOKS',
                        'Digital Books': 'DIGITAL_BOOKS',
                        'My Registrations': 'MY_REGISTRATIONS',
                        'My Orders': 'MY_ORDERS',
                        'My Donations': 'MY_DONATIONS',
                        'Sri Bagavath Mission': 'SRI_BAGAVATH_MISSION'
                    };

                    const key = titleKeyMap[title] || title;
                    return t(key);
                })()}
                {subtitle && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {subtitle}
                    </div>
                )}
            </h1>

            {/* Right: Action Container */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }}>
                {rightAction}
            </div>
        </div>
    );
};

export default PageHeader;
