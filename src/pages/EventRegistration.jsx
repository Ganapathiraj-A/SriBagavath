import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import '../components/RegistrationStyles.css';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { program } = location.state || {};

    // Redirect if no program
    useEffect(() => {
        if (!program) {
            navigate('/programs');
        }
    }, [program, navigate]);

    // Fees from Program Data (Ensure your Program Management saves these fields!)
    // Defaulting to 0 if not set to avoid NaN
    const fees = {
        programFee: Number(program?.programFee) || 0,
        // Swap as per user report (Data seems inverted in source)
        dormFee: Number(program?.roomFees) || Number(program?.roomFee) || 0,
        roomFee: Number(program?.dormFees) || Number(program?.dormFee) || 0
    };

    // State
    const [participantCount, setParticipantCount] = useState(1);
    const [participants, setParticipants] = useState([{
        name: '',
        gender: 'Male',
        age: '',
        mobile: '',
        accommodation: 'Dorm' // Dorm or Room
    }]);
    const [place, setPlace] = useState('');
    const [primaryIndex, setPrimaryIndex] = useState(0);

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

        const totalAmount = calculateTotal();

        navigate('/payment-flow', {
            state: {
                amount: totalAmount,
                programName: program.programName,
                participants: participants,
                primaryApplicant: { ...primary, isPrimary: true },
                place: place,
                participantCount: participants.length
            }
        });
    };

    return (
        <div className="payment-container">
            <header className="header">
                <h1>Event Registration</h1>
            </header>

            <div className="card">
                <div className="form-group">
                    <label>Total Participants</label>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={participantCount}
                        onChange={(e) => setParticipantCount(e.target.value)}
                    />
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
                        <label>Mobile</label>
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
