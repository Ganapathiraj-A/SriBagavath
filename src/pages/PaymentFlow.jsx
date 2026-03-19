import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Trash2, CheckCircle2, Camera as CameraIcon, PlayCircle, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Clipboard } from '@capacitor/clipboard';

import { TransactionService } from '@/services/TransactionService';
import OCR from '@/plugins/OCRPlugin';
import { GPayUtils } from '@/utils/GPayUtils';
import qrImage from '@/assets/qr_code.jpg';
import instructionGif from '@/assets/payment_instruction.gif';
import '../components/RegistrationStyles.css';
import { useCart } from '@/context/CartContext';
import { normalizeImageSrc } from '@/utils/imageUtils';

// Type Steps matching SBB App
// SELECTION is skipped as we come from Registration
const PaymentFlow = () => {
    // const { appVersion } = useGlobalSettings(); // Removed unused
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    // Initial State Fallback: Restore from localStorage if location.state is lost
    // (survives app reloads during activity transitions)
    const storedData = JSON.parse(localStorage.getItem('last_registration_details') || '{}');
    const {
        amount: stateAmount,
        programName: stateProgramName,
        itemName: stateItemName,
        participants: stateParticipants,
        primaryApplicant: statePrimaryApplicant,
        place: statePlace,
        participantCount: stateParticipantCount,
        selectedOptions: stateOptions,
        programId: stateProgramId,
        programDate: stateProgramDate,
        programCity: stateProgramCity,
        itemType: stateItemType
    } = location.state || {};

    const amount = stateAmount || storedData.amount;
    const programName = stateProgramName || storedData.programName;
    const itemName = stateItemName || storedData.itemName;
    const participants = stateParticipants || storedData.participants;
    const primaryApplicant = statePrimaryApplicant || storedData.primaryApplicant;
    const place = statePlace || storedData.place;
    const participantCount = stateParticipantCount || storedData.participantCount;
    const selectedOptions = stateOptions || storedData.selectedOptions;
    const programId = stateProgramId || storedData.programId;
    const programDate = stateProgramDate || storedData.programDate;
    const programCity = stateProgramCity || storedData.programCity;
    const itemType = stateItemType || storedData.itemType;

    const [currentStep, setCurrentStep] = useState('QR_VIEW');

    // Submission State
    const [image, setImage] = useState(null);
    const [rawText, setRawText] = useState("");
    const [parsedAmount, setParsedAmount] = useState(null);
    const [utr, setUtr] = useState(null);
    const [ocrStatus, setOcrStatus] = useState("");
    const [submissionAmount, setSubmissionAmount] = useState(amount?.toString() || "");
    const [submissionName, setSubmissionName] = useState(programName || itemName || "");
    const [loading, setLoading] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const [showFullOcr, setShowFullOcr] = useState(false);

    // Date Helper to handle Firestore Timestamps or Strings safely
    const formatProgramDate = (dateVal) => {
        if (!dateVal) return '';
        try {
            // Check if it's a Firestore Timestamp {seconds, nanoseconds}
            if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
                return new Date(dateVal.seconds * 1000).toLocaleDateString();
            }
            return new Date(dateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return '';
        }
    };

    useEffect(() => {
        if (!amount && !location.state) {
            // Fallback if accessed directly
            navigate('/programs');
        } else {
            // Track screen view
            import('../utils/Analytics').then(m => {
                m.default.trackScreenView('Payment Flow');
            });
        }
    }, [amount, navigate, location.state]);

    useEffect(() => {
        if (!submissionAmount && amount) setSubmissionAmount(amount.toString());
        if (!submissionName && (programName || itemName)) setSubmissionName(programName || itemName);
    }, [amount, programName, itemName, submissionAmount, submissionName]);

    // Methods
    const processOCR = async (base64) => {
        setOcrStatus("Processing...");
        try {
            const result = await OCR.detectText({ base64Image: base64 });
            setRawText(result.rawText || "");
            if (result.transactionId) setUtr(result.transactionId);
            setOcrStatus(result.transactionId ? `Ref: ${result.transactionId} ` : "No Ref Found");

            if (result.amount) {
                setParsedAmount(result.amount);
            }
        } catch (_err) {
            setOcrStatus("Error: " + _err.message);
        }
    };

    // Shared Image Check
    useEffect(() => {
        let pollCount = 0;
        let pollInterval = null;

        const checkForSharedImage = async () => {
            try {
                // Diagnostic: Check if OCR is even defined
                if (!OCR) {
                    return;
                }

                // res validation
                const res = await OCR.checkSharedImage();
                if (res && res.base64) {
                    if (pollInterval) clearInterval(pollInterval);

                    // Priority: Move to submission screen immediately
                    setCurrentStep('SUBMISSION');
                    setImage(res.base64);
                    processOCR(res.base64);
                }
            } catch (_err) {
                console.error("Shared Image Check Failed", _err);
            }
        };

        // Initial check with slight delay to allow Android intent to settle
        setTimeout(checkForSharedImage, 500);

        // Polling fallback (Check every 1s for 5s)
        pollInterval = setInterval(() => {
            pollCount++;
            checkForSharedImage();
            if (pollCount >= 10) clearInterval(pollInterval);
        }, 1000);

        // Listen for resume
        const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                pollCount = 0;
                checkForSharedImage();
            }
        });

        return () => {
            if (pollInterval) clearInterval(pollInterval);
            if (Capacitor.isNativePlatform()) {
                listener.then(handle => handle.remove());
            }
        };
    }, []);

    const captureImage = async () => {
        try {
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });
            setImage(photo.base64String || null);
            if (photo.base64String) processOCR(photo.base64String);
        } catch (_err) {
            console.error("Camera Error", _err);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await TransactionService.recordTransaction({
                itemName: submissionName,
                itemType: itemType || 'PROGRAM',
                amount: parseFloat(submissionAmount) || 0,
                ocrText: rawText,
                utr: utr,
                parsedAmount: parsedAmount,
                // Bookstore specific
                orderItems: location.state?.orderItems || storedData.orderItems || [],
                shippingAddress: location.state?.shippingAddress || storedData.shippingAddress || null,
                // Additional Sri Bagavath Fields
                participants: participants || [],
                primaryApplicant: primaryApplicant || {},
                place: place || "",
                participantCount: participantCount || (participants ? participants.length : 0),
                programId: programId || "",
                programDate: programDate || "",
                programCity: programCity || "",
                selectedOptions: selectedOptions || []
            }, image);

            // Track Success
            import('../utils/Analytics').then(m => {
                const category = location.state?.itemType === 'BOOK' ? 'book_order' : 'registration';
                m.default.trackPaymentSuccess(parseFloat(submissionAmount), location.state?.programId || category);
            });

            let targetPage = '/my-registrations';
            if (location.state?.itemType === 'BOOK') {
                clearCart();
                targetPage = '/my-orders';
            }
            if (location.state?.itemType === 'MAGAZINE_SUBSCRIPTION') {
                clearCart();
                targetPage = '/monthly-magazine?tab=subscriptions';
            }
            if (location.state?.itemType === 'DONATION') targetPage = '/my-donations';

            navigate(targetPage, { replace: true });
        } catch (_err) {
            alert("Submission Failed: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    // -- Views (Ported from SBB PaymentScreen.tsx) --

    const [showDemo, setShowDemo] = useState(false);

    const renderQrView = () => (
        <div className="center-content">
            <h2 style={{ textAlign: 'center' }}>Click Image to Copy UPI ID</h2>
            <div
                className="qr-container"
                onClick={async () => {
                    try {
                        await Clipboard.write({
                            string: "sribagavathmission.63022941@hdfcbank"
                        });
                    } catch (e) {
                        console.warn("Clipboard write failed", e);
                    }
                    GPayUtils.saveQRCode(qrImage);

                    // Track UPI Copy
                    import('../utils/Analytics').then(m => {
                        m.default.logEvent('qr_upi_copy');
                    });

                    setCurrentStep('INSTRUCTIONS');
                }}
            >
                <img src={qrImage} alt="QR Code" onError={(e) => {
                    // Fallback
                    e.currentTarget.style.display = 'none';
                }} />
            </div>
            <p className="hint-text" style={{ textAlign: 'center' }}>
                Tap the QR code to save UPI ID to clipboard and proceed
            </p>
            <button className="btn-secondary full-width" style={{ marginTop: '20px' }} onClick={() => {
                if (location.state?.itemType === 'BOOK') {
                    navigate('/bookstore-checkout', { replace: true, state: location.state?.savedState });
                } else {
                    navigate('/event-registration', {
                        replace: true,
                        state: {
                            program: location.state?.program,
                            savedState: location.state?.savedState
                        }
                    });
                }
            }}>Back to Details</button>
        </div>
    );

    const renderInstructions = () => (
        <div className="instructions-container" style={{ paddingBottom: '80px', textAlign: 'center' }}>
            <h2 style={{ textAlign: 'center' }}>Payment Instructions</h2>

            <button
                className="btn-secondary full-width"
                style={{
                    marginBottom: '16px',
                    backgroundColor: 'var(--color-primary-transparent)',
                    border: '1px solid var(--color-primary-transparent)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    height: '48px'
                }}
                onClick={() => setShowDemo(!showDemo)}
            >
                {showDemo ? (
                    <>
                        <EyeOff size={20} />
                        Hide Demo
                        <ChevronUp size={20} />
                    </>
                ) : (
                    <>
                        <PlayCircle size={20} />
                        Click here to view demo
                        <ChevronDown size={20} />
                    </>
                )}
            </button>

            {showDemo && (
                <div style={{
                    width: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <img
                        src={instructionGif}
                        alt="Payment Instructions"
                        style={{ width: '100%', display: 'block' }}
                    />
                </div>
            )}

            <div className="steps-list">
                <p><strong>1.</strong> UPI ID <b>already copied</b> to clipboard.</p>
                <p><strong>2.</strong> Once inside GPay, select &apos;<b>Pay anyone</b>&apos; and <b>Paste</b> the ID.</p>
                <p><strong>3.</strong> Pay the amount: <b>₹{amount}</b></p>
                <p><strong>4.</strong> After payment, click <b>Share Screenshot</b> &rarr; <b>More</b> &rarr; <b>SriBagavath</b>.</p>
            </div>
            <button className="btn-primary full-width" style={{ marginTop: '16px' }} onClick={() => {
                GPayUtils.openGPay();
                // Track GPay Initiation
                import('../utils/Analytics').then(m => {
                    m.default.trackPaymentInitiated('GPay', amount);
                });
            }}>
                GPay: Paste UPI ID + Pay &rarr; Share Screenshot
            </button>

            {/* Manual Upload Button in case Share fails */}
            <button data-testid="payment-proceed-manual" className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={() => setCurrentStep('SUBMISSION')}>
                I have paid & have screenshot
            </button>

            <button className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={() => setCurrentStep('QR_VIEW')}>
                Back
            </button>
        </div>
    );

    const renderSubmission = () => (
        <div className="submission-container">
            <h2>Complete Registration</h2>

            {/* Transaction Summary Section */}
            <div style={{
                background: 'var(--color-surface)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid var(--color-border)'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>
                    {submissionName}
                    {itemType !== 'BOOK' && (programDate || programCity) && (
                        <div style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {formatProgramDate(programDate)}
                            {programCity ? ` • ${programCity} ` : ''}
                        </div>
                    )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    {itemType === 'BOOK' ? (
                        <>
                            {(location.state?.orderItems || storedData.orderItems || [])?.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>{item?.title || 'Book'} x {item?.quantity || 1}</span>
                                    <span style={{ fontWeight: 600 }}>₹{(item?.price || 0) * (item?.quantity || 1)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '8px', padding: '8px', background: 'var(--color-card)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Shipping to</span>
                                <span style={{ fontWeight: 600, textAlign: 'right' }}>{(location.state?.shippingAddress || storedData.shippingAddress)?.name || 'Guest'}<br />{(location.state?.shippingAddress || storedData.shippingAddress)?.city || ''}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Participants</span>
                                <span style={{ fontWeight: 600 }}>{participantCount || (participants?.length) || 1}</span>
                            </div>
                            {participants && participants.length > 0 && (
                                <div style={{ paddingLeft: '8px', borderLeft: '2px solid var(--color-border)', margin: '4px 0' }}>
                                    {participants.map((p, i) => (
                                        <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                                            {i + 1}. {p?.name || 'Unknown'} ({p?.gender || ''}, {p?.age || ''})
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Primary Contact</span>
                                <span style={{ fontWeight: 600 }}>{primaryApplicant?.name || 'Applicant'}</span>
                            </div>
                            {place && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Coming From</span>
                                    <span style={{ fontWeight: 600 }}>{place}</span>
                                </div>
                            )}
                            {selectedOptions && selectedOptions.length > 0 && (
                                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--color-border)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '4px' }}>Additional Options</div>
                                    {selectedOptions.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                            <span>{opt?.name}</span>
                                            <span>₹{opt?.fee}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                        <span style={{ fontWeight: 600 }}>Total Amount</span>
                        <span style={{ fontWeight: 800, color: 'var(--color-text)' }}>₹{amount || 0}</span>
                    </div>
                </div>
            </div>

            <div className="screenshot-section" style={{ marginTop: '0px' }}>
                {image ? (
                    <div className="preview-container" style={{ alignItems: 'center', background: 'var(--color-success-transparent)', border: '1px solid var(--color-success)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={28} color="#22c55e" weight="fill" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Attached Screenshot</span>
                                <button
                                    onClick={() => setViewingImage(image)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: 'var(--color-primary)',
                                        fontSize: '13px',
                                        padding: 0,
                                        textAlign: 'left',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    View Screenshot
                                </button>
                            </div>
                        </div>
                        <button className="btn-icon" onClick={() => setImage(null)} style={{ background: 'var(--color-error-transparent)', color: 'var(--color-error)' }}><Trash2 size={20} /></button>
                    </div>
                ) : (
                    <div data-testid="screenshot-placeholder" className="placeholder-img" onClick={captureImage} style={{ height: '100px', border: '2px dashed var(--color-border)' }}>
                        <CameraIcon size={40} color="var(--color-text-muted)" />
                        <span style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '14px' }}>Tap to Scan/Upload Screenshot</span>
                    </div>
                )}
                <input
                    data-testid="screenshot-input"
                    type="file"
                    accept="image/*"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                    onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64 = reader.result;
                                setImage(base64);
                                processOCR(base64);
                            };
                            reader.readAsDataURL(file);
                        }
                    }}
                />
            </div>

            {
                (rawText || ocrStatus) && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                {ocrStatus}
                                {utr && <div style={{ fontSize: '12px', color: 'var(--color-primary)' }}>UTR: {utr}</div>}
                            </div>
                            <button
                                onClick={() => setShowFullOcr(!showFullOcr)}
                                style={{ border: 'none', background: 'none', color: 'var(--color-text-muted)', fontSize: '12px', textDecoration: 'underline' }}
                            >
                                {showFullOcr ? "Hide Scanned Data" : "View Scanned Data"}
                            </button>
                        </div>
                        {showFullOcr && (
                            <div className="debug-box" style={{ marginTop: '8px', background: 'var(--color-surface)' }}>
                                <strong>Scanned Data (Full):</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', fontSize: '11px', marginTop: '4px' }}>{rawText || "No Text Detected"}</pre>
                            </div>
                        )}
                    </div>
                )
            }

            <button
                data-testid="payment-submit-button"
                className="btn-primary full-width"
                onClick={handleSubmit}
                disabled={!image || loading}
                style={{ marginTop: '24px', height: '50px', fontSize: '16px', fontWeight: 700 }}
            >
                {loading ? "Registering..." : "Register Transaction"}
            </button>
            <button className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={() => setCurrentStep('INSTRUCTIONS')}>
                Back
            </button>

            {/* Screenshot Modal */}
            {
                viewingImage && (
                    <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 2000 }}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '15px',
                            background: 'var(--color-card)',
                            padding: '15px',
                            borderRadius: '16px',
                            maxWidth: '90%'
                        }}>
                            <img
                                src={normalizeImageSrc(viewingImage)}
                                alt="Receipt"
                                style={{ width: '100%', borderRadius: '8px', maxHeight: '75vh', objectFit: 'contain' }}
                            />
                            <button
                                className="btn-primary"
                                onClick={() => setViewingImage(null)}
                                style={{ width: '100%', background: 'var(--color-primary)', borderRadius: '8px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );

    return (
        <div className="payment-container">
            <header className="header" style={{ textAlign: 'center' }}>
                <h1 style={{ width: '100%', textAlign: 'center' }}>Payment & Registration</h1>
            </header>

            <div className="content-area">
                {currentStep === 'QR_VIEW' && renderQrView()}
                {currentStep === 'INSTRUCTIONS' && renderInstructions()}
                {currentStep === 'SUBMISSION' && renderSubmission()}
            </div>
        </div>
    );
};

export default PaymentFlow;
