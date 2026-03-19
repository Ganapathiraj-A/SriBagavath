import React from 'react';
import './WebHome.css';
import './WebPages.css';

const WebAbout = () => {
  return (
    <div className="web-about">
      <section className="web-content-section">
        <div className="web-container">
          <div className="web-about-grid">
            <div className="web-about-image">
              <img 
                src="/assets/bagavath-ayya.png" 
                alt="Sri Bagavath Ayya" 
              />
            </div>
            <div className="web-about-text">
              <h2>The Journey to Truth</h2>
              <p>
                Bagavath Ayya (born 1951) is a spiritual teacher from South India who has dedicated his life to simplifying the understanding of enlightenment and self-realization.
              </p>
              <p>
                After decades of intense spiritual seeking and exploring various paths including Yoga, Vedanta, and Zen, Ayya had a profound realization that transformed his understanding of the human condition. He realized that the "seeker" is the very obstacle to the "sought".
              </p>
              <h3>The Mission</h3>
              <p>
                Sri Bagavath Mission was established to spread this "Simple Path" (Bagavath Pathai) to seekers worldwide. The mission conducts regular camps, satsangs, and publishes books and media to help individuals realize their natural state of being.
              </p>
              <p>
                Ayya's teachings are non-sectarian and focus on the practical application of wisdom in daily life, leading to mental wellness and inner peace.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WebAbout;
