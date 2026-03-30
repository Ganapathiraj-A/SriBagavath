import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, CreditCard } from 'lucide-react';

const PaymentStatusOverlay = ({ 
    status, 
    message, 
    errorDetails, 
    onRetry, 
    onClose,
    title,
    successTitle,
    errorTitle
}) => {
    const [displayMessage, setDisplayMessage] = useState(message || "Finalizing your request...");

    useEffect(() => {
        if (status === 'processing' && !message) {
            const messages = [
                "Securing your transaction...",
                "Verifying with Razorpay...",
                "Finalizing your registration...",
                "Almost there..."
            ];
            let i = 0;
            const interval = setInterval(() => {
                i = (i + 1) % messages.length;
                setDisplayMessage(messages[i]);
            }, 2500);
            return () => clearInterval(interval);
        } else if (message) {
            setDisplayMessage(message);
        }
    }, [status, message]);

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const cardVariants = {
        hidden: { scale: 0.8, opacity: 0, y: 20 },
        visible: { 
            scale: 1, 
            opacity: 1, 
            y: 0,
            transition: { type: "spring", damping: 25, stiffness: 300 }
        },
        exit: { scale: 0.8, opacity: 0, y: -20 }
    };

    return (
        <AnimatePresence>
            {status && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={overlayVariants}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                >
                    <motion.div
                        variants={cardVariants}
                        style={{
                            backgroundColor: 'var(--color-card)',
                            borderRadius: '24px',
                            padding: '40px 30px',
                            width: '100%',
                            maxWidth: '400px',
                            textAlign: 'center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '24px'
                        }}
                    >
                        {status === 'processing' && (
                            <>
                                <div style={{ position: 'relative' }}>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '50%',
                                            border: '3px solid var(--color-primary-transparent)',
                                            borderTopColor: 'var(--color-primary)',
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        color: 'var(--color-primary)'
                                    }}>
                                        <ShieldCheck size={32} />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        style={{
                                            position: 'absolute',
                                            top: -5,
                                            left: -5,
                                            right: -5,
                                            bottom: -5,
                                            borderRadius: '50%',
                                            border: '1px solid var(--color-primary)',
                                            opacity: 0.3
                                        }}
                                    />
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{title || "Verifying Payment"}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '15px' }}>{displayMessage}</p>
                                </div>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#10B981'
                                    }}
                                >
                                    <CheckCircle2 size={48} />
                                </motion.div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#10B981' }}>{successTitle || "Payment Successful!"}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Finalizing your registration...</p>
                                </div>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#EF4444'
                                }}>
                                    <AlertCircle size={48} />
                                </div>
                                <div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#EF4444' }}>{errorTitle || "Verification Failed"}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '14px' }}>
                                        {errorDetails || "Something went wrong. Please check your network and try again."}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                                    {onRetry && (
                                        <button 
                                            className="btn-primary" 
                                            onClick={onRetry}
                                            style={{ flex: 1, borderRadius: '12px', height: '48px' }}
                                        >
                                            Try Again
                                        </button>
                                    )}
                                    <button 
                                        className="btn-secondary" 
                                        onClick={onClose}
                                        style={{ flex: 1, borderRadius: '12px', height: '48px' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PaymentStatusOverlay;
