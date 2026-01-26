import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import Home from './pages/Home';
import About from './pages/About';
import Programs from './pages/Programs';
import Conversations from './pages/Conversations';
import Books from './pages/Books';
import MonthlyMagazine from './pages/MonthlyMagazine';
import AudioBooks from './pages/AudioBooks';
import Videos from './pages/Videos';
import PdfBooks from './pages/PdfBooks';
import Contact from './pages/Contact';
import Configuration from './pages/Configuration';
import ProgramManagement from './pages/ProgramManagement';
import ProgramTypesManagement from './pages/ProgramTypesManagement';
import ManageUsers from './pages/ManageUsers';
import ProgramConversations from './pages/ProgramConversations';
import AyyasSchedule from './pages/AyyasSchedule';
import ScheduleManagement from './pages/ScheduleManagement';
import MyRegistrations from './pages/MyRegistrations';
import AdminReview from './pages/AdminReview';
import EventRegistration from './pages/EventRegistration';
import PaymentFlow from './pages/PaymentFlow';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminProgramManagement from './pages/AdminProgramManagement';
import ConsultationManagement from './pages/ConsultationManagement';
import ProgramCategories from './pages/ProgramCategories';
import EmptyPlaceholder from './pages/EmptyPlaceholder';
import Consultation from './pages/Consultation';
import OnlineMeetings from './pages/OnlineMeetings';
import OnlineMeetingDetails from './pages/OnlineMeetingDetails';
import OnlineMeetingManagement from './pages/OnlineMeetingManagement';
import SatsangManagement from './pages/SatsangManagement';
import SatsangListing from './pages/SatsangListing';
import SatsangDetails from './pages/SatsangDetails';
import BookStore from './pages/BookStore';
import BookStoreCheckout from './pages/BookStoreCheckout';
import BookStoreManagement from './pages/BookStoreManagement';
import DonationManagement from './pages/DonationManagement';
import MyOrders from './pages/MyOrders';
import Donations from './pages/Donations';
import MyDonations from './pages/MyDonations';
import AdminSettings from './pages/AdminSettings';
import AdminBookManagement from './pages/AdminBookManagement';
import BookDetails from './pages/BookDetails';
import BackOffice from './pages/BackOffice';
import BackOfficeReporting from './pages/BackOfficeReporting';
import BackOfficePrograms from './pages/BackOfficePrograms';
import BackOfficeAttendance from './pages/BackOfficeAttendance';
import BackOfficeOfflineRegistration from './pages/BackOfficeOfflineRegistration';
import BackOfficeOfflineBooks from './pages/BackOfficeOfflineBooks';
import BackOfficeOfflineDonation from './pages/BackOfficeOfflineDonation';
import BackOfficeImportExport from './pages/BackOfficeImportExport';
import BankReconciliation from './pages/BankReconciliation';
import BankStatementUpload from './pages/BankStatementUpload';
import BankReconciliationRegs from './pages/BankReconciliationRegs';
import BankStatementView from './pages/BankStatementView';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/ErrorBoundary';

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Centralized Screen Tracking
  useEffect(() => {
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
        <Route path="/configuration" element={<ProtectedRoute requiredPermission="CONFIGURATION"><Configuration /></ProtectedRoute>} />
        <Route path="/program" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><ProgramManagement /></ProtectedRoute>} />
        <Route path="/configuration/program-types" element={<ProtectedRoute requiredPermission="PROGRAM_TYPES"><ProgramTypesManagement /></ProtectedRoute>} />
        <Route path="/manage-users" element={<ProtectedRoute requiredPermission="MANAGE_USERS"><ManageUsers /></ProtectedRoute>} />
        <Route path="/conversations/programs" element={<ProtectedRoute requiredPermission="PROGRAM_CONVERSATIONS"><ProgramConversations /></ProtectedRoute>} />
        <Route path="/schedule/manage" element={<ProtectedRoute requiredPermission="SCHEDULE_MANAGEMENT"><ScheduleManagement /></ProtectedRoute>} />

        <Route path="/admin/program-management" element={<ProtectedRoute><AdminProgramManagement /></ProtectedRoute>} />
        <Route path="/admin/online-meetings" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><OnlineMeetingManagement /></ProtectedRoute>} />
        <Route path="/admin/satsang" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><SatsangManagement /></ProtectedRoute>} />
        <Route path="/admin/consultation" element={<ProtectedRoute requiredPermission="CONSULTATION_MANAGEMENT"><ConsultationManagement /></ProtectedRoute>} />
        <Route path="/admin/purchases" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><BookStoreManagement /></ProtectedRoute>} />
        <Route path="/admin/donations" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><DonationManagement /></ProtectedRoute>} />
        <Route path="/admin/books" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminBookManagement /></ProtectedRoute>} />

        <Route path="/admin-review" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminReview /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requiredPermission="CONFIGURATION"><AdminSettings /></ProtectedRoute>} />

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
    </AnimatePresence>
  );
}

import { GlobalSettingsProvider } from './context/GlobalSettingsContext';

import UpdateIcon from './components/UpdateIcon';

function App() {
  useEffect(() => {
    // Centralized initialization for GoogleAuth
    const initGoogle = async () => {
      try {
        await GoogleAuth.initialize({
          clientId: import.meta.env.VITE_GOOGLE_SERVER_CLIENT_ID || '265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      } catch (e) {
        console.warn("Root GoogleAuth init error (safe if already init):", e);
      }
    };
    initGoogle();
  }, []);

  return (
    <GlobalSettingsProvider>
      <CartProvider>
        <Router>
          <AdminAuthProvider>
            <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
              {/* Global Floating Update Icon (Dev/Beta Feature) */}
              <div style={{ position: 'fixed', top: '60px', right: '32px', zIndex: 9999 }}>
                <UpdateIcon />
              </div>

              <ErrorBoundary>
                <AnimatedRoutes />
              </ErrorBoundary>
            </div>
          </AdminAuthProvider>
        </Router>
      </CartProvider>
    </GlobalSettingsProvider>
  );
}

export default App;
