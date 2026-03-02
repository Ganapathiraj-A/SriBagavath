import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Camera, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { getLocalDateString } from '@/utils/dateUtils';
import { collection, getDocs } from '@/utils/FirestoreProxy';
import { TransactionService } from '@/services/TransactionService';
import { Camera as CameraPlugin, CameraResultType } from '@capacitor/camera';

const BackOfficeOfflineRegistration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [programs, setPrograms] = useState([]);

    // Form State
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [primaryName, setPrimaryName] = useState('');
    const [mobile, setMobile] = useState('');
    const [city, setCity] = useState('');
    const [participants, setParticipants] = useState([]);
    const [newParticipant, setNewParticipant] = useState({ name: '', gender: '', age: '' });
    const [refNo, setRefNo] = useState('');
    const [image, setImage] = useState(null);
    const [amount, setAmount] = useState(0); // Editable Amount State

    // Derived
    const selectedProgram = programs.find(p => p.id === selectedProgramId);

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                // Fetch active programs (Upcoming programs logic from Programs.jsx)
                const programsRef = collection(db, 'programs');
                const snap = await getDocs(programsRef);

                console.log("OfflineReg: Fetched All Programs Snap Size:", snap.size);

                const today = getLocalDateString();
                const loaded = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(p => p.programDate >= today)
                    .sort((a, b) => a.programDate.localeCompare(b.programDate));

                console.log("OfflineReg: Filtered Programs:", loaded);
                setPrograms(loaded);
            } catch (_err) {
                console.error("Error fetching programs", _err);
            }
        };
        fetchPrograms();
    }, []);

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
                    if (data.name) setPrimaryName(data.name);
                    if (data.mobile) setMobile(data.mobile);
                    if (data.city) setCity(data.city);
                }
            }
        } catch (_err) {
            console.error("Failed to load previous info", _err);
        }
    };

    // Auto-Calculate Amount
    useEffect(() => {
        if (!selectedProgram) {
            setAmount(0);
            return;
        }
        const count = participants.length + 1;
        const price = selectedProgram.price ? parseFloat(selectedProgram.price) : 0;
        if (!isNaN(price)) {
            setAmount(count * price);
        }
    }, [selectedProgram, participants]);

    const handleAddParticipant = () => {
        if (newParticipant.name && newParticipant.gender && newParticipant.age) {
            setParticipants([...participants, newParticipant]);
            setNewParticipant({ name: '', gender: '', age: '' });
        }
    };

    const handleRemoveParticipant = (index) => {
        const updated = [...participants];
        updated.splice(index, 1);
        setParticipants(updated);
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
        if (!selectedProgram || !primaryName || !mobile) {
            alert("Please fill all required fields (Program, Name, Mobile)");
            return;
        }

        if (participants.length + 1 > selectedProgram.seatsAvailable) {
            alert("Not enough seats available!");
            return;
        }

        if (amount <= 0) {
            if (!confirm("Warning: Total Amount is 0. Do you want to proceed?")) {
                return;
            }
        }

        setLoading(true);
        try {
            const totalPeople = [{ name: primaryName }, ...participants];

            // Save for "Use Previous Info"
            try {
                const dataToSave = {
                    name: primaryName,
                    mobile: mobile,
                    city: city
                };
                // Merge with existing to keep other fields (like address/pan from other screens)
                const existing = localStorage.getItem('last_offline_transaction_details');
                const merged = existing ? { ...JSON.parse(existing), ...dataToSave } : dataToSave;
                localStorage.setItem('last_offline_transaction_details', JSON.stringify(merged));
            } catch (_err) {
                console.error("Failed to save offline details", _err);
            }

            await TransactionService.recordTransaction({
                itemName: selectedProgram.programName,
                itemType: 'PROGRAM',
                amount: parseFloat(amount), // Use state amount

                // Offline Spec
                status: 'PENDING', // Changed to PENDING to show in 'Pending' tab and require verification
                isOffline: true,
                offlineRefNo: refNo || '', // Optional

                // Program Data
                programId: selectedProgram.id,
                programDate: selectedProgram.programDate,
                programCity: selectedProgram.programCity,

                // User Data
                primaryApplicant: {
                    name: primaryName,
                    mobile: mobile,
                    city: city
                },
                participants: totalPeople,
                participantCount: totalPeople.length,
                place: city
            }, image);

            alert("Offline Registration Recorded Successfully!");
            navigate('/admin/back-office');
        } catch (_err) {
            console.error(_err);
            alert("Error recording transaction: " + _err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '20px' }}>
            <PageHeader
                title="Offline Registration"
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

                {/* Program Selection */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Select Program</label>
                    <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                    >
                        <option value="">-- Select Program --</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.programName} ({new Date(p.programDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {p.programCity})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Primary Applicant */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Primary Applicant</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Full Name"
                            value={primaryName}
                            onChange={(e) => setPrimaryName(e.target.value)}
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
                            placeholder="City / Place Details"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                    </div>
                </div>

                {/* Additional Participants */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '16px', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Additional Participants</h3>

                    {participants.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-alt)', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>{p.name} ({p.gender}, {p.age})</span>
                            <button onClick={() => handleRemoveParticipant(idx)} style={{ border: 'none', background: 'none', color: 'var(--color-error)' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        <input
                            placeholder="Name"
                            value={newParticipant.name}
                            onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={newParticipant.gender}
                                onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                            >
                                <option value="">Gender</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                            </select>
                            <input
                                placeholder="Age"
                                type="number"
                                value={newParticipant.age}
                                onChange={(e) => setNewParticipant({ ...newParticipant, age: e.target.value })}
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
                            />
                            <button
                                onClick={handleAddParticipant}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--color-surface)', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Payment Reference</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Total Amount</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{
                                fontWeight: 700,
                                fontSize: '18px',
                                textAlign: 'right',
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                width: '120px',
                                backgroundColor: 'var(--color-background)',
                                color: 'var(--color-text)'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Payment Reference No / Order ID"
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
                            <span>{image ? "Receipt Attached" : "Attach Payment Receipt"}</span>
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
                    {loading ? "Registering..." : "Complete Registration"}
                </button>
            </div>
        </div>
    );
};

export default BackOfficeOfflineRegistration;
