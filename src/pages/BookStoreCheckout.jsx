import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';

const BookStoreCheckout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { items, totalPrice, isDonation, isMagazineSubscription } = location.state || { items: [], totalPrice: 0, isDonation: false, isMagazineSubscription: false };
    const { language, t } = useGlobalSettings();

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
                if (window.confirm("Autofill shipping details from your last order?")) {
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
            const msg = requiresAddress 
                ? (language === 'ta' ? "ஷிப்பிங் விவரங்கள் அனைத்தையும் நிரப்பவும்." : "Please fill all shipping details.")
                : (language === 'ta' ? "உங்கள் பெயர் மற்றும் மொபைல் எண்ணை உள்ளிடவும்." : "Please fill your name and mobile.");
            alert(msg);
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
            state: { ...paymentState }
        });
    };

    if (items.length === 0) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>
            {language === 'ta' ? 'பொருட்கள் எதுவும் கிடைக்கவில்லை.' : 'No items found.'}
            <button onClick={() => navigate(isDonation ? '/donations' : '/bookstore')}>
                {language === 'ta' ? 'மீண்டும் செல்லுங்கள்' : 'Go Back'}
            </button>
        </div>;
    }

    return (
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '20px' }}>
            <PageHeader title={isDonation ? t('DONATION_DETAILS') : (isMagazineSubscription ? t('SHIPPING_ADDRESS') : t('SHIPPING_ADDRESS'))} />

            <div style={{ padding: '16px' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0 }}>{t('ORDER_SUMMARY')}</h3>
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
                                {language === 'ta' ? 'கடந்த அமர்வின் விவரங்களை நிரப்பவும்' : 'Use Previous Info'}
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
                        <span>{t('TOTAL')}</span>
                        <span>₹{totalPrice}</span>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '16px' }}>
                    <h3>{isDonation ? t('DONATION_DETAILS') : (isMagazineSubscription ? t('SHIPPING_ADDRESS') : t('SHIPPING_ADDRESS'))}</h3>
                    <div className="form-group">
                        <label>{t('NAME')}</label>
                        <input name="name" type="text" value={details.name} onChange={handleInput} placeholder={isDonation ? (language === 'ta' ? "உங்கள் பெயரை உள்ளிடவும்" : "Enter your name") : (language === 'ta' ? "பெறுநரின் பெயரை உள்ளிடவும்" : "Enter recipient name")} data-testid="checkout-name" />
                    </div>
                    <div className="form-group">
                        <label>{t('PHONE_NUMBER')}</label>
                        <input name="mobile" type="tel" value={details.mobile} onChange={handleInput} placeholder={language === 'ta' ? "தொடர்பு கொள்ள மொபைல் எண்ணை உள்ளிடவும்" : "Enter mobile for contact"} data-testid="checkout-mobile" />
                    </div>
                    {!isDonation && (
                        <>
                            <div className="form-group">
                                <label>{language === 'ta' ? 'முழு முகவரி' : 'Full Address'}</label>
                                <textarea name="address" value={details.address} onChange={handleInput} placeholder={language === 'ta' ? "வீட்டு எண், தெரு, அடையாளச் சின்னம்" : "House No, Street, Landmark"} style={{ width: '100%', minHeight: '80px', padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }} data-testid="checkout-address" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>{t('CITY')}</label>
                                    <input name="city" type="text" value={details.city} onChange={handleInput} data-testid="checkout-city" />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>{language === 'ta' ? 'பின்கோடு' : 'Pincode'}</label>
                                    <input name="pincode" type="number" value={details.pincode} onChange={handleInput} data-testid="checkout-pincode" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '24px', height: '54px', fontSize: '1.125rem' }}
                    onClick={handleProceed}
                    data-testid="checkout-proceed"
                >
                    {language === 'ta' ? 'பணம் செலுத்த தொடரவும்' : 'Proceed to Payment'}
                </button>
            </div>
        </div>
    );
};

export default BookStoreCheckout;
