import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { Trash2, CheckCircle2, QrCode as QrIcon, Camera as CameraIcon } from 'lucide-react';
import { Clipboard } from '@capacitor/clipboard';

import { TransactionService } from '../services/TransactionService';
import OCR from '../plugins/OCRPlugin';
import { GPayUtils } from '../utils/GPayUtils';
import qrImage from '../assets/qr_code.jpg';
import instructionGif from '../assets/payment_instruction.gif';
import '../components/RegistrationStyles.css';

// Type Steps matching SBB App
// SELECTION is skipped as we come from Registration
const PaymentFlow = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Initial State from Registration
    // SBB had "Selection" step. We start with data already.
    const { amount, programName, participants, primaryApplicant, place, participantCount } = location.state || {};

    const [currentStep, setCurrentStep] = useState('QR_VIEW'); // default to QR View

    // Submission State
    const [image, setImage] = useState(null);
    const [rawText, setRawText] = useState("");
    const [parsedAmount, setParsedAmount] = useState(null);
    const [ocrStatus, setOcrStatus] = useState("");
    const [submissionAmount, setSubmissionAmount] = useState(amount?.toString() || "");
    const [submissionName, setSubmissionName] = useState(programName || "");
    const [loading, setLoading] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const [showFullOcr, setShowFullOcr] = useState(false);

    useEffect(() => {
        if (!amount && !location.state) {
            // Fallback if accessed directly
            navigate('/programs');
        }
    }, [amount, navigate, location.state]);

    // Methods
    const processOCR = async (base64) => {
        setOcrStatus("Processing...");
        try {
            const result = await OCR.detectText({ base64Image: base64 });
            setRawText(result.rawText || "");
            setOcrStatus(result.transactionId ? `Ref: ${result.transactionId}` : "No Ref Found");

            if (result.amount) {
                // If we detected an amount, maybe update? 
                // In SBB code: setSubmissionAmount(result.amount);
                // But here we have a fixed registration amount. 
                // Let's keep the user entered/calculated amount but show what we found?
                // SBB Logic was for paying odd amounts. Here we have calculated fees.
                // FIX: Do NOT overwrite user's calculated amount with OCR amount.
                // Just store it as parsedAmount for Admin verification.
                // setSubmissionAmount(result.amount);
                setParsedAmount(result.amount);
            }
        } catch (e) {
            setOcrStatus("Error: " + e.message);
        }
    };

    // Shared Image Check
    useEffect(() => {
        const checkForSharedImage = async () => {
            try {
                const res = await OCR.checkSharedImage();
                if (res && res.base64) {
                    setImage(res.base64);
                    processOCR(res.base64);

                    // Auto-advance to submission if we were waiting
                    setCurrentStep('SUBMISSION');
                    alert("Screenshot Received!");
                }
            } catch (e) {
                console.error("Shared Image Check Failed", e);
            }
        };

        checkForSharedImage();

        // Listen for resume
        const listener = App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) checkForSharedImage();
        });

        // Also listen for our custom event from Proxy Activity if strictly needed,
        // but checking on resume + mount covers most cases. 
        // SBB App: Used checkSharedImage on mount and resume.

        return () => {
            listener.then(handle => handle.remove());
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
        } catch (error) {
            console.error("Camera Error", error);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await TransactionService.recordTransaction({
                itemName: submissionName,
                amount: parseFloat(submissionAmount),
                ocrText: rawText,
                parsedAmount: parsedAmount,
                // Additional Sri Bagavath Fields
                participants: participants || [],
                primaryApplicant: primaryApplicant || {},
                place: place || "",
                participantCount: participantCount || 1,
                programId: location.state?.programId || "",
                programDate: location.state?.programDate || "",
                programCity: location.state?.programCity || ""
            }, image);

            alert("Transaction Submitted Successfully!\n\nPlease check status at My Registration.");
            navigate('/my-registrations', { replace: true });
        } catch (e) {
            alert("Submission Failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // -- Views (Ported from SBB PaymentScreen.tsx) --

    const renderQrView = () => (
        <div className="center-content">
            <h2>Click Image to Pay</h2>
            <div
                className="qr-container"
                onClick={async () => {
                    await Clipboard.write({
                        string: "sribagavathmission.63022941@hdfcbank"
                    });
                    GPayUtils.saveQRCode(qrImage);
                    setCurrentStep('INSTRUCTIONS');
                }}
            >
                <img src={qrImage} alt="QR Code" onError={(e) => {
                    // Fallback
                    e.currentTarget.style.display = 'none';
                }} />
            </div>
            <p className="hint-text">(Tap the QR code to save it and proceed)</p>
            <button className="btn-secondary full-width" onClick={() => navigate('/event-registration', {
                replace: true,
                state: {
                    program: location.state?.program,
                    savedState: location.state?.savedState
                }
            })}>Back to Details</button>
        </div>
    );

    const renderInstructions = () => (
        <div className="instructions-container" style={{ paddingBottom: '80px' }}>
            <h2>Payment Instructions</h2>

            <div style={{
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '16px',
                border: '1px solid #ddd',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <img
                    src={instructionGif}
                    alt="Payment Instructions"
                    style={{ width: '100%', display: 'block' }}
                />
            </div>

            <div className="steps-list">
                <p><strong>1.</strong> UPI ID <b>already copied</b> to clipboard.</p>
                <p><strong>2.</strong> Once inside GPay, select '<b>Pay anyone</b>' and <b>Paste</b> the ID.</p>
                <p><strong>3.</strong> Pay the amount: <b>₹{amount}</b></p>
                <p><strong>4.</strong> After payment, click <b>Share Screenshot</b> &rarr; <b>More</b> &rarr; <b>SriBagavath</b>.</p>
            </div>
            <button className="btn-primary full-width" onClick={() => GPayUtils.openGPay()}>
                GPay: Paste UPI ID + Pay &rarr; Share Screenshot
            </button>

            {/* Manual Upload Button in case Share fails */}
            <button className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={() => setCurrentStep('SUBMISSION')}>
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

            {/* Registration Summary Section */}
            <div style={{
                background: '#f3f4f6',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #e5e7eb'
            }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#111' }}>
                    {programName}
                    {(location.state?.programDate || location.state?.programCity) && (
                        <div style={{ fontSize: '13px', fontWeight: 'normal', color: '#666', marginTop: '2px' }}>
                            {location.state.programDate ? new Date(location.state.programDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            {location.state.programCity ? ` • ${location.state.programCity}` : ''}
                        </div>
                    )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#666' }}>Participants</span>
                        <span style={{ fontWeight: 600 }}>{participantCount}</span>
                    </div>
                    {participants && participants.length > 0 && (
                        <div style={{ paddingLeft: '8px', borderLeft: '2px solid #ddd', margin: '4px 0' }}>
                            {participants.map((p, i) => (
                                <div key={i} style={{ fontSize: '12px', color: '#4b5563', marginBottom: '2px' }}>
                                    {i + 1}. {p.name} ({p.gender}, {p.age})
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: '#666' }}>Primary Contact</span>
                        <span style={{ fontWeight: 600 }}>{primaryApplicant?.name}</span>
                    </div>
                    {place && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: '#666' }}>Coming From</span>
                            <span style={{ fontWeight: 600 }}>{place}</span>
                        </div>
                    )}
                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                        <span style={{ fontWeight: 600 }}>Total Amount</span>
                        <span style={{ fontWeight: 800, color: '#111' }}>₹{amount}</span>
                    </div>
                </div>
            </div>

            <div className="screenshot-section" style={{ marginTop: '0px' }}>
                {image ? (
                    <div className="preview-container" style={{ alignItems: 'center', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={28} color="#22c55e" weight="fill" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, color: '#166534' }}>Attached Screenshot</span>
                                <button
                                    onClick={() => setViewingImage(image)}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: '#2563eb',
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
                        <button className="btn-icon" onClick={() => setImage(null)} style={{ background: '#fee2e2', color: '#dc2626' }}><Trash2 size={20} /></button>
                    </div>
                ) : (
                    <div className="placeholder-img" onClick={captureImage} style={{ height: '100px', border: '2px dashed #ddd' }}>
                        <CameraIcon size={40} color="#9ca3af" />
                        <span style={{ color: '#6b7280', marginTop: '8px', fontSize: '14px' }}>Tap to Scan/Upload Screenshot</span>
                    </div>
                )}
            </div>

            {(rawText || ocrStatus) && (
                <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#2563eb', fontWeight: 600 }}>{ocrStatus}</div>
                        <button
                            onClick={() => setShowFullOcr(!showFullOcr)}
                            style={{ border: 'none', background: 'none', color: '#666', fontSize: '12px', textDecoration: 'underline' }}
                        >
                            {showFullOcr ? "Hide Scanned Data" : "View Scanned Data"}
                        </button>
                    </div>
                    {showFullOcr && (
                        <div className="debug-box" style={{ marginTop: '8px', background: '#f9fafb' }}>
                            <strong>Scanned Data (Full):</strong>
                            <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', fontSize: '11px', marginTop: '4px' }}>{rawText || "No Text Detected"}</pre>
                        </div>
                    )}
                </div>
            )}

            <button
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
            {viewingImage && (
                <div className="modal-overlay" onClick={() => setViewingImage(null)} style={{ zIndex: 2000 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px',
                        background: 'white',
                        padding: '15px',
                        borderRadius: '16px',
                        maxWidth: '90%'
                    }}>
                        <img
                            src={`data:image/jpeg;base64,${viewingImage}`}
                            alt="Receipt"
                            style={{ width: '100%', borderRadius: '8px', maxHeight: '75vh', objectFit: 'contain' }}
                        />
                        <button
                            className="btn-primary"
                            onClick={() => setViewingImage(null)}
                            style={{ width: '100%', background: '#2563eb', borderRadius: '8px' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="payment-container">
            <header className="header">
                <h1>Payment & Registration</h1>
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
