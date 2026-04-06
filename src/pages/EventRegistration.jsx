import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';
import { TransactionService } from '@/services/TransactionService';
import { db } from '@/firebase';
import { doc, getDoc } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';

const EventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { program: initialProgram, savedState } = location.state || {};
    const [program, setProgram] = useState(initialProgram);
    const { onlineTransactionsEnabled, offlineRegistrationContact } = useGlobalSettings();
    const { isAdmin } = useAdminAuth();

    // Fresh Load of Program Data to bypass stale cache
    useEffect(() => {
        if (initialProgram?.id) {
            const refreshProgram = async () => {
                try {
                    const snap = await getDoc(doc(db, 'programs', initialProgram.id));
                    if (snap.exists()) {
                        setProgram({ id: snap.id, ...snap.data() });
                        console.log("Program data refreshed from server", snap.id);
                    }
                } catch (err) {
                    console.error("Failed to refresh program data", err);
                }
            };
            refreshProgram();
        }
    }, [initialProgram?.id]);

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
        programFee: program?.isFree ? 0 : (Number(program?.programFee) || 0)
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
    const [currentStep, setCurrentStep] = useState(0);

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
        let programTotal = 0;
        const ageRules = program?.ageRules || [];
        const baseFee = program?.isFree ? 0 : (Number(program?.programFee) || 0);

        participants.forEach(p => {
            const ageInput = Number(p.age);
            let fee = baseFee;

            if (!isNaN(ageInput) && ageInput >= 0) {
                const rule = ageRules.find(r => {
                    const min = Number(r.minAge);
                    const max = Number(r.maxAge);
                    return ageInput >= min && ageInput <= max;
                });
                if (rule) {
                    fee = Number(rule.amount);
                    if (isNaN(fee)) fee = 0;
                }
            }
            programTotal += fee;
        });

        const optionsTotal = selectedOptions.reduce((acc, opt) => acc + (Number(opt.fee) || 0), 0);
        return programTotal + optionsTotal;
    };

    // Cost Breakdown Helper
    const getBreakdown = () => {
        const breakdown = {};
        const ageRules = program?.ageRules || [];
        const baseFee = program?.isFree ? 0 : (Number(program?.programFee) || 0);

        participants.forEach(p => {
            const ageInput = Number(p.age);
            let fee = baseFee;
            let label = "Default Fee";

            if (!isNaN(ageInput) && ageInput >= 0) {
                const rule = ageRules.find(r => {
                    const min = Number(r.minAge);
                    const max = Number(r.maxAge);
                    return ageInput >= min && ageInput <= max;
                });
                if (rule) {
                    fee = Number(rule.amount);
                    if (isNaN(fee)) fee = 0;
                    label = `Age ${rule.minAge}-${rule.maxAge}`;
                }
            }

            const key = `${label}_${fee}`;
            if (!breakdown[key]) {
                breakdown[key] = { label, fee, count: 0 };
            }
            breakdown[key].count += 1;
        });

        return Object.values(breakdown);
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
            state: { ...paymentState }
        });
    };

    const totalSteps = 1 + participants.length + (program?.additionalOptions?.length > 0 ? 1 : 0);

    const handleNext = () => {
        if (currentStep === 0) {
            if (!place.trim()) {
                alert("Please enter the place where you are coming from.");
                return;
            }
            setCurrentStep(1);
        } else if (currentStep <= participants.length) {
            const p = participants[currentStep - 1];
            if (!p.name || !p.age || !p.mobile) {
                alert(`Please fill all details for Participant ${currentStep}`);
                return;
            }
            setCurrentStep(currentStep + 1);
        } else if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        } else {
            handleProceed();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    if (program?.isConsentNeeded === 'Y' && !consentAccepted) {
        // ... (Keep existing consent rendering)
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
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
                                Registration Consent
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
                                Please review and accept the following terms to proceed with your registration for <strong>{program.programName}</strong>.
                            </p>
                        </div>

                        <div
                            className="consent-text-container"
                            style={{
                                backgroundColor: 'var(--color-surface)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text)',
                                fontSize: '1.0625rem',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '45vh',
                                overflowY: 'scroll',
                                WebkitOverflowScrolling: 'touch'
                            }}
                        >
                            {program.consentText || "No detailed terms provided."}
                        </div>

                        <div style={{
                            backgroundColor: 'var(--color-primary-transparent)',
                            padding: '1.25rem',
                            borderRadius: '0.75rem',
                            border: '1px solid var(--color-primary-light)',
                            display: 'grid',
                            gap: '0.75rem'
                        }}>
                            <p style={{ fontWeight: 600, color: 'var(--color-primary)', margin: 0, fontSize: '1.125rem' }}>
                                {program.consentQuestion || "Do you agree to the terms mentioned above?"}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                data-testid="consent-agree-button"
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
                title={currentStep === totalSteps ? "Review Registration" : "Event Registration"}
                leftAction={
                    <button onClick={() => currentStep > 0 ? handlePrev() : navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{
                maxWidth: '48rem',
                margin: '0 auto',
                padding: '0 1rem 140px 1rem', // Adjusted for navigation footer
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Progress Bar */}
                <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        <span>Step {currentStep + 1} of {totalSteps + 1}</span>
                        <span>{Math.round(((currentStep + 1) / (totalSteps + 1)) * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${((currentStep + 1) / (totalSteps + 1)) * 100}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                    </div>
                </div>

                <div style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    backgroundColor: 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    borderRadius: '1rem',
                    marginBottom: '1.5rem',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                        {program?.programName}
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0' }}>
                        {program?.programDate ? new Date(program.programDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} - {program?.programCity}
                    </p>
                </div>

                {/* STEP 0: BASIC INFO */}
                {currentStep === 0 && (
                    <>
                        {hasPreviousInfo && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <button
                                    onClick={handleUsePrevious}
                                    className="btn-secondary"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: 'var(--color-primary-transparent)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary-light)',
                                        borderWidth: '2px', // Make it pop more
                                        borderRadius: '0.75rem',
                                        padding: '0.875rem',
                                        fontWeight: 700
                                    }}
                                >
                                    <RotateCcw size={18} />
                                    Autofill Last Session's Details
                                </button>
                            </div>
                        )}

                        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Total Participants</label>
                                <select
                                    value={participantCount}
                                    onChange={(e) => setParticipantCount(parseInt(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '1rem',
                                        backgroundColor: 'var(--color-surface)',
                                        color: 'var(--color-text)'
                                    }}
                                >
                                    {[...Array(15)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Place (Coming From)</label>
                                <input
                                    type="text"
                                    value={place}
                                    onChange={(e) => setPlace(e.target.value)}
                                    data-testid="reg-place"
                                    placeholder="e.g. Chennai"
                                    style={{ padding: '12px', borderRadius: '0.5rem' }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* STEPS 1 to N: PARTICIPANT DETAILS */}
                {currentStep > 0 && currentStep <= participants.length && (
                    (() => {
                        const index = currentStep - 1;
                        const p = participants[index];
                        return (
                            <div key={index} className="card" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Participant {index + 1} Details</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: primaryIndex === index ? 'var(--color-primary-transparent)' : 'transparent', padding: '4px 12px', borderRadius: '20px', border: primaryIndex === index ? '1px solid var(--color-primary-light)' : '1px solid transparent' }}>
                                        <input
                                            type="radio"
                                            name={`primary-${index}`}
                                            checked={primaryIndex === index}
                                            onChange={() => setPrimaryIndex(index)}
                                            style={{ width: '1.125rem', height: '1.125rem', margin: 0, cursor: 'pointer' }}
                                        />
                                        <label style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: primaryIndex === index ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer' }}>Primary Applicant</label>
                                    </div>
                                </div>

                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                                    gap: '0 1.5rem' 
                                }}>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Name</label>
                                        <input
                                            type="text"
                                            value={p.name}
                                            onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                                            data-testid={`reg-name-${index}`}
                                            placeholder="Enter full name"
                                            style={{ padding: '12px', borderRadius: '0.5rem' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Mobile Number</label>
                                            {index !== primaryIndex && (
                                                <button
                                                    onClick={() => copyPrimaryMobile(index)}
                                                    className="btn-text"
                                                    style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, padding: 0 }}
                                                >
                                                    Use Primary Mobile
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="tel"
                                            value={p.mobile}
                                            onChange={(e) => handleParticipantChange(index, 'mobile', e.target.value)}
                                            data-testid={`reg-mobile-${index}`}
                                            placeholder="e.g. 9876543210"
                                            style={{ padding: '12px', borderRadius: '0.5rem' }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Age</label>
                                        <select
                                            value={p.age}
                                            onChange={(e) => handleParticipantChange(index, 'age', e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-text)', fontSize: '1rem' }}
                                            data-testid={`reg-age-${index}`}
                                        >
                                            <option value="">Select Age</option>
                                            {[...Array(100).keys()].map(age => (
                                                <option key={age} value={age}>{age}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Gender</label>
                                        <select 
                                            value={p.gender} 
                                            onChange={(e) => handleParticipantChange(index, 'gender', e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-text)', fontSize: '1rem' }}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* STEP: ADDITIONAL OPTIONS */}
                {currentStep === participants.length + 1 && program?.additionalOptions?.length > 0 && (
                    <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>Additional Options</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
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
                                            padding: '1rem',
                                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            borderRadius: '0.75rem',
                                            backgroundColor: isSelected ? 'var(--color-primary-transparent)' : (isFull ? 'var(--color-surface)' : 'var(--color-card)'),
                                            cursor: isFull ? 'not-allowed' : 'pointer',
                                            opacity: isFull ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1rem' }}>{option.name}</div>
                                            <div style={{ fontSize: '0.875rem', marginTop: '2px', color: isFull ? 'var(--color-error)' : (usedCount > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)') }}>
                                                {isFull ? '🚫 Sold Out' : (option.maxCount ? `👥 ${usedCount}/${option.maxCount} filled` : '✅ Available')}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>₹{option.fee}</div>
                                            <div style={{
                                                width: '1.5rem',
                                                height: '1.5rem',
                                                borderRadius: '50%',
                                                border: isSelected ? '6px solid var(--color-primary)' : '2px solid var(--color-border)',
                                                backgroundColor: isSelected ? 'white' : 'transparent',
                                                transition: 'all 0.2s'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FINAL STEP: REVIEW & PAY */}
                {currentStep === totalSteps && (
                    <div className="card" style={{ 
                        background: 'rgba(255, 255, 255, 0.95)', 
                        backdropFilter: 'blur(10px)',
                        border: '2px solid var(--color-primary-light)', 
                        zIndex: 10,
                        borderRadius: '1.25rem',
                        padding: '1.5rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        marginTop: '1rem'
                    }}>
                        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>Review Fee Breakdown</h4>
                                {isAdmin && (
                                    <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                        ADMIN VIEW
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                {getBreakdown().map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--color-text)' }}>
                                        <span style={{ fontWeight: 500 }}>{item.count} x {item.label}</span>
                                        <span style={{ fontWeight: 700 }}>₹{item.fee * item.count}</span>
                                    </div>
                                ))}
                                {selectedOptions.length > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--color-text)', fontWeight: 700, marginTop: '0.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem' }}>
                                        <span>Extra Options ({selectedOptions.length})</span>
                                        <span>₹{selectedOptions.reduce((acc, opt) => acc + (Number(opt.fee) || 0), 0)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Final Amount Payable:</span>
                            <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-primary)' }}>{calculateTotal() > 0 ? `₹${calculateTotal()}` : 'FREE'}</span>
                        </div>

                        {!onlineTransactionsEnabled && (
                            <div style={{
                                marginBottom: '1rem',
                                padding: '1rem',
                                backgroundColor: 'var(--color-error-transparent)',
                                border: '1px solid var(--color-error-light)',
                                borderRadius: '0.75rem',
                                textAlign: 'center'
                            }}>
                                <p style={{ margin: 0, color: 'var(--color-error)', fontWeight: 700, fontSize: '0.95rem' }}>
                                    📱 Registration via Support: {offlineRegistrationContact}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* PERSISTENT NAVIGATION FOOTER */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid var(--color-border)',
                padding: '1rem',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center'
            }}>
                <div style={{ 
                    maxWidth: '48rem', 
                    width: '100%', 
                    display: 'flex', 
                    gap: '1rem',
                    justifyContent: 'space-between'
                }}>
                    <button 
                        onClick={handlePrev}
                        className="btn-secondary"
                        disabled={currentStep === 0}
                        style={{ 
                            flex: 1, 
                            height: '3.5rem', 
                            fontSize: '1.125rem', 
                            fontWeight: 700, 
                            borderRadius: '1rem',
                            opacity: currentStep === 0 ? 0.3 : 1,
                            cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Previous
                    </button>
                    
                    <button 
                        onClick={handleNext}
                        className="btn-primary"
                        style={{ 
                            flex: 2, 
                            height: '3.5rem', 
                            fontSize: '1.125rem', 
                            fontWeight: 800, 
                            borderRadius: '1rem',
                            boxShadow: '0 4px 12px var(--color-primary-transparent)'
                        }}
                    >
                        {currentStep === totalSteps 
                            ? (calculateTotal() > 0 ? 'Confirm & Proceed to Pay' : 'Finish Registration') 
                            : 'Next Step'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventRegistration;
