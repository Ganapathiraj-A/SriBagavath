import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import '../components/RegistrationStyles.css';

const BookStoreCheckout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { items, totalPrice, isDonation, isMagazineSubscription } = location.state || { items: [], totalPrice: 0, isDonation: false, isMagazineSubscription: false };

    const [details, setDetails] = useState({
        name: '',
        mobile: '',
        address: '',
        city: '',
        pincode: ''
    });

    const hasPreviousInfo = !!localStorage.getItem('last_book_shipping_details');

    const handleUsePrevious = () => {
        try {
            const saved = localStorage.getItem('last_book_shipping_details');
            if (saved) {
                const data = JSON.parse(saved);
                if (confirm("Autofill shipping details from your last order?")) {
                    setDetails(data);
                }
            }
        } catch (e) {
            console.error("Failed to load previous info", e);
        }
    };

    const handleInput = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleProceed = () => {
        const requiresAddress = !isDonation; // Both Books and Magazine Subscriptions require address
        if (!details.name || !details.mobile || (requiresAddress && (!details.address || !details.city || !details.pincode))) {
            alert(requiresAddress ? "Please fill all shipping details." : "Please fill your name and mobile.");
            return;
        }

        // Save for "Use Previous Info"
        try {
            localStorage.setItem('last_book_shipping_details', JSON.stringify(details));
        } catch (e) {
            console.error("Failed to save shipping details", e);
        }

        const orderSummary = items.map(p => `${p.title} x${p.quantity}`).join(", ");
        let itemType = 'BOOK';
        if (isDonation) itemType = 'DONATION';
        if (isMagazineSubscription) itemType = 'MAGAZINE_SUBSCRIPTION';

        const paymentState = {
            itemType: itemType,
            itemName: `Order: ${orderSummary.substring(0, 30)}${orderSummary.length > 30 ? '...' : ''}`,
            amount: totalPrice,
            orderItems: items,
            shippingAddress: details,
            savedState: { items, totalPrice, isDonation, isMagazineSubscription }
        };

        // Save for recovery if app reloads during payment
        try {
            localStorage.setItem('last_registration_details', JSON.stringify(paymentState));
        } catch (e) {
            console.error("Failed to save order details", e);
        }

        navigate('/payment-flow', {
            replace: true, // Replace history so Back goes to Store/Donations
            state: paymentState
        });
    };

    if (items.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>No items found. <button onClick={() => navigate(isDonation ? '/donations' : '/bookstore')}>Go Back</button></div>;
    }

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title={isDonation ? "Donation Details" : (isMagazineSubscription ? "Subscription Details" : "Shipping Details")} />

            <div style={{ padding: '16px' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>Order Summary</h3>
                        {hasPreviousInfo && (
                            <button
                                onClick={handleUsePrevious}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 10px',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#0369a1'
                                }}
                            >
                                <RotateCcw size={14} />
                                Use Previous Info
                            </button>
                        )}
                    </div>
                    {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                            <span>{item.title} x {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                        </div>
                    ))}
                    <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '12px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.125rem' }}>
                        <span>Total Amount</span>
                        <span>₹{totalPrice}</span>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '16px' }}>
                    <h3>{isDonation ? 'Donor Details' : (isMagazineSubscription ? 'Subscription Details & Address' : 'Delivery Address')}</h3>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" type="text" value={details.name} onChange={handleInput} placeholder={isDonation ? "Enter your name" : "Enter recipient name"} />
                    </div>
                    <div className="form-group">
                        <label>Mobile Number</label>
                        <input name="mobile" type="tel" value={details.mobile} onChange={handleInput} placeholder="Enter mobile for contact" />
                    </div>
                    {!isDonation && (
                        <>
                            <div className="form-group">
                                <label>Full Address</label>
                                <textarea name="address" value={details.address} onChange={handleInput} placeholder="House No, Street, Landmark" style={{ width: '100%', minHeight: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>City</label>
                                    <input name="city" type="text" value={details.city} onChange={handleInput} />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Pincode</label>
                                    <input name="pincode" type="number" value={details.pincode} onChange={handleInput} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '24px', height: '54px', fontSize: '1.125rem' }}
                    onClick={handleProceed}
                >
                    Proceed to Payment
                </button>
            </div>
        </div>
    );
};

export default BookStoreCheckout;
