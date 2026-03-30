import React from 'react';
import { FaPhone, FaMapMarkerAlt, FaGlobe, FaEnvelope } from 'react-icons/fa';
import './WebHome.css';
import './WebPages.css';

const WebContact = () => {
  const contactItems = [
    {
      icon: <FaPhone />,
      title: 'Phone Support',
      content: '+91 97891 65555 / +91 99942 05880',
      description: 'Support available from 9:00 AM to 9:00 PM IST.'
    },
    {
      icon: <FaEnvelope />,
      title: 'Email Address',
      content: 'info@sribagavath.org',
      description: 'Send us your queries anytime.'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Location (Bhavan)',
      content: 'Sri Bagavath Bhavan, Salem, Tamil Nadu',
      description: 'Kodambakkadu, Periyakoundapuram, Karippatti, Salem - 636106.'
    },
    {
      icon: <FaGlobe />,
      title: 'Official Website',
      content: 'www.sribagavath.org',
      description: 'Our primary web portal.'
    }
  ];

  return (
    <div className="web-contact">


      <section className="web-content-section">
        <div className="web-container">
          <div className="web-contact-main">
            <div className="web-contact-info">
              <h2>Get in Touch</h2>
              <p>We are here to support you on your simple path to enlightenment. Feel free to reach out to us through any of the following channels.</p>
              
              <div className="web-contact-grid">
                {contactItems.map((item, index) => (
                  <div key={index} className="web-contact-card">
                    <div className="card-icon">{item.icon}</div>
                    <div className="card-body">
                      <h3>{item.title}</h3>
                      <p className="card-content">{item.content}</p>
                      <p className="card-desc">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="web-contact-map">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62523.30615352019!2d78.17904056808347!3d11.644241571791152!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babed73efadff25%3A0x4d247730455be4ba!2sSri%20Bagavath%20Bhavan!5e0!3m2!1sen!2sin!4v1774526434162!5m2!1sen!2sin" 
                width="100%" 
                height="450" 
                style={{ border: 0, borderRadius: '12px', boxShadow: 'var(--shadow-lg)' }} 
                allowFullScreen="" 
                loading="lazy"
                title="Google Maps Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WebContact;
