import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';
import { TransactionService } from '@/services/TransactionService';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { program, savedState } = location.state || {};
    const { onlineTransactionsEnabled } = useGlobalSettings();

    // Redirect if no program
    useEffect(() => {
        if (!program) {
            navigate('/programs');
        } else {
            // Track screen view and registration start
            const Analytics = import('../utils/Analytics').then(m => {
                m.default.trackScreenView('Event Registration');
                if (program?.programName) {
                    m.default.trackRegistrationStart(program.programName, program.id);
                }
            });
        }
    }, [program, navigate]);

    // Fees from Program Data
    const fees = {
        programFee: Number(program?.programFee) || 0
    };

    // Initialize State from savedState if available, else defaults
    const [participantCount, setParticipantCount] = useState(savedState?.participantCount || 1);
    const [participants, setParticipants] = useState(savedState?.participants || [{
        name: '',
        gender: 'Male',
        age: '',
        mobile: ''
    }]);
    const [place, setPlace] = useState(savedState?.place || '');

    const [primaryIndex, setPrimaryIndex] = useState(savedState?.primaryIndex || 0);
    const [consentAccepted, setConsentAccepted] = useState(false);

    // Additional Options State
    const [selectedOptions, setSelectedOptions] = useState(savedState?.selectedOptions || []);
    const [optionUsage, setOptionUsage] = useState({});

    useEffect(() => {
        if (program?.additionalOptions?.length > 0) {
            const fetchUsage = async () => {
                const txs = await TransactionService.getProgramRegistrations(program.id);
                const usage = {};
                txs.forEach(tx => {
                    if (tx.status !== 'FAILED') {
                        const opts = tx.selectedOptions || [];
                        opts.forEach(opt => {
                            usage[opt.name] = (usage[opt.name] || 0) + 1;
                        });
                    }
                });
                setOptionUsage(usage);
            };
            fetchUsage();
        }
    }, [program]);

    const toggleOption = (option) => {
        const exists = selectedOptions.find(o => o.name === option.name);
        if (exists) {
            setSelectedOptions(selectedOptions.filter(o => o.name !== option.name));
        } else {
            setSelectedOptions([...selectedOptions, option]);
        }
    };

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
                    // Do not auto-select options as availability might change
                }
            }
        } catch (_err) {
            console.error("Failed to load previous info", _err);
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
                mobile: ''
            });
            setParticipants([...participants, ...added]);
        } else if (count < participants.length) {
            setParticipants(participants.slice(0, count));
            // Reset primaryIndex if it's now out of bounds
            if (primaryIndex >= count) {
                setPrimaryIndex(0);
            }
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
        const programTotal = participants.length * fees.programFee;
        const optionsTotal = selectedOptions.reduce((acc, opt) => acc + (Number(opt.fee) || 0), 0);
        return programTotal + optionsTotal;
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

        const primary = participants[primaryIndex] || participants[0];
        if (!primary?.mobile) {
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
        } catch (_err) {
            console.error("Failed to save registration details", _err);
        }

        const totalAmount = calculateTotal();
        const paymentState = {
            amount: totalAmount,
            programName: program.programName,
            programId: program.id,
            programDate: program.programDate,
            programCity: program.programCity,
            participants: participants,
            primaryApplicant: { ...primary, isPrimary: true },
            place: place,
            selectedOptions: selectedOptions,
            participantCount: participants.length,
            itemType: 'PROGRAM',
            program: program,
            savedState: {
                participantCount,
                participants,
                place,
                primaryIndex,
                selectedOptions
            }
        };

        // Save for recovery if app reloads during payment
        try {
            localStorage.setItem('last_registration_details', JSON.stringify(paymentState));
        } catch (_err) {
            console.error("Failed to save registration details", _err);
        }

        // Track Proceed to Payment
        import('../utils/Analytics').then(m => {
            m.default.trackPaymentInitiated('registration_flow', totalAmount);
        });

        navigate('/payment-flow', {
            replace: true,
            state: paymentState
        });
    };

    if (program?.isConsentNeeded === 'Y' && !consentAccepted) {
        return (
            <div className="payment-container" style={{ paddingTop: 0, backgroundColor: 'var(--color-surface)', minHeight: '100vh' }}>
                <PageHeader
                    title="Terms & Conditions"
                    leftAction={
                        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                            <ChevronLeft size={24} />
                        </button>
                    }
                />

                <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                    <div className="card" style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
                                Registration Consent
                            </h2>
                            <p style={{ color: '#4b5563', fontSize: '1rem' }}>
                                Please review and accept the following terms to proceed with your registration for <strong>{program.programName}</strong>.
                            </p>
                        </div>

                        <div
                            className="consent-text-container"
                            style={{
                                backgroundColor: '#f9fafb',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                color: '#374151',
                                fontSize: '1.0625rem',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '45vh', // Slightly increased height
                                overflowY: 'scroll', // Force scrollbar
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            {program.consentText || "No detailed terms provided."}
                        </div>

                        <div style={{
                            backgroundColor: '#fff7ed',
                            padding: '1.25rem',
                            borderRadius: '0.75rem',
                            border: '1px solid #ffedd5',
                            display: 'grid',
                            gap: '0.75rem'
                        }}>
                            <p style={{ fontWeight: 600, color: '#9a3412', margin: 0, fontSize: '1.125rem' }}>
                                {program.consentQuestion || "Do you agree to the terms mentioned above?"}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                onClick={() => setConsentAccepted(true)}
                                className="btn-primary"
                                style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }}
                            >
                                I Agree & Proceed
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="btn-secondary"
                                style={{ width: '100%', padding: '1rem', fontSize: '1.125rem', backgroundColor: 'transparent' }}
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-container" style={{ paddingTop: 0 }}>
            <PageHeader
                title="Event Registration"
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

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
                    {program?.programName}
                </h2>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#4b5563',
                    margin: '0.25rem 0 0 0'
                }}>
                    {program?.programDate ? new Date(program.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} - {program?.programCity}
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


                </div>
            ))}

            {/* Additional Options Selection */}
            {program?.additionalOptions?.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Additional Options</h3>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {program.additionalOptions.map((option, index) => {
                            const usedCount = optionUsage[option.name] || 0;
                            const maxCount = parseInt(option.maxCount) || Infinity;
                            const isFull = usedCount >= maxCount;
                            const isSelected = selectedOptions.some(o => o.name === option.name);

                            return (
                                <div
                                    key={index}
                                    className={`option-item ${isSelected ? 'selected' : ''} ${isFull && !isSelected ? 'disabled' : ''}`}
                                    onClick={() => !isFull && toggleOption(option)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        backgroundColor: isSelected ? '#eff6ff' : (isFull ? '#f3f4f6' : 'white'),
                                        cursor: isFull ? 'not-allowed' : 'pointer',
                                        opacity: isFull ? 0.7 : 1
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: '#374151' }}>{option.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: isFull ? '#dc2626' : (usedCount > 0 ? '#d97706' : '#6b7280') }}>
                                            {isFull ? 'Sold Out' : (option.maxCount ? `${usedCount}/${option.maxCount} filled` : 'Available')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ fontWeight: 600 }}>₹{option.fee}</div>
                                        <div style={{
                                            width: '1.25rem',
                                            height: '1.25rem',
                                            borderRadius: '50%',
                                            border: isSelected ? '5px solid var(--color-primary)' : '2px solid #d1d5db',
                                            backgroundColor: isSelected ? 'white' : 'transparent'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="card" style={{ position: 'sticky', bottom: '10px', background: '#ffedd5', border: '1px solid #fdba74' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Total Estimated Amount:</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>₹{calculateTotal()}</span>
                </div>

                {!onlineTransactionsEnabled && (
                    <div style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fee2e2',
                        borderRadius: '8px',
                        textAlign: 'center'
                    }}>
                        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}>
                            To register please contact 7904118421
                        </p>
                    </div>
                )}

                {onlineTransactionsEnabled && (
                    <button className="btn-primary" style={{ marginTop: '10px' }} onClick={handleProceed}>
                        Proceed to Payment
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventRegistration;
