import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { useGlobalSettings } from '@/context/GlobalSettingsContext';
import '../components/RegistrationStyles.css';
import { TransactionService } from '@/services/TransactionService';
import { db } from '@/firebase';
import { doc, getDoc } from '@/utils/FirestoreProxy';
import { useAdminAuth } from '@/context/AdminAuthContext';

const WebEventRegistration = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { program: initialProgram, savedState } = location.state || {};
    const [program, setProgram] = useState(initialProgram);
    const { onlineTransactionsEnabled, offlineRegistrationContact } = useGlobalSettings();
    const { isAdmin } = useAdminAuth();

    useEffect(() => {
        if (initialProgram?.id) {
            const refreshProgram = async () => {
                try {
                    const snap = await getDoc(doc(db, 'programs', initialProgram.id));
                    if (snap.exists()) {
                        setProgram({ id: snap.id, ...snap.data() });
                    }
                } catch (err) {
                    console.error("Failed to refresh program data", err);
                }
            };
            refreshProgram();
        }
    }, [initialProgram?.id]);

    useEffect(() => {
        if (!program) {
            navigate('/web/events');
        }
    }, [program, navigate]);

    const [participantCount, setParticipantCount] = useState(savedState?.participantCount || 1);
    const [participants, setParticipants] = useState(savedState?.participants || [{
        name: '',
        gender: 'Male',
        age: '',
        mobile: ''
    }]);
    const [place, setPlace] = useState(savedState?.place || '');
    const [primaryIndex, setPrimaryIndex] = useState(savedState?.primaryIndex || 0);
    const [consentAccepted, setConsentAccepted] = useState(false); // Simplified for now
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState(savedState?.selectedOptions || []);
    const [optionUsage, setOptionUsage] = useState({});

    useEffect(() => {
        if (participantCount > participants.length) {
            const extra = Array(participantCount - participants.length).fill({
                name: '',
                gender: 'Male',
                age: '',
                mobile: ''
            });
            setParticipants([...participants, ...extra]);
        } else if (participantCount < participants.length) {
            setParticipants(participants.slice(0, participantCount));
        }
    }, [participantCount]);

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

    const handleParticipantChange = (index, field, value) => {
        const updated = [...participants];
        updated[index] = { ...updated[index], [field]: value };
        setParticipants(updated);
    };

    const calculateTotal = () => {
        let programTotal = 0;
        const ageRules = program?.ageRules || [];
        const baseFee = program?.isFree ? 0 : (Number(program?.programFee) || 0);
        participants.forEach(p => {
            const ageInput = Number(p.age);
            let fee = baseFee;
            if (!isNaN(ageInput) && ageInput >= 0) {
                const rule = ageRules.find(r => ageInput >= Number(r.minAge) && ageInput <= Number(r.maxAge));
                if (rule) fee = Number(rule.amount) || 0;
            }
            programTotal += fee;
        });
        const optionsTotal = selectedOptions.reduce((acc, opt) => acc + (Number(opt.fee) || 0), 0);
        return programTotal + optionsTotal;
    };

    const handleProceed = () => {
        const totalAmount = calculateTotal();
        const primary = participants[primaryIndex] || participants[0];
        const paymentState = {
            amount: totalAmount,
            programName: program.programName,
            programId: program.id,
            participants: participants,
            primaryApplicant: { ...primary, isPrimary: true },
            place: place,
            selectedOptions: selectedOptions,
            itemType: 'PROGRAM',
            program: program
        };
        navigate('/web/payment-flow', { state: paymentState });
    };

    const totalSteps = 1 + participants.length + (program?.additionalOptions?.length > 0 ? 1 : 0);

    const handleNext = () => {
        if (currentStep === 0 && !place.trim()) return alert("Please enter place");
        if (currentStep > 0 && currentStep <= participants.length) {
            const p = participants[currentStep - 1];
            if (!p.name || !p.age || !p.mobile) return alert("Please fill all details");
        }
        if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
        else handleProceed();
    };

    return (
        <div style={{ backgroundColor: 'var(--color-surface)', minHeight: 'calc(100vh - 64px)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {/* Back Link (Step Back) */}
                    <button 
                        onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate(-1)} 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                    >
                        <ChevronLeft size={20} />
                        {currentStep === 0 ? 'Back to Program' : 'Previous Step'}
                    </button>

                    {/* Exit Link (Direct Exit) */}
                    {currentStep > 0 && (
                        <button 
                            onClick={() => navigate('/web/events')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                        >
                            <span style={{ textDecoration: 'underline' }}>Back to All Programs</span>
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>

                <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)' }}>{program?.programName}</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Event Registration Wizard</p>
                </header>

                {/* Progress Bar */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        <span>Step {currentStep + 1} of {totalSteps + 1}</span>
                        <span>{Math.round(((currentStep + 1) / (totalSteps + 1)) * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${((currentStep + 1) / (totalSteps + 1)) * 100}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                    </div>
                </div>

                <div className="card" style={{ padding: '2rem', borderRadius: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
                    {currentStep === 0 && (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Number of Participants</label>
                                <select 
                                    value={participantCount} 
                                    onChange={(e) => setParticipantCount(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                >
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Place (Coming From)</label>
                                <input 
                                    type="text" 
                                    value={place} 
                                    onChange={(e) => setPlace(e.target.value)} 
                                    placeholder="e.g. Chennai"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }}
                                />
                            </div>
                        </div>
                    )}

                    {currentStep > 0 && currentStep <= participants.length && (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Participant {currentStep} Details</h3>
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" value={participants[currentStep-1].name} onChange={(e) => handleParticipantChange(currentStep-1, 'name', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                            </div>
                            <div className="form-group">
                                <label>Mobile</label>
                                <input type="tel" value={participants[currentStep-1].mobile} onChange={(e) => handleParticipantChange(currentStep-1, 'mobile', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                            </div>
                            <div className="form-group">
                                <label>Age</label>
                                <input type="number" value={participants[currentStep-1].age} onChange={(e) => handleParticipantChange(currentStep-1, 'age', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
                            </div>
                        </div>
                    )}

                    {currentStep === participants.length + 1 && program?.additionalOptions?.length > 0 && (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Additional Options</h3>
                            {program.additionalOptions.map((opt, i) => (
                                <div key={i} onClick={() => toggleOption(opt)} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '0.75rem', cursor: 'pointer', backgroundColor: selectedOptions.some(o => o.name === opt.name) ? 'var(--color-primary-transparent)' : 'var(--color-card)' }}>
                                    <div style={{ fontWeight: 700 }}>{opt.name}</div>
                                    <div style={{ color: 'var(--color-primary)', fontWeight: 800 }}>₹{opt.fee}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {currentStep === totalSteps && (
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Review & Pay</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)' }}>₹{calculateTotal()}</div>
                            <p style={{ color: 'var(--color-text-muted)' }}>For {participants.length} Participant(s)</p>
                        </div>
                    )}

                    <button 
                        onClick={handleNext} 
                        style={{ marginTop: '2rem', width: '100%', padding: '1rem', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.75rem', fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                        {currentStep === totalSteps ? 'Confirm & Proceed' : 'Next Step'}
                    </button>

                    <button 
                        onClick={() => navigate('/web/events')}
                        style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'underline' }}
                    >
                        Cancel & Return to Events
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebEventRegistration;
