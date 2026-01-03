import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Camera } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { TransactionService } from '../services/TransactionService';
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

    // Derived
    const selectedProgram = programs.find(p => p.id === selectedProgramId);

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                // Fetch active programs (Simplified: fetching all for now, can filter by date)
                const q = query(collection(db, 'programs'), where('active', '==', true));
                const snap = await getDocs(q);
                const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPrograms(loaded);
            } catch (error) {
                console.error("Error fetching programs", error);
            }
        };
        fetchPrograms();
    }, []);

    const calculateTotal = () => {
        if (!selectedProgram) return 0;
        const count = participants.length + 1; // +1 for primary
        return count * selectedProgram.price;
    };

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
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async () => {
        if (!selectedProgram || !primaryName || !mobile || !refNo) {
            alert("Please fill all required fields");
            return;
        }

        if (participants.length + 1 > selectedProgram.seatsAvailable) {
            alert("Not enough seats available!");
            return;
        }

        setLoading(true);
        try {
            const totalPeople = [{ name: primaryName }, ...participants];

            await TransactionService.recordTransaction({
                itemName: selectedProgram.title,
                itemType: 'PROGRAM',
                amount: calculateTotal(),

                // Offline Spec
                status: 'BNK_VERIFIED',
                isOffline: true,
                offlineRefNo: refNo,

                // Program Data
                programId: selectedProgram.id,
                programDate: selectedProgram.date,
                programCity: selectedProgram.location,

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
            navigate('/admin/back-office/offline-hub');
        } catch (error) {
            console.error(error);
            alert("Error recording transaction: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '20px' }}>
            <PageHeader
                title="Offline Registration"
                leftAction={
                    <button onClick={() => navigate('/admin/back-office/offline-hub')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
                {/* Program Selection */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Select Program</label>
                    <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    >
                        <option value="">-- Select Program --</option>
                        {programs.map(p => (
                            <option key={p.id} value={p.id}>{p.title} - {p.date} ({p.location})</option>
                        ))}
                    </select>
                </div>

                {/* Primary Applicant */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Primary Applicant</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Full Name"
                            value={primaryName}
                            onChange={(e) => setPrimaryName(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                        <input
                            placeholder="Mobile Number"
                            type="tel"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                        <input
                            placeholder="City / Place Details"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                </div>

                {/* Additional Participants */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Additional Participants</h3>

                    {participants.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px' }}>{p.name} ({p.gender}, {p.age})</span>
                            <button onClick={() => handleRemoveParticipant(idx)} style={{ border: 'none', background: 'none', color: '#ef4444' }}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                            placeholder="Name"
                            value={newParticipant.name}
                            onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                            style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                        />
                        <select
                            value={newParticipant.gender}
                            onChange={(e) => setNewParticipant({ ...newParticipant, gender: e.target.value })}
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
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
                            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                        />
                        <button
                            onClick={handleAddParticipant}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px' }}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="card" style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'white', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Payment Reference</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ color: '#6b7280' }}>Total Amount</span>
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>₹{calculateTotal()}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input
                            placeholder="Payment Reference No / Order ID"
                            value={refNo}
                            onChange={(e) => setRefNo(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                        />

                        <div
                            onClick={captureImage}
                            style={{
                                padding: '12px',
                                border: '2px dashed #d1d5db',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: image ? '#166534' : '#6b7280',
                                backgroundColor: image ? '#f0fdf4' : 'transparent',
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
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: 600,
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? "Registering..." : "Complete Registration"}
                </button>
            </div>
        </div>
    );
};

export default BackOfficeOfflineRegistration;
