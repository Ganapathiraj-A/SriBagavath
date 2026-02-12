import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { GET_GOOGLE_CLIENT_ID, ensureGoogleAuthInitialized } from './utils/GoogleAuthUtils';

import Home from './pages/Home'; // Home stays static for immediate visible paint

// Lazy load all other pages
const About = lazy(() => import('./pages/About'));
const Programs = lazy(() => import('./pages/Programs'));
const Conversations = lazy(() => import('./pages/Conversations'));
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
const AdminBookManagement = lazy(() => import('./pages/AdminBookManagement'));
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

  // Centralized Screen Tracking
  useEffect(() => {
    import('./utils/DiagnosticLogs').then(m => {
      m.default.logNavigation(location.pathname === '/' ? 'Home' : location.pathname);
    });

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
          '/admin-review': '/configuration',
          '/admin/purchases': '/configuration',
          '/admin/donations': '/configuration',
          '/admin/books': '/configuration',
          '/admin/program-management': '/configuration',
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
          '/programs/consultation': '/programs',
          '/programs/online/daily': '/programs',
          '/schedule': '/programs',
          '/bookstore': '/books',
          '/pdf-books': '/books',
          '/audio-books': '/books',
          '/videos': '/books',
          '/monthly-magazine': '/books',
          '/conversations': '/books'
        };

        if (parentMappings[pathname]) {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb', color: '#6b7280' }}>
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
          <Route path="/conversations" element={<Conversations />} />
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
          <Route path="/contact" element={<Contact />} />
          <Route path="/my-registrations" element={<MyRegistrations />} />
          <Route path="/event-registration" element={<EventRegistration />} />
          <Route path="/payment-flow" element={<PaymentFlow />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Admin Routes */}
          <Route path="/configuration" element={<ProtectedRoute><Configuration /></ProtectedRoute>} />
          <Route path="/program" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><ProgramManagement /></ProtectedRoute>} />
          <Route path="/configuration/program-types" element={<ProtectedRoute requiredPermission="PROGRAM_TYPES"><ProgramTypesManagement /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute requiredPermission="MANAGE_USERS"><ManageUsers /></ProtectedRoute>} />
          <Route path="/conversations/programs" element={<ProtectedRoute requiredPermission="PROGRAM_CONVERSATIONS"><ProgramConversations /></ProtectedRoute>} />
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
          <Route path="/admin/books" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminBookManagement /></ProtectedRoute>} />

          <Route path="/admin-review" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminReview /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />

          {/* Back Office Routes */}
          <Route path="/admin/back-office" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOffice /></ProtectedRoute>} />
          <Route path="/admin/back-office/reporting" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeReporting /></ProtectedRoute>} />
          <Route path="/admin/back-office/programs" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficePrograms /></ProtectedRoute>} />
          <Route path="/admin/back-office/attendance/:programId" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeAttendance /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BankReconciliation /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/upload" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BankStatementUpload /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/registrations" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BankReconciliationRegs /></ProtectedRoute>} />
          <Route path="/admin/back-office/reconciliation/view" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BankStatementView /></ProtectedRoute>} />
          {/* Bank Verification Hub Reverted */}

          {/* Offline Transactions Screens */}
          <Route path="/admin/back-office/offline-registration" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeOfflineRegistration /></ProtectedRoute>} />
          <Route path="/admin/back-office/offline-books" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeOfflineBooks /></ProtectedRoute>} />
          <Route path="/admin/back-office/offline-donation" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeOfflineDonation /></ProtectedRoute>} />
          <Route path="/admin/back-office/import-export" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BackOfficeImportExport /></ProtectedRoute>} />

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
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
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
