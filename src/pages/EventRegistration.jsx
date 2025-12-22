import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import '../components/RegistrationStyles.css';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { program, savedState } = location.state || {};

    // Redirect if no program
    useEffect(() => {
        if (!program) {
            navigate('/programs');
        } else {
            // Track screen view and registration start
            const Analytics = import('../utils/Analytics').then(m => {
                m.default.trackScreenView('Event Registration');
                m.default.trackRegistrationStart(program.programName, program.id);
            });
        }
    }, [program, navigate]);

    // Fees from Program Data
    const fees = {
        programFee: Number(program?.programFee) || 0,
        dormFee: Number(program?.roomFees) || Number(program?.roomFee) || 0,
        roomFee: Number(program?.dormFees) || Number(program?.dormFee) || 0
    };

    // Initialize State from savedState if available, else defaults
    const [participantCount, setParticipantCount] = useState(savedState?.participantCount || 1);
    const [participants, setParticipants] = useState(savedState?.participants || [{
        name: '',
        gender: 'Male',
        age: '',
        mobile: '',
        accommodation: 'Dorm'
    }]);
    const [place, setPlace] = useState(savedState?.place || '');

    const [primaryIndex, setPrimaryIndex] = useState(savedState?.primaryIndex || 0);

    // Persistence Check
    const [hasPreviousInfo, setHasPreviousInfo] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem('last_registration_details');
        if (saved) setHasPreviousInfo(true);
    }, []);

    const handleUsePrevious = () => {
        try {
            const saved = localStorage.getItem('last_registration_details');
            if (saved) {
                const data = JSON.parse(saved);
                if (confirm("Autofill details from your last session?")) {
                    setParticipantCount(data.participantCount || 1);
                    setParticipants(data.participants || []);
                    setPlace(data.place || '');
                    setPrimaryIndex(data.primaryIndex || 0);
                }
            }
        } catch (e) {
            console.error("Failed to load previous info", e);
        }
    };

    // Update Participants Array when Count Changes
    useEffect(() => {
        const count = parseInt(participantCount) || 1;
        if (count > participants.length) {
            const added = Array(count - participants.length).fill({
                name: '',
                gender: 'Male',
                age: '',
                mobile: '',
                accommodation: 'Dorm'
            });
            setParticipants([...participants, ...added]);
        } else if (count < participants.length) {
            setParticipants(participants.slice(0, count));
        }
    }, [participantCount]);

    const handleParticipantChange = (index, field, value) => {
        const updated = [...participants];
        updated[index] = { ...updated[index], [field]: value };
        setParticipants(updated);
    };

    const copyPrimaryMobile = (index) => {
        const primaryMobile = participants[primaryIndex]?.mobile || "";
        if (!primaryMobile) {
            alert("Primary mobile is empty");
            return;
        }
        handleParticipantChange(index, 'mobile', primaryMobile);
    };

    // Calculate Total
    const calculateTotal = () => {
        let total = 0;
        participants.forEach(p => {
            total += fees.programFee;
            if (p.accommodation === 'Dorm') total += fees.dormFee;
            if (p.accommodation === 'Room') total += fees.roomFee;
        });
        return total;
    };

    const handleProceed = () => {
        // Validation
        if (!place.trim()) {
            alert("Please enter the place where you are coming from.");
            return;
        }

        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (!p.name || !p.age || !p.mobile) {
                alert(`Please fill all details for Participant ${i + 1}`);
                return;
            }
        }

        const primary = participants[primaryIndex];
        if (!primary.mobile) {
            alert("Primary applicant must have a mobile number.");
            return;
        }

        // Save for "Use Previous Info"
        try {
            const dataToSave = {
                participantCount,
                participants,
                place,
                primaryIndex
            };
            localStorage.setItem('last_registration_details', JSON.stringify(dataToSave));
        } catch (e) {
            console.error("Failed to save registration details", e);
        }

        const totalAmount = calculateTotal();

        // Track Proceed to Payment
        import('../utils/Analytics').then(m => {
            m.default.trackPaymentInitiated('registration_flow', totalAmount);
        });

        navigate('/payment-flow', {
            replace: true, // Replace history so Back goes to Programs
            state: {
                amount: totalAmount,
                programName: program.programName,
                programId: program.id, // Pass Program ID for lookup
                programDate: program.programDate, // Pass Program Date
                programCity: program.programCity, // Pass Program City
                participants: participants,
                primaryApplicant: { ...primary, isPrimary: true },
                place: place,
                participantCount: participants.length,
                // Pass full program object so if we come back we have it
                program: program,
                // Pass State to restore if user comes back
                savedState: {
                    participantCount,
                    participants,
                    place,
                    primaryIndex
                }
            }
        });
    };

    return (
        <div className="payment-container" style={{ paddingTop: 0 }}>
            <PageHeader title="Event Registration" />

            <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: '#f3f4f6',
                borderBottom: '1px solid #e5e7eb',
                marginBottom: '1rem'
            }}>
                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#111827',
                    margin: 0
                }}>
                    {program.programName}
                </h2>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#4b5563',
                    margin: '0.25rem 0 0 0'
                }}>
                    {new Date(program.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {program.programCity}
                </p>
            </div>

            {hasPreviousInfo && (
                <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                    <button
                        onClick={handleUsePrevious}
                        className="btn-secondary"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: '#e0f2fe',
                            color: '#0284c7',
                            border: '1px solid #bae6fd'
                        }}
                    >
                        <RotateCcw size={16} />
                        Use Previous Info
                    </button>
                </div>
            )}

            <div className="card">
                <div className="form-group">
                    <label>Total Participants</label>
                    <select
                        value={participantCount}
                        onChange={(e) => setParticipantCount(parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            fontSize: '16px',
                            backgroundColor: 'white'
                        }}
                    >
                        {[...Array(15)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Place (Coming From)</label>
                    <input
                        type="text"
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder="e.g. Chennai"
                    />
                </div>
            </div>

            {participants.map((p, index) => (
                <div key={index} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3>Participant {index + 1}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="radio"
                                name="primary"
                                checked={primaryIndex === index}
                                onChange={() => setPrimaryIndex(index)}
                            />
                            <label style={{ fontSize: '12px', margin: 0 }}>Primary</label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Age</label>
                            <input
                                type="number"
                                value={p.age}
                                onChange={(e) => handleParticipantChange(index, 'age', e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Gender</label>
                            <select value={p.gender} onChange={(e) => handleParticipantChange(index, 'gender', e.target.value)}>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label>Mobile</label>
                            {index !== primaryIndex && (
                                <button
                                    onClick={() => copyPrimaryMobile(index)}
                                    className="btn-text"
                                    style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, padding: 0 }}
                                >
                                    Use Primary Mobile
                                </button>
                            )}
                        </div>
                        <input
                            type="tel"
                            value={p.mobile}
                            onChange={(e) => handleParticipantChange(index, 'mobile', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Accommodation</label>
                        <select value={p.accommodation} onChange={(e) => handleParticipantChange(index, 'accommodation', e.target.value)}>
                            <option value="Dorm">Dorm (₹{fees.dormFee})</option>
                            <option value="Room">Room (₹{fees.roomFee})</option>
                        </select>
                    </div>
                </div>
            ))}

            <div className="card" style={{ position: 'sticky', bottom: '10px', background: '#ffedd5', border: '1px solid #fdba74' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Total Estimated Amount:</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{calculateTotal()}</span>
                </div>
                <button className="btn-primary" style={{ marginTop: '10px' }} onClick={handleProceed}>
                    Proceed to Payment
                </button>
            </div>
        </div>
    );
};

export default EventRegistration;
