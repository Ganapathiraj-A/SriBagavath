import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaPhone, FaMapMarkerAlt, FaClock, FaEnvelope, FaFacebookF, FaInstagram, FaYoutube, FaUser } from 'react-icons/fa';
import { LogOut, LogIn, User } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './WebLayout.css';
import WebImagePrefetcher from './WebImagePrefetcher';
import { usePWA } from '../context/PWAContext';
import { useGlobalSettings } from '../context/GlobalSettingsContext';

const WebLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAdminAuth();
  const { installApp } = usePWA();
  const { t } = useGlobalSettings();

  const handleLogout = async () => {
    console.log("[WebLayout] Logout initiate");
    if (window.confirm("Are you sure you want to sign out?")) {
      console.log("[WebLayout] Logout confirmed. Starting Firebase signOut...");
      try {
        await signOut(auth);
        console.log("[WebLayout] Firebase signOut SUCCESS");
      } catch (err) {
        console.error("[WebLayout] Logout error:", err);
        alert("Logout Error: " + err.message);
      }
    } else {
      console.log("[WebLayout] Logout cancelled.");
    }
  };

  const getTagline = () => {
    switch (location.pathname) {
      case '/web/store':
        return "Discover Sri Bagavath Ayya's profound teachings in print.";
      case '/web/donate':
        return "Your contributions help us spread spiritual awareness and maintain our centers.";
      case '/web/about':
        return "Learn about the wisdom and teachings of Sri Bagavath Ayya.";
      case '/web/contact':
        return "Get in touch with the Sri Bagavath Mission.";
      case '/web/events':
        return "Join our upcoming satsangs and meditation camps.";
      case '/web/emedia':
        return "Listen & Read Online.";
      case '/web/account':
        return "Manage your registrations, orders, and donations.";
      default:
        if (location.pathname.startsWith('/web/book/')) {
          return "Discover Sri Bagavath Ayya's profound teachings in print.";
        }
        if (location.pathname.startsWith('/web/checkout')) {
          return "Secure Checkout";
        }
        return "Your Simple Path To Enlightenment.";
    }
  };

  const navLinks = [
    { name: t('HOME'), path: '/web' },
    { name: t('EVENTS'), path: '/web/events' },
    { name: t('E_MEDIA'), path: '/web/emedia' },
    { name: t('STORE'), path: '/web/store' },
    { name: t('DONATIONS'), path: '/web/donate' },
    { name: t('GALLERY'), path: '/web/gallery' },
    { name: t('ABOUT'), path: '/web/about' },
    { name: t('CONTACT'), path: '/web/contact' },
    { name: t('ACCOUNT'), path: '/web/account' }
  ];

  return (
    <div className="web-layout">
      <WebImagePrefetcher />
      {/* Top Contact Header */}
      <div className="web-top-header">
        <div className="web-container">
          <div className="web-contact-items">
            <div className="web-contact-item">
              <FaMapMarkerAlt />
              <span>Salem, India (Registered Address)</span>
            </div>
            <div className="web-contact-item">
              <FaPhone />
              <span>+91 97891 65555 (Support 9 AM - 9 PM)</span>
            </div>
            <div className="web-contact-item">
              <FaClock />
              <span>Mon - Fri: 10:00 - 18:00 (Store open)</span>
            </div>
          </div>
          <div className="web-user-nav">
            {user && !user.isAnonymous ? (
              <div className="web-user-profile">
                <div className="web-user-profile-header">
                  <div className="web-user-avatar">
                     {user.photoURL ? <img src={user.photoURL} alt="" /> : <FaUser />}
                  </div>
                  <span className="web-user-name">{user.displayName || 'Devotee'}</span>
                  <button onClick={handleLogout} className="web-logout-btn" title="Sign Out">
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
                <div className="web-login-container">
                  <Link to="/web/account" className="web-login-link">
                    <LogIn size={16} />
                    <span>{t('SIGN_IN_WEB')}</span>
                  </Link>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Logo Section */}
      <header className="web-main-header">
        <div className="web-container">
          <div className="web-logo-container">
            <img 
              src="/assets/sri-bagavath-logo.png?v=3.3.4" 
              alt="Sri Bagavath" 
              className="web-mission-logo"
            />
            <div className="web-logo-text">
              <p className="web-tagline">{getTagline()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="web-nav-bar">
        <div className="web-container">
          <div className="web-nav-content">
            <ul className="web-nav-links">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className={location.pathname === link.path ? 'active' : ''}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="web-social-links">
              <a href="https://facebook.com" target="_blank" rel="noreferrer"><FaFacebookF /></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer"><FaInstagram /></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer"><FaYoutube /></a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="web-main-content">
        <React.Suspense fallback={<div className="loading-state" style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
          {children}
        </React.Suspense>
      </main>

      {/* Footer */}
      <footer className="web-footer">
        <div className="web-container">
          <div className="web-footer-grid">
            <div className="web-footer-section">
              <h3>{t('ABOUT_SRI_BAGAVATH')}</h3>
              <p>
                Sri Bagavath Mission is dedicated to sharing the wisdom and teachings of Sri Bagavath Ayya for spiritual liberation and mental wellness.
              </p>
            </div>
            <div className="web-footer-section">
              <h3>{t('QUICK_LINKS')}</h3>
              <ul>
                <li><Link to="/web/about">{t('ABOUT_AYYA')}</Link></li>
                <li><Link to="/web/events">{t('EVENTS_CAMPS')}</Link></li>
                <li><Link to="/web/store">{t('BOOK_STORE_FOOTER')}</Link></li>
                <li><Link to="/web/emedia">{t('E_MEDIA')}</Link></li>
              </ul>
            </div>
            <div className="web-footer-section">
              <h3>{t('CONTACT_US')}</h3>
              <p><FaEnvelope /> info@sribagavath.org</p>
              <p><FaPhone /> +91 97891 65555</p>
            </div>
          </div>
          <div className="web-footer-bottom">
            <p>&copy; {new Date().getFullYear()} Sri Bagavath Mission. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WebLayout;
