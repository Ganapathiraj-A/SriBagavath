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
        if (location.pathname !== '/') {
          navigate(-1);
        } else {
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButtonHandler();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [location.pathname, navigate]);

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
        <Route path="/admin/back-office/reconciliation" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><div style={{ padding: '2rem' }}>Bank Reconciliation (Coming Soon)</div></ProtectedRoute>} />

        {/* Public view but management is admin */}
        <Route path="/schedule" element={<AyyasSchedule />} />
      </Routes>
    </AnimatePresence>
  );
}

import { GlobalSettingsProvider } from './context/GlobalSettingsContext';

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
            <ErrorBoundary>
              <AnimatedRoutes />
            </ErrorBoundary>
          </AdminAuthProvider>
        </Router>
      </CartProvider>
    </GlobalSettingsProvider>
  );
}

export default App;
