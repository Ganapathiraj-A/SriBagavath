import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { Trash2, Check, QrCode as QrIcon } from 'lucide-react';

import { TransactionService } from '../services/TransactionService';
import OCR from '../plugins/OCRPlugin';
import { GPayUtils } from '../utils/GPayUtils';
import qrImage from '../assets/qr_code.jpg';
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
                participantCount: participantCount || 1
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
                onClick={() => {
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
            <button className="btn-secondary full-width" onClick={() => navigate(-1)}>Back</button>
        </div>
    );

    const renderInstructions = () => (
        <div className="instructions-container">
            <h2>Payment Instructions</h2>
            <div className="steps-list">
                <p><strong>1.</strong> Click the button below to <b>open GPay</b>.</p>
                <p><strong>2.</strong> Once inside GPay, click on '<b>Scan any QR code</b>'.</p>
                <p><strong>3.</strong> Click on '<b>Upload from gallery</b>' and select the 'BagavathMission_QR' image.</p>
                <p><strong>4.</strong> Pay the amount: <b>₹{amount}</b></p>
                <p><strong>5.</strong> After payment, click <b>Share Screenshot</b> and select 'SriBagavath' (or SBB Payment if labeled old).</p>
                <p><strong>6.</strong> If you are using any <b>other UPI App</b>, please follow similar instructions for that app.</p>
                <p><strong>7.</strong> Then click 'Share Screenshot' &rarr; 'More' &rarr; Find App.</p>
            </div>
            <button className="btn-primary full-width" onClick={() => GPayUtils.openGPay()}>
                GPay &rarr; Upload QR + Pay &rarr; Share Screenshot
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

            <div className="form-group">
                <label>Program Name</label>
                <input
                    type="text"
                    value={submissionName}
                    onChange={e => setSubmissionName(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>Amount (₹)</label>
                <input
                    type="number"
                    value={submissionAmount}
                    onChange={e => setSubmissionAmount(e.target.value)}
                />
            </div>

            <div className="screenshot-section">
                <p>Attached Screenshot:</p>
                {image ? (
                    <div className="preview-container" style={{ alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={32} color="green" />
                            <span style={{ fontWeight: 600, color: 'green' }}>Attached</span>
                        </div>
                        <button className="btn-icon" onClick={() => setImage(null)}><Trash2 /></button>
                    </div>
                ) : (
                    <div className="placeholder-img" onClick={captureImage}>
                        <QrIcon size={48} />
                        <span>Tap to Scan/Upload</span>
                    </div>
                )}
            </div>

            {(rawText || ocrStatus) && (
                <div className="debug-box">
                    <strong>Scanned Data (Full):</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', fontSize: '11px' }}>{rawText || "No Text Detected"}</pre>
                    <div style={{ marginTop: '4px', color: 'blue', fontWeight: 'bold' }}>{ocrStatus}</div>
                </div>
            )}

            <button
                className="btn-primary full-width"
                onClick={handleSubmit}
                disabled={!image || loading}
            >
                {loading ? "Registering..." : "Register Transaction"}
            </button>
            <button className="btn-secondary full-width" style={{ marginTop: '12px' }} onClick={() => setCurrentStep('INSTRUCTIONS')}>
                Back
            </button>
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
