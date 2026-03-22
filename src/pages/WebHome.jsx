import React from 'react';
import { Link } from 'react-router-dom';
import { FaBook, FaHandsHelping, FaVideo, FaInfoCircle } from 'react-icons/fa';
import './WebHome.css';

const WebHome = () => {
  return (
    <div className="web-home">
      {/* Hero Section */}
      <section className="web-hero">
        <div className="web-hero-content">
          <div className="web-hero-image-wrapper">
            <img 
              src="/assets/banner-slider-2a.jpg" 
              alt="Sri Bagavath Ayya" 
              className="web-hero-image"
            />
          </div>
          <div className="web-hero-quotes">
            <p className="tamil-quote">"ஞானியரை வணங்குவது மட்டும் சிறப்பல்ல! நீங்களே ஞானியாக மலர்வதுதான் சிறப்பு!"</p>
            <p className="english-quote">"It is not just a specialty to worship the wise! It is a specialty if you yourself blossom as a wise person!"</p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="web-mission">
        <div className="web-container">
          <div className="web-section-header">
            <h2>Sri Bagavath Ayya – ஸ்ரீ பகவத் அய்யா</h2>
            <div className="web-divider"></div>
          </div>
          <div className="web-mission-content">
            <p>
              Sri Bagavath Ayya is a spiritual master who has simplified the complex paths of enlightenment into a "Simple Path". His teachings focus on the natural state of being and the effortless realization of truth.
            </p>
            <div className="web-mission-grid">
              <div className="web-mission-card">
                <FaInfoCircle className="card-icon" />
                <h3>The Simple Path</h3>
                <p>Learn the essence of self-realization without complex rituals or strenuous practices.</p>
                <Link to="/web/about" className="web-btn-text">Learn More →</Link>
              </div>
              <div className="web-mission-card">
                <FaVideo className="card-icon" />
                <h3>Events & Camps</h3>
                <p>Join our regular satsangs and meditation camps held across various locations.</p>
                <Link to="/web/events" className="web-btn-text">View Schedule →</Link>
              </div>
              <div className="web-mission-card">
                <FaBook className="card-icon" />
                <h3>Books & Media</h3>
                <p>Explore a vast collection of books and audio/video discourses in Tamil and English.</p>
                <Link to="/web/store" className="web-btn-text">Visit Store →</Link>
              </div>
              <div className="web-mission-card">
                <FaHandsHelping className="card-icon" />
                <h3>Donations</h3>
                <p>Support the mission's activities and help us reach more seekers around the world.</p>
                <Link to="/web/donate" className="web-btn-text">Support Us →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Video / Call to Action */}
      <section className="web-cta">
        <div className="web-container">
          <div className="web-cta-box">
            <h2>Experience the Wisdom</h2>
            <p>Download our official app for daily updates, zoom meetings, and exclusive content.</p>
            <div className="web-cta-btns">
              <a href="#" className="web-btn primary">Download App</a>
              <Link to="/web/store" className="web-btn secondary">Order Books</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WebHome;
