import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaHandsHelping, FaUsers, FaArrowRight } from 'react-icons/fa';
import './WebPages.css';

const donationOptions = [
  { id: 'don_1', title: 'Single Donation', price: 1000, category: 'General', icon: <FaHeart />, description: 'One-time contribution to support our mission.' },
  { id: 'don_2', title: 'Sustaining Support', price: 5000, category: 'General', icon: <FaHandsHelping />, description: 'Help us maintain our spiritual centers.' },
  { id: 'don_custom', title: 'Custom Amount', price: 0, category: 'General', isCustom: true, icon: <FaHeart />, description: 'Contribute any amount of your choice.' },
  { id: 'ann_1', title: 'Annadhanam Support', price: 2000, category: 'Annadhanam', icon: <FaHandsHelping />, description: 'Support the daily food distribution service.' },
  { id: 'ann_custom', title: 'Custom Annadhanam', price: 0, category: 'Annadhanam', isCustom: true, icon: <FaHandsHelping />, description: 'Contribute any amount for food service.' },
  { id: 'mem_annual', title: 'Annual Member', price: 10000, category: 'Membership', icon: <FaUsers />, description: 'Join us as an active annual member.' },
  { id: 'mem_founder', title: 'Founder Member', price: 25000, category: 'Membership', icon: <FaUsers />, description: 'Become a permanent founder member.' }
];

const WebDonations = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('General');
  const [selectedId, setSelectedId] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const tabs = ['General', 'Annadhanam', 'Membership'];

  const handleProceed = (option) => {
    const amount = option.isCustom ? parseInt(customAmount) : option.price;
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    navigate('/web/checkout', {
      state: {
        items: [{ ...option, title: option.title, price: amount, quantity: 1 }],
        totalPrice: amount,
        isDonation: true
      }
    });
  };

  return (
    <div className="web-donations">


      <section className="web-content-section">
        <div className="web-container">
          {/* Tabs */}
          <div className="web-tabs-container center">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`web-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => {
                   setActiveTab(tab);
                   setSelectedId(null);
                   setCustomAmount('');
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="web-donation-grid">
            {donationOptions.filter(o => o.category === activeTab).map(option => (
              <motion.div
                key={option.id}
                className={`web-donation-card ${selectedId === option.id ? 'active' : ''}`}
                onClick={() => setSelectedId(option.id)}
                layout
              >
                <div className="card-header">
                   <div className="card-icon">{option.icon}</div>
                   <h3>{option.title}</h3>
                </div>
                <p className="card-description">{option.description}</p>
                {!option.isCustom && <p className="card-amount">₹{option.price}</p>}
                
                <AnimatePresence>
                  {selectedId === option.id && (
                    <motion.div 
                      className="card-expanded"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      {option.isCustom && (
                        <div className="custom-amount-input">
                           <span>₹</span>
                           <input 
                             type="number" 
                             placeholder="Enter Amount" 
                             value={customAmount}
                             onChange={(e) => setCustomAmount(e.target.value)}
                             autoFocus
                           />
                        </div>
                      )}
                      <button className="web-btn-primary full" onClick={() => handleProceed(option)}>
                        Proceed to Payment <FaArrowRight />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="web-donation-footer">
            <p>Transactions are secure and handled via UPI/Netbanking. You will receive a receipt upon successful completion.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WebDonations;
