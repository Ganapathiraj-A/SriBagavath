import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ChevronLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { auth } from '@/firebase';
import { TransactionService } from '@/services/TransactionService';
import { AppConfig } from '@/config/AppConfig';
import { useCart } from '@/context/CartContext';

const WebPaymentFlow = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    
    const paymentData = location.state || JSON.parse(localStorage.getItem('last_registration_details') || '{}');
    const {
        amount,
        programName,
        itemType,
        participants,
        primaryApplicant,
        programId
    } = paymentData;

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('READY'); // READY, PROCESSING, SUCCESS, ERROR
    const [error, setError] = useState("");

    useEffect(() => {
        if (!amount && !location.state) {
            navigate('/web/events');
        }
    }, [amount, navigate, location.state]);

    const handleRazorpay = async () => {
        setLoading(true);
        setStatus('PROCESSING');
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions(undefined, 'asia-south1');
            const createOrder = httpsCallable(functions, 'createRazorpayOrder');
            const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');

            const accountType = (itemType === 'BOOK' || itemType === 'DONATION') ? 'CHARITABLE' : 'SBM';
            const rzpKeyId = accountType === 'CHARITABLE' ? AppConfig.razorpayCharitableKeyId : AppConfig.razorpaySbmKeyId;

            const orderRes = await createOrder({ 
                amount: parseFloat(amount),
                receipt: `web_rcpt_${Date.now()}`,
                accountType: accountType
            });
            const order = orderRes.data;

            const options = {
                key: rzpKeyId,
                amount: order.amount.toString(),
                currency: order.currency,
                name: accountType === 'CHARITABLE' ? "Sri Bagavath Mission Charitable Trust" : "Sri Bagavath Mission",
                description: programName || "Sri Bagavath Event",
                order_id: order.id,
                prefill: {
                    name: primaryApplicant?.name || "",
                    email: auth.currentUser?.email || "",
                    contact: primaryApplicant?.mobile || ""
                },
                theme: { color: "#000000" },
                handler: async (response) => {
                    try {
                        const verifyRes = await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            accountType: accountType
                        });

                        if (verifyRes.data.status === 'success') {
                            await TransactionService.recordTransaction({
                                ...paymentData,
                                status: 'REGISTERED',
                                paymentSource: 'razorpay_web',
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id
                            }, null);
                            
                            setStatus('SUCCESS');
                            setTimeout(() => navigate('/web/account?tab=registrations', { replace: true }), 2000);
                        } else {
                            throw new Error("Verification failed");
                        }
                    } catch (err) {
                        setError(err.message);
                        setStatus('ERROR');
                    }
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false);
                        setStatus('READY');
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            setError(err.message);
            setStatus('ERROR');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'SUCCESS') {
        return (
            <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <CheckCircle2 size={80} color="#22c55e" strokeWidth={1.5} />
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '20px' }}>Payment Successful!</h2>
                <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px' }}>Your registration for {programName} is confirmed. Redirecting you to your account...</p>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--color-surface)', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ maxWidth: '400px', width: '100%', backgroundColor: 'var(--color-card)', borderRadius: '2rem', padding: '3rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xl)' }}>
                
                <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '2rem', fontWeight: 600 }}>
                    <ChevronLeft size={18} /> Back
                </button>

                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem' }}>Secure Checkout</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>You are paying for <strong>{programName}</strong></p>

                <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--color-border)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Payable</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#000' }}>₹{amount}</div>
                </div>

                {status === 'ERROR' && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <XCircle size={20} />
                        <span style={{ fontSize: '0.875rem' }}>{error || "Payment failed. Please try again."}</span>
                    </div>
                )}

                <button 
                    onClick={handleRazorpay} 
                    disabled={loading}
                    style={{ width: '100%', padding: '1.25rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '1rem', fontSize: '1.125rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'transform 0.2s' }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                    {loading ? 'Processing...' : 'Pay with Razorpay'}
                </button>

                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
                    Payments are secured by Razorpay. 256-bit SSL encryption.
                </p>
            </div>
        </div>
    );
};

export default WebPaymentFlow;
