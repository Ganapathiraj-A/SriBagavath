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

import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

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
        <Route path="/programs" element={<Programs />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/books" element={<Books />} />
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
        {/* Admin Routes */}
        <Route path="/configuration" element={<ProtectedRoute requiredPermission="CONFIGURATION"><Configuration /></ProtectedRoute>} />
        <Route path="/program" element={<ProtectedRoute requiredPermission="PROGRAM_MANAGEMENT"><ProgramManagement /></ProtectedRoute>} />
        <Route path="/configuration/program-types" element={<ProtectedRoute requiredPermission="PROGRAM_TYPES"><ProgramTypesManagement /></ProtectedRoute>} />
        <Route path="/manage-users" element={<ProtectedRoute requiredPermission="MANAGE_USERS"><ManageUsers /></ProtectedRoute>} />
        <Route path="/conversations/programs" element={<ProtectedRoute requiredPermission="PROGRAM_CONVERSATIONS"><ProgramConversations /></ProtectedRoute>} />
        <Route path="/schedule/manage" element={<ProtectedRoute requiredPermission="SCHEDULE_MANAGEMENT"><ScheduleManagement /></ProtectedRoute>} />
        <Route path="/admin-review" element={<ProtectedRoute requiredPermission="ADMIN_REVIEW"><AdminReview /></ProtectedRoute>} />

        {/* Public view but management is admin */}
        <Route path="/schedule" element={<AyyasSchedule />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    // Centralized initialization for GoogleAuth
    const initGoogle = async () => {
      try {
        await GoogleAuth.initialize({
          clientId: '358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        console.log("Root GoogleAuth initialized");
      } catch (e) {
        console.warn("Root GoogleAuth init error (safe if already init):", e);
      }
    };
    initGoogle();
  }, []);

  return (
    <Router>
      <AdminAuthProvider>
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>
      </AdminAuthProvider>
    </Router>
  );
}

export default App;
