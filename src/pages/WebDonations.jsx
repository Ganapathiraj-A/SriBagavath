import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import './WebPages.css';

const donationOptions = [
  { id: 'don_1', title: 'Donation - ₹1,000', price: 1000, category: 'General' },
  { id: 'don_2', title: 'Donation - ₹2,000', price: 2000, category: 'General' },
  { id: 'don_3', title: 'Donation - ₹5,000', price: 5000, category: 'General' },
  { id: 'don_custom', title: 'Custom Donation', price: 0, category: 'General', isCustom: true },
  
  { id: 'ann_1', title: 'Annadhanam - ₹1,000', price: 1000, category: 'Annadhanam' },
  { id: 'ann_2', title: 'Annadhanam - ₹2,000', price: 2000, category: 'Annadhanam' },
  { id: 'ann_3', title: 'Annadhanam - ₹5,000', price: 5000, category: 'Annadhanam' },
  { id: 'ann_custom', title: 'Custom Annadhanam', price: 0, category: 'Annadhanam', isCustom: true },
  
  { id: 'mem_monthly', title: 'Monthly Donation', price: 0, category: 'Membership', isMonthly: true },
  { id: 'mem_annual', title: 'Annual Member', price: 10000, category: 'Membership' },
  { id: 'mem_founder', title: 'Founder Member', price: 25000, category: 'Membership' }
];

const WebDonations = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('General');
  const [selectedId, setSelectedId] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('1000');

  const tabs = ['General', 'Annadhanam', 'Membership'];

  const handleProceed = (option) => {
    const amount = option.isCustom ? parseInt(customAmount) : (option.isMonthly ? parseInt(monthlyAmount) : option.price);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    navigate('/web/checkout', {
      state: {
        items: [{ ...option, title: option.isMonthly ? `Monthly Donation - ₹${amount}` : option.title, price: amount, quantity: 1 }],
        totalPrice: amount,
        isDonation: true
      }
    });
  };

  return (
    <div className="web-donations-container">
      <div className="web-container">
        
        <div className="web-donation-header">
           <div className="header-left">
              <div className="donation-heart-icon"><FaHeart /></div>
              <div>
                <h2>Support Our Mission</h2>
                <p>Your contributions help us reach more people and spread spiritual awareness.</p>
              </div>
           </div>
           <button className="my-donations-btn" onClick={() => navigate('/web/account/donations')}>
              <FaHeart /> My Donations
           </button>
        </div>

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

        <div className="web-donation-list">
          {donationOptions.filter(o => o.category === activeTab).map(option => (
            <motion.div
              key={option.id}
              className={`web-donation-item-card ${selectedId === option.id ? 'active' : ''}`}
              onClick={() => setSelectedId(option.id)}
              layout
            >
              <div className="donation-item-main">
                <div className="donation-item-info">
                  <h3>{option.title}</h3>
                  
                  <AnimatePresence>
                    {selectedId === option.id && (
                      <motion.div 
                        className="donation-item-expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        {option.isCustom && (
                          <div className="donation-input-wrapper">
                             <input 
                               type="number" 
                               placeholder="Enter amount" 
                               value={customAmount}
                               onChange={(e) => setCustomAmount(e.target.value)}
                               onClick={(e) => e.stopPropagation()}
                               autoFocus
                             />
                          </div>
                        )}
                        {option.isMonthly && (
                          <div className="donation-input-wrapper">
                            <select 
                              value={monthlyAmount}
                              onChange={(e) => setMonthlyAmount(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {[1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map(amt => (
                                <option key={amt} value={amt}>₹{amt.toLocaleString()}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="donation-item-price">
                  {option.isMonthly ? (
                    <span>₹{parseInt(monthlyAmount).toLocaleString()}+</span>
                  ) : (
                    !option.isCustom && <span>₹{option.price.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              {selectedId === option.id && (
                <div className="donation-item-actions">
                  <button className="web-btn-primary" onClick={(e) => { e.stopPropagation(); handleProceed(option); }}>
                    Proceed to Donate
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="web-donation-footer">
          <p>Transactions are secure and handled via UPI. You will receive a receipt upon successful completion.</p>
        </div>
      </div>
    </div>
  );
};

export default WebDonations;
