import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaShieldAlt, FaTruck, FaUndo, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import './WebPages.css';

const WebCheckout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { items, totalPrice, isDonation } = location.state || { items: [], totalPrice: 0, isDonation: false };
    const { courierFee } = useGlobalSettings();

    const fee = !isDonation ? (typeof courierFee === 'number' ? courierFee : 60) : 0;
    const grandTotal = totalPrice + fee;

    const [details, setDetails] = useState({
        name: '',
        mobile: '',
        address: '',
        city: '',
        pincode: ''
    });

    const handleInput = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleProceed = () => {
        if (!details.name || !details.mobile || (!isDonation && !details.address)) {
            alert("Please fill in all required details.");
            return;
        }

        const orderSummary = items.map(p => `${p.title} x${p.quantity}`).join(", ");
        const paymentState = {
            itemType: isDonation ? 'DONATION' : 'BOOK',
            itemName: `Order: ${orderSummary.substring(0, 30)}${orderSummary.length > 30 ? '...' : ''}`,
            amount: grandTotal,
            courierFee: fee,
            orderItems: items,
            shippingAddress: details,
            savedState: { items, totalPrice, isDonation }
        };

        // Reuse existing app payment flow for now (will fix redirect later)
        navigate('/payment-flow', {
            state: paymentState
        });
    };

    if (items.length === 0) {
        return (
            <div className="web-empty-state">
                <p>Your cart is empty.</p>
                <button className="web-btn-primary" onClick={() => navigate('/web/store')}>Go to Store</button>
            </div>
        );
    }

    return (
        <div className="web-checkout">
            <section className="web-content-section" style={{ paddingTop: '30px' }}>
                <div className="web-container">
                    <button className="web-back-link" style={{ marginBottom: '30px' }} onClick={() => navigate(isDonation ? '/web/donate' : '/web/store')}>
                        <FaArrowLeft /> Back to {isDonation ? 'Donations' : 'Store'}
                    </button>
                    <div className="web-checkout-layout">
                        {/* Left: Forms */}
                        <div className="checkout-main">
                            <div className="checkout-card">
                                <h3><FaTruck /> {isDonation ? 'Donor Information' : 'Shipping Information'}</h3>
                                <div className="web-form-group">
                                    <label>Full Name *</label>
                                    <input name="name" type="text" value={details.name} onChange={handleInput} placeholder="Enter your full name" />
                                </div>
                                <div className="web-form-group">
                                    <label>Mobile Number *</label>
                                    <input name="mobile" type="tel" value={details.mobile} onChange={handleInput} placeholder="For delivery updates" />
                                </div>
                                {!isDonation && (
                                    <>
                                        <div className="web-form-group">
                                            <label>Delivery Address *</label>
                                            <textarea name="address" value={details.address} onChange={handleInput} placeholder="House no, Street, Area" />
                                        </div>
                                        <div className="web-form-row">
                                            <div className="web-form-group">
                                                <label>City *</label>
                                                <input name="city" type="text" value={details.city} onChange={handleInput} />
                                            </div>
                                            <div className="web-form-group">
                                                <label>Pincode *</label>
                                                <input name="pincode" type="number" value={details.pincode} onChange={handleInput} />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="checkout-card">
                                <h3><FaShieldAlt /> Payment Method</h3>
                                <div className="payment-method-strip">
                                    <FaCheck color="var(--web-nav-bg)" />
                                    <span>UPI / Net Banking / Card</span>
                                    <span className="secure-badge">SECURE</span>
                                </div>
                                <p className="payment-note">You will be redirected to our secure payment gateway to complete the transaction.</p>
                            </div>
                        </div>

                        {/* Right: Summary */}
                        <div className="checkout-sidebar">
                            <div className="summary-card">
                                <h3>Order Summary</h3>
                                <div className="summary-items">
                                    {items.map(item => (
                                        <div key={item.id} className="summary-item">
                                            <span>{item.title} <strong>x {item.quantity}</strong></span>
                                            <span>₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    {fee > 0 && (
                                        <div className="summary-item" style={{ borderTop: '1px dashed #eee', paddingTop: '8px', color: '#666' }}>
                                            <span>Courier Charges</span>
                                            <span>₹{fee}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="summary-total">
                                    <span>Grand Total</span>
                                    <span>₹{grandTotal}</span>
                                </div>
                                <button className="web-btn-primary full" onClick={handleProceed}>
                                    Proceed to Payment
                                </button>
                                
                                <div className="checkout-guarantees">
                                    <div className="guarantee">
                                        <FaShieldAlt /> 128-bit Encryption
                                    </div>
                                    <div className="guarantee">
                                        <FaUndo /> Easy Returns
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WebCheckout;
