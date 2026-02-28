import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { TransactionService } from '@/services/TransactionService';
import { Camera as CameraPlugin, CameraResultType } from '@capacitor/camera';

const BackOfficeOfflineDonation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form State
    const [donorName, setDonorName] = useState('');
    const [mobile, setMobile] = useState('');
    const [pan, setPan] = useState('');
    const [amount, setAmount] = useState('');
    const [refNo, setRefNo] = useState('');
    const [image, setImage] = useState(null);

    // Persistence Check
    const [hasPreviousInfo, setHasPreviousInfo] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem('last_offline_transaction_details');
        if (saved) setHasPreviousInfo(true);
    }, []);

    const handleUsePrevious = () => {
        try {
            const saved = localStorage.getItem('last_offline_transaction_details');
            if (saved) {
                const data = JSON.parse(saved);
                if (confirm("Autofill details from last offline entry?")) {
                    if (data.name) setDonorName(data.name);
                    if (data.mobile) setMobile(data.mobile);
                    if (data.pan) setPan(data.pan);
                }
            }
        } catch (_err) {
            console.error("Failed to load previous info", _err);
        }
    };

    const captureImage = async () => {
        try {
            const photo = await CameraPlugin.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });
            setImage(photo.base64String);
        } catch (_err) {
            console.error(_err);
        }
    };

    const handleSubmit = async () => {
        if (!donorName || !mobile || !amount) { // Removed refNo check
            alert("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            // Save for "Use Previous Info"
            try {
                const dataToSave = {
                    name: donorName,
                    mobile: mobile,
                    pan: pan
                };
                // Merge with existing
                const existing = localStorage.getItem('last_offline_transaction_details');
                const merged = existing ? { ...JSON.parse(existing), ...dataToSave } : dataToSave;
                localStorage.setItem('last_offline_transaction_details', JSON.stringify(merged));
            } catch (_err) {
                console.error("Failed to save offline details", _err);
            }

            await TransactionService.recordTransaction({
                itemName: "Donation",
                itemType: 'DONATION',
                amount: parseFloat(amount),

                // Offline Spec
                status: 'PENDING', // Changed to PENDING to show in 'Pending' tab and require verification
                isOffline: true,
                offlineRefNo: refNo || '', // Optional

                // User Data
                shippingAddress: {
                    name: donorName,
                    mobile: mobile,
                    pan: pan
                },
                place: "Offline Entry"
            }, image);

            alert("Offline Donation Recorded Successfully!");
            navigate('/admin/back-office');
        } catch (_err) {
            console.error(_err);
            alert("Error recording donation: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '20px' }}>
            <PageHeader
                title="Offline Donation"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

                {hasPreviousInfo && (
                    <div style={{ marginBottom: '16px' }}>
                        <button
                            onClick={handleUsePrevious}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'var(--color-primary-transparent)',
                                color: 'var(--color-primary)',
                                border: '1px solid var(--color-primary)',
                                padding: '10px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={16} />
                            Use Previous Info
                        </button>
                    </div>
                )}

                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Donor Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Donor Name"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                        <input
                            placeholder="Mobile Number"
                            type="tel"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                        <input
                            placeholder="PAN Number (Optional)"
                            value={pan}
                            onChange={(e) => setPan(e.target.value?.toUpperCase())}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                    </div>
                </div>

                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Donation & Payment</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>₹</span>
                            <input
                                placeholder="Amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{ width: '100%', padding: '10px 10px 10px 25px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)', fontWeight: 'bold' }}
                            />
                        </div>

                        <input
                            placeholder="Payment Reference No (Optional)"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />

                        <div
                            onClick={captureImage}
                            style={{
                                padding: '12px',
                                border: '2px dashed var(--color-border)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: image ? 'var(--color-success)' : 'var(--color-text-muted)',
                                backgroundColor: image ? 'var(--color-success-transparent)' : 'transparent',
                                cursor: 'pointer'
                            }}
                        >
                            <Camera size={20} />
                            <span>{image ? "Receipt Attached" : "Attach Payment Receipt (Optional)"}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        opacity: loading ? 0.7 : 1,
                        cursor: loading ? 'wait' : 'pointer'
                    }}
                >
                    {loading ? "Registering..." : "Record Donation"}
                </button>
            </div>
        </div>
    );
};

export default BackOfficeOfflineDonation;
