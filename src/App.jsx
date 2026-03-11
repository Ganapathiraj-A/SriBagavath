import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { ensureGoogleAuthInitialized } from './utils/GoogleAuthUtils';
import DiagnosticLogs from './utils/DiagnosticLogs';

import Home from './pages/Home'; // Home stays static for immediate visible paint

// Lazy load all other pages
const About = lazy(() => import('./pages/About'));
const Programs = lazy(() => import('./pages/Programs'));
const Books = lazy(() => import('./pages/Books'));
const MonthlyMagazine = lazy(() => import('./pages/MonthlyMagazine'));
const AudioBooks = lazy(() => import('./pages/AudioBooks'));
const Videos = lazy(() => import('./pages/Videos'));
const PdfBooks = lazy(() => import('./pages/PdfBooks'));
const Contact = lazy(() => import('./pages/Contact'));
const Configuration = lazy(() => import('./pages/Configuration'));
const ProgramManagement = lazy(() => import('./pages/ProgramManagement'));
const ProgramTypesManagement = lazy(() => import('./pages/ProgramTypesManagement'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const ProgramConversations = lazy(() => import('./pages/ProgramConversations'));
const UrlSettings = lazy(() => import('./pages/UrlSettings'));
const DigitalBookSettings = lazy(() => import('./pages/DigitalBookSettings'));
const RelatedVideosManagement = lazy(() => import('./pages/RelatedVideosManagement'));
const RecordedPrograms = lazy(() => import('./pages/RecordedPrograms'));
const DigitalBooksHub = lazy(() => import('./pages/DigitalBooksHub'));
const AyyasSchedule = lazy(() => import('./pages/AyyasSchedule'));
const ScheduleManagement = lazy(() => import('./pages/ScheduleManagement'));
const MyRegistrations = lazy(() => import('./pages/MyRegistrations'));
const AdminReview = lazy(() => import('./pages/AdminReview'));
const EventRegistration = lazy(() => import('./pages/EventRegistration'));
const PaymentFlow = lazy(() => import('./pages/PaymentFlow'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProgramManagement = lazy(() => import('./pages/AdminProgramManagement'));
const ConsultationManagement = lazy(() => import('./pages/ConsultationManagement'));
const ProgramCategories = lazy(() => import('./pages/ProgramCategories'));
const Consultation = lazy(() => import('./pages/Consultation'));
const OnlineMeetings = lazy(() => import('./pages/OnlineMeetings'));
const OnlineMeetingDetails = lazy(() => import('./pages/OnlineMeetingDetails'));
const OnlineMeetingManagement = lazy(() => import('./pages/OnlineMeetingManagement'));
const SatsangManagement = lazy(() => import('./pages/SatsangManagement'));
const SatsangListing = lazy(() => import('./pages/SatsangListing'));
const SatsangDetails = lazy(() => import('./pages/SatsangDetails'));
const DailyZoomMeetings = lazy(() => import('./pages/DailyZoomMeetings'));
const DailyZoomManagement = lazy(() => import('./pages/DailyZoomManagement'));
const DailyZoomTeacherManagement = lazy(() => import('./pages/DailyZoomTeacherManagement'));
const DailyZoomLinkManagement = lazy(() => import('./pages/DailyZoomLinkManagement'));
const BookStore = lazy(() => import('./pages/BookStore'));
const BookStoreCheckout = lazy(() => import('./pages/BookStoreCheckout'));
const BookStoreManagement = lazy(() => import('./pages/BookStoreManagement'));
const DonationManagement = lazy(() => import('./pages/DonationManagement'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const Donations = lazy(() => import('./pages/Donations'));
const MyDonations = lazy(() => import('./pages/MyDonations'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const PersonalProfile = lazy(() => import('./pages/PersonalProfile'));
const CloudGlobalSettings = lazy(() => import('./pages/CloudGlobalSettings'));
const BooksAndMediaManagement = lazy(() => import('./pages/BooksAndMediaManagement'));
const AnalyticsAndSystem = lazy(() => import('./pages/AnalyticsAndSystem'));
const HideScreens = lazy(() => import('./pages/HideScreens'));
const PageAndUserManagement = lazy(() => import('./pages/PageAndUserManagement.jsx'));
const AdminBookManagement = lazy(() => import('./pages/AdminBookManagement'));
const AdminAudioBookManagement = lazy(() => import('./pages/AdminAudioBookManagement'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const BackOffice = lazy(() => import('./pages/BackOffice'));
const BackOfficeReporting = lazy(() => import('./pages/BackOfficeReporting'));
const BackOfficePrograms = lazy(() => import('./pages/BackOfficePrograms'));
const BackOfficeAttendance = lazy(() => import('./pages/BackOfficeAttendance'));
const BackOfficeOfflineRegistration = lazy(() => import('./pages/BackOfficeOfflineRegistration'));
const BackOfficeOfflineBooks = lazy(() => import('./pages/BackOfficeOfflineBooks'));
const BackOfficeOfflineDonation = lazy(() => import('./pages/BackOfficeOfflineDonation'));
const BackOfficeImportExport = lazy(() => import('./pages/BackOfficeImportExport'));
const BankReconciliation = lazy(() => import('./pages/BankReconciliation'));
const BankStatementUpload = lazy(() => import('./pages/BankStatementUpload'));
const BankReconciliationRegs = lazy(() => import('./pages/BankReconciliationRegs'));
const BankStatementView = lazy(() => import('./pages/BankStatementView'));
const MediaMigration = lazy(() => import('./pages/MediaMigration'));
import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CartProvider } from './context/CartContext';
import { GlobalSettingsProvider, useGlobalSettings } from './context/GlobalSettingsContext';
import { useAdminAuth } from './context/AdminAuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import ApiCounterOverlay from './components/ApiCounterOverlay';
import DiagnosticLogOverlay from './components/DiagnosticLogOverlay';
import ForceUpdateModal from './components/ForceUpdateModal';
import SkeletonScreen from './components/SkeletonScreen';

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAdminAuth();

  // Centralized Screen Tracking
  useEffect(() => {
    DiagnosticLogs.logNavigation(location.pathname === '/' ? 'Home' : location.pathname);

    const Analytics = import('./utils/Analytics').then(m => {
      m.default.trackScreenView(location.pathname === '/' ? 'Home' : location.pathname);
    });
  }, [location.pathname]);

  // Handle Android hardware back button via Capacitor
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let backButtonListener;

    const setupBackButtonHandler = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', () => {
        const { pathname, search } = location;

        if (pathname === '/') {
          CapacitorApp.exitApp();
          return;
        }

        // 1. Exception: Payment Flow should use normal history
        const isPaymentFlow = pathname.includes('/payment-flow') ||
          pathname.includes('/event-registration') ||
          pathname.includes('/bookstore-checkout');

        if (isPaymentFlow) {
          navigate(-1);
          return;
        }

        // 2. Exception: Search Params handling
        if (search) {
          // For Folder/List style navigation, move back in hierarchy by clearing search
          const hierarchicalListingPaths = [
            '/monthly-magazine',
            '/programs/retreat',
            '/programs/online',
            '/programs/satsang'
          ];

          // Check for exact path match to avoid parent hub interference
          if (hierarchicalListingPaths.includes(pathname)) {
            navigate(pathname, { replace: true });
            return;
          }

          // Special case: Programs Hub - if we have search (like ?id=) stay on listings
          if (pathname === '/programs') {
            navigate(pathname, { replace: true });
            return;
          }

          // For Admin "Edit" modes, clear search params and replace history to avoid loops
          navigate(pathname, { replace: true });
          return;
        }

        // 3. Hierarchical Navigation Logic
        // Special case: Back Office attendance
        if (pathname.includes('/admin/back-office/attendance/')) {
          navigate('/admin/back-office/programs');
          return;
        }

        // Special case: Book Details
        if (pathname.startsWith('/book/')) {
          navigate('/bookstore');
          return;
        }

        // Custom Parent Mappings
        const parentMappings = {
          '/admin/back-office': '/configuration',
          '/admin/settings': '/configuration',
          '/admin/page-user-management': '/configuration',
          '/admin/hide-screens': '/admin/page-user-management',
          '/admin/personal-profile': '/admin/settings',
          '/admin/cloud-settings': '/admin/settings',
          '/admin/books-media': '/admin/page-user-management',
          '/admin/analytics-system': '/admin/settings',
          '/admin/url-settings': '/admin/settings',
          '/admin/digital-books-settings': '/admin/settings',
          '/admin/related-videos': '/admin/settings',
          '/admin-review': '/configuration',
          '/admin/purchases': '/configuration',
          '/admin/donations': '/configuration',
          '/admin/books': '/configuration',
          '/admin/program-management': '/admin/page-user-management',
          '/admin/online-meetings': '/admin/program-management',
          '/admin/satsang': '/admin/program-management',
          '/admin/consultation': '/admin/program-management',
          '/admin/daily-zoom': '/admin/program-management',
          '/admin/daily-zoom/teachers': '/admin/daily-zoom',
          '/admin/daily-zoom/links': '/admin/daily-zoom',
          '/program': '/admin/program-management',
          '/schedule/manage': '/admin/program-management',
          '/configuration/program-types': '/admin/program-management',
          '/manage-users': '/configuration',
          '/admin-dashboard': '/configuration',
          '/conversations/programs': '/configuration',
          '/admin/back-office/reporting': '/admin/back-office',
          '/admin/back-office/programs': '/admin/back-office',
          '/admin/back-office/reconciliation': '/admin/back-office',
          '/admin/back-office/reconciliation/upload': '/admin/back-office/reconciliation',
          '/admin/back-office/reconciliation/registrations': '/admin/back-office/reconciliation',
          '/admin/back-office/reconciliation/view': '/admin/back-office/reconciliation',
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
          '/digital-books': '/books',
          '/pdf-books': '/books',
          '/audio-books': '/books',
          '/videos': '/books',
          '/monthly-magazine': '/books',
          '/conversations': '/books',
          '/conversations/recorded-programs': '/books'
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

        // Configuration sub-pages (Catch-all for back-office deep links)
        if (pathname.startsWith('/admin/back-office/') && pathname !== '/admin/back-office') {
          navigate('/admin/back-office');
          return;
        }

        // Generic Hierarchical Logic: Go up one level
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 1) {
          const parentPath = '/' + segments.slice(0, -1).join('/');
          navigate(parentPath);
        } else {
          navigate('/');
        }
      });
    };

    setupBackButtonHandler();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [location.pathname, location.search, navigate]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)' }}>
          Loading...
        </div>
      }>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/programs" element={<ProgramCategories />} />
          <Route path="/programs/retreat" element={<Programs />} />
          <Route path="/programs/online" element={<OnlineMeetings />} />
          <Route path="/programs/online/:id" element={<OnlineMeetingDetails />} />
          <Route path="/programs/satsang" element={<SatsangListing />} />
          <Route path="/programs/satsang/:id" element={<SatsangDetails />} />
          <Route path="/programs/consultation" element={<Consultation />} />
          <Route path="/programs/online/daily" element={<DailyZoomMeetings />} />
          <Route path="/conversations/recorded-programs" element={<RecordedPrograms />} />
          <Route path="/books" element={<Books />} />
          <Route path="/bookstore" element={<BookStore />} />
          <Route path="/book/:bookId" element={<BookDetails />} />
          <Route path="/bookstore-checkout" element={<BookStoreCheckout />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/my-donations" element={<MyDonations />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/monthly-magazine" element={<MonthlyMagazine />} />
          <Route path="/audio-books" element={<AudioBooks />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/pdf-books" element={<PdfBooks />} />
          <Route path="/digital-books" element={<DigitalBooksHub />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/my-registrations" element={<MyRegistrations />} />
          <Route path="/event-registration" element={<EventRegistration />} />
          <Route path="/payment-flow" element={<PaymentFlow />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Admin Routes */}
          <Route path="/configuration" element={<ProtectedRoute><Configuration /></ProtectedRoute>} />
          <Route path="/program" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><ProgramManagement /></ProtectedRoute>} />
          <Route path="/configuration/program-types" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><ProgramTypesManagement /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute requiredPermission="MANAGE_USERS"><ManageUsers /></ProtectedRoute>} />
          <Route path="/conversations/programs" element={<ProtectedRoute requiredPermission="PROGRAM_CONVERSATIONS"><ProgramConversations /></ProtectedRoute>} />
          <Route path="/admin/url-settings" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><UrlSettings /></ProtectedRoute>} />
          <Route path="/admin/digital-books-settings" element={<ProtectedRoute requiredPermission="DIGITAL_BOOKS_MANAGEMENT"><DigitalBookSettings /></ProtectedRoute>} />
          <Route path="/admin/related-videos" element={<ProtectedRoute requiredPermission="RELATED_VIDEO_MANAGEMENT"><RelatedVideosManagement /></ProtectedRoute>} />
          <Route path="/schedule/manage" element={<ProtectedRoute requiredPermission="SCHEDULE_MANAGEMENT"><ScheduleManagement /></ProtectedRoute>} />

          <Route path="/admin/program-management" element={<ProtectedRoute><AdminProgramManagement /></ProtectedRoute>} />
          <Route path="/admin/online-meetings" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><OnlineMeetingManagement /></ProtectedRoute>} />
          <Route path="/admin/satsang" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><SatsangManagement /></ProtectedRoute>} />
          <Route path="/admin/consultation" element={<ProtectedRoute requiredPermission="CONSULTATION_MANAGEMENT"><ConsultationManagement /></ProtectedRoute>} />
          <Route path="/admin/daily-zoom" element={<ProtectedRoute requiredPermission="DAILY_ZOOM_MANAGEMENT"><DailyZoomManagement /></ProtectedRoute>} />
          <Route path="/admin/daily-zoom/teachers" element={<ProtectedRoute requiredPermission="DAILY_ZOOM_MANAGEMENT"><DailyZoomTeacherManagement /></ProtectedRoute>} />
          <Route path="/admin/daily-zoom/links" element={<ProtectedRoute requiredPermission="DAILY_ZOOM_MANAGEMENT"><DailyZoomLinkManagement /></ProtectedRoute>} />
          <Route path="/admin/purchases" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BookStoreManagement /></ProtectedRoute>} />
          <Route path="/admin/donations" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><DonationManagement /></ProtectedRoute>} />
          <Route path="/admin/books" element={<ProtectedRoute requiredPermission="PRINT_BOOKS_MANAGEMENT"><AdminBookManagement /></ProtectedRoute>} />
          <Route path="/admin/audio-books" element={<ProtectedRoute requiredPermission="AUDIO_BOOKS_MANAGEMENT"><AdminAudioBookManagement /></ProtectedRoute>} />

          <Route path="/admin-review" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminReview /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute requiredPermission="REPORTING"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/personal-profile" element={<ProtectedRoute><PersonalProfile /></ProtectedRoute>} />
          <Route path="/admin/cloud-settings" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><CloudGlobalSettings /></ProtectedRoute>} />
          <Route path="/admin/books-media" element={<ProtectedRoute requiredAdmin={true} allowedPermissions={['BANKING', 'DIGITAL_BOOKS_MANAGEMENT', 'RELATED_VIDEO_MANAGEMENT']}><BooksAndMediaManagement /></ProtectedRoute>} />
          <Route path="/admin/analytics-system" element={<ProtectedRoute requiredAdmin={true} allowedPermissions={['REPORTING']}><AnalyticsAndSystem /></ProtectedRoute>} />
          <Route path="/admin/hide-screens" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><HideScreens /></ProtectedRoute>} />
          <Route path="/admin/page-user-management" element={<ProtectedRoute requiredAdmin={true} allowedPermissions={['PROGRAM_MANAGEMENT', 'CONSULTATION_MANAGEMENT', 'DAILY_ZOOM_MANAGEMENT', 'BANKING', 'DIGITAL_BOOKS_MANAGEMENT', 'RELATED_VIDEO_MANAGEMENT', 'MANAGE_USERS', 'SUPER_ADMIN']}><PageAndUserManagement /></ProtectedRoute>} />
          <Route path="/admin/media-migration" element={<ProtectedRoute requiredRole="SUPER_ADMIN"><MediaMigration /></ProtectedRoute>} />

          {/* Back Office Routes */}
          <Route path="/admin/back-office" element={<ProtectedRoute requiredPermission="REPORTING"><BackOffice /></ProtectedRoute>} />
          <Route path="/admin/back-office/reporting" element={<ProtectedRoute requiredPermission="REPORTING"><BackOfficeReporting /></ProtectedRoute>} />
          <Route path="/admin/back-office/programs" element={<ProtectedRoute requiredPermission="ATTENDANCE"><BackOfficePrograms /></ProtectedRoute>} />
          <Route path="/admin/back-office/attendance/:programId" element={<ProtectedRoute requiredPermission="ATTENDANCE"><BackOfficeAttendance /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation" element={<ProtectedRoute requiredPermission="BANKING"><BankReconciliation /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/upload" element={<ProtectedRoute requiredPermission="BANKING"><BankStatementUpload /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/registrations" element={<ProtectedRoute requiredPermission="BANKING"><BankReconciliationRegs /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/view" element={<ProtectedRoute requiredPermission="BANKING"><BankStatementView /></ProtectedRoute>} />
          {/* Bank Verification Hub Reverted */}

          {/* Offline Transactions Screens */}
          <Route path="/admin/back-office/offline-registration" element={<ProtectedRoute requiredPermission="OFFLINE_ENTRY"><BackOfficeOfflineRegistration /></ProtectedRoute>} />
          <Route path="/admin/back-office/offline-books" element={<ProtectedRoute requiredPermission="OFFLINE_ENTRY"><BackOfficeOfflineBooks /></ProtectedRoute>} />
          <Route path="/admin/back-office/offline-donation" element={<ProtectedRoute requiredPermission="OFFLINE_ENTRY"><BackOfficeOfflineDonation /></ProtectedRoute>} />
          <Route path="/admin/back-office/import-export" element={<ProtectedRoute requiredPermission="IMPORT_EXPORT"><BackOfficeImportExport /></ProtectedRoute>} />

          {/* Public view but management is admin */}
          <Route path="/schedule" element={<AyyasSchedule />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

import UpdateIcon from './components/UpdateIcon';

function AppContent() {
  const [currentVersion, setCurrentVersion] = React.useState(null);
  const { minAppVersion } = useGlobalSettings();
  const { isInitialized } = useAdminAuth();
  const [showSkeleton, setShowSkeleton] = React.useState(true);

  // Fallback: hide skeleton after max 2 seconds
  useEffect(() => {
    const maxTimer = setTimeout(() => setShowSkeleton(false), 2000);
    return () => clearTimeout(maxTimer);
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      // 1. Initialize Google Auth
      await ensureGoogleAuthInitialized();

      // 2. Get App Version
      if (Capacitor.isNativePlatform()) {
        const info = await CapacitorApp.getInfo();
        setCurrentVersion(info.version);
      } else {
        // Fallback for web/dev
        const APP_VERSION_TAG = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.0';
        setCurrentVersion(APP_VERSION_TAG);
      }
    };
    fetchVersion();
  }, []);

  const shouldShowSkeleton = showSkeleton && !isInitialized;

  // Show skeleton on first render
  if (shouldShowSkeleton) {
    return <SkeletonScreen />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}>
      <ApiCounterOverlay />
      <DiagnosticLogOverlay />
      {/* Global Force Update Modal */}
      <ForceUpdateModal currentVersion={currentVersion} minVersion={minAppVersion} />

      {/* Global Floating Update Icon (Dev/Beta Feature) */}
      <div style={{ position: 'fixed', top: '60px', right: '32px', zIndex: 9999 }}>
        <UpdateIcon />
      </div>

      <ErrorBoundary>
        <AnimatedRoutes />
      </ErrorBoundary>
    </div>
  );
};

function App() {
  return (
    <GlobalSettingsProvider>
      <CartProvider>
        <Router>
          <AdminAuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AdminAuthProvider>
        </Router>
      </CartProvider>
    </GlobalSettingsProvider>
  );
}

export default App;
