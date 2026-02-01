import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp, Package, ChevronLeft, MapPin } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db, auth } from '../firebase';
import '../components/RegistrationStyles.css';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
// Removed storage imports as we are using Base64 in Firestore
// Removed storage imports as we are using Base664 in Firestore
import { tamilnaduCities } from '../data/tamilnaduCities';
import { TransactionService } from '../services/TransactionService';
import { StatsService } from '../services/StatsService';
import { increment as firestoreIncrement } from 'firebase/firestore';
import { useUnseenCounts } from '../hooks/useUnseenCounts';
import { getLocalDateString } from '../utils/dateUtils';

// Helper to compress image to Base64
// Helper to compress image to Base64
import { compressImage } from '../utils/imageUtils';

// Removed hardcoded PROGRAM_TYPES

const CITIES = ['Salem', 'Chennai', 'Others'];

const SALEM_VENUE = "Sri Bagavath Bhavan, Kodambakkadu, Periyakoundapuram, Karippatti, Salem, Tamil Nadu 636106";

const ProgramManagement = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            try {
                await GoogleAuth.signOut();
                try {
                    await GoogleAuth.disconnect();
                } catch (dErr) {
                    console.warn("Disconnect failed:", dErr);
                }
            } catch (e) {
                console.warn("Google SignOut Error", e);
            }
            await signOut(auth);
            navigate('/');
        }
    };
    const [searchParams, setSearchParams] = useSearchParams();
    const counts = useUnseenCounts();
    const [programs, setPrograms] = useState([]);
    const [programTypes, setProgramTypes] = useState([]);
    const [bannerImage, setBannerImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const action = searchParams.get('action');
    const editingId = searchParams.get('id');
    const showForm = action === 'add' || action === 'edit';
    const editingProgram = action === 'edit' ? programs.find(p => p.id === editingId) : null;

    const [loading, setLoading] = useState(true);
    const [citySearch, setCitySearch] = useState('');
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'history'

    const [formData, setFormData] = useState({
        programName: '',
        customProgramName: '',
        programDate: '',
        programEndDate: '',
        programDescription: '',
        programCity: '',
        customCity: '',
        programVenue: '',
        registrationStatus: 'Open',
        lastDateToRegister: '',
        programBanner: '',
        maxParticipants: '',
        programFee: '',
        isConsentNeeded: 'N',
        consentText: '',

        consentQuestion: '',
        additionalOptions: []
    });

    // Load programs from Firebase when tab changes
    useEffect(() => {
        loadPrograms();
        loadProgramTypes();
    }, [activeTab]);

    useEffect(() => {
        if (editingProgram) {
            const isOtherCity = !CITIES.slice(0, 2).includes(editingProgram.programCity);
            // Find if it's one of the known types or 'Others'
            const isKnownType = programTypes.some(t => t.name === editingProgram.programName);

            setFormData({
                programName: isKnownType ? editingProgram.programName : 'Others',
                customProgramName: !isKnownType ? editingProgram.programName : '',
                programDate: editingProgram.programDate,
                programEndDate: editingProgram.programEndDate || '',
                programDescription: editingProgram.programDescription || '',
                programCity: isOtherCity ? 'Others' : editingProgram.programCity,
                customCity: isOtherCity ? editingProgram.programCity : '',
                programVenue: editingProgram.programVenue,
                registrationStatus: editingProgram.registrationStatus,
                lastDateToRegister: editingProgram.lastDateToRegister,
                programBanner: editingProgram.programBanner || '',
                maxParticipants: editingProgram.maxParticipants || '',
                programFee: editingProgram.programFee || '',
                isConsentNeeded: editingProgram.isConsentNeeded || 'N',
                consentText: editingProgram.consentText || '',

                consentQuestion: editingProgram.consentQuestion || '',
                additionalOptions: editingProgram.additionalOptions || []
            });

            if (isOtherCity) {
                setCitySearch(editingProgram.programCity);
            }

            // Fetch separate banner if inline one is missing and hasBanner is true
            if (!editingProgram.programBanner && editingProgram.hasBanner) {
                const fetchBanner = async () => {
                    try {
                        const { getDoc, doc } = await import('firebase/firestore');
                        const snap = await getDoc(doc(db, 'program_banners', editingProgram.id));
                        if (snap.exists()) {
                            setFormData(prev => ({ ...prev, programBanner: snap.data().banner }));
                        }
                    } catch (e) {
                        console.error("Edit mode banner fetch failed", e);
                    }
                };
                fetchBanner();
            }
        }
    }, [editingProgram, action, programTypes]);

    // Close city suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const cityInput = document.querySelector('[data-city-input]');
            const citySuggestions = document.querySelector('[data-city-suggestions]');

            if (cityInput && citySuggestions &&
                !cityInput.contains(event.target) &&
                !citySuggestions.contains(event.target)) {
                setShowCitySuggestions(false);
            }
        };

        const handleFocusIn = (e) => {
            const cityInput = document.querySelector('[data-city-input]');
            const citySuggestions = document.querySelector('[data-city-suggestions]');
            if (cityInput && citySuggestions &&
                !cityInput.contains(e.target) &&
                !citySuggestions.contains(e.target)) {
                setShowCitySuggestions(false);
            }
        };

        if (showCitySuggestions) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('focusin', handleFocusIn);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('focusin', handleFocusIn);
        };
    }, [showCitySuggestions]);

    const loadPrograms = async () => {
        try {
            setLoading(true);
            const today = getLocalDateString();
            const programsRef = collection(db, 'programs');
            let q;

            if (activeTab === 'upcoming') {
                q = query(
                    programsRef,
                    where('programDate', '>=', today),
                    orderBy('programDate', 'asc')
                );
            } else {
                q = query(
                    programsRef,
                    where('programDate', '<', today),
                    orderBy('programDate', 'desc'),
                    limit(10)
                );
            }

            const querySnapshot = await getDocs(q);
            const loadedPrograms = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sort fallback if needed, but Firestore orderBy should handle it.
            setPrograms(loadedPrograms);
        } catch (error) {
            console.error('Error loading programs:', error);
            // It's possible an index is missing for compound queries. 
            // If so, Firebase console will provide a link to create it.
            // For now, assume it works or we'll catch it in testing.
        } finally {
            setLoading(false);
        }
    };

    const loadProgramTypes = async () => {
        try {
            const typesRef = collection(db, 'programTypes');
            const q = query(typesRef, orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            const loadedTypes = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProgramTypes(loadedTypes);
        } catch (error) {
            console.error('Error loading program types:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };

            if (name === 'programName') {
                if (value !== 'Others') {
                    updates.customProgramName = '';
                    // Auto-fill defaults from selected program type
                    const selectedType = programTypes.find(t => t.name === value);
                    if (selectedType) {
                        updates.maxParticipants = selectedType.maxParticipants || '';
                        updates.programFee = selectedType.programFee || '';
                        updates.isConsentNeeded = selectedType.isConsentNeeded || 'N';
                        updates.consentText = selectedType.consentText || '';

                        updates.consentQuestion = selectedType.consentQuestion || '';
                        updates.additionalOptions = selectedType.additionalOptions || [];
                    }
                }
            }

            if (name === 'programCity') {
                if (value === 'Salem') {
                    updates.programVenue = SALEM_VENUE;
                } else if (value !== 'Others') {
                    updates.programVenue = '';
                }
                if (value !== 'Others') {
                    updates.customCity = '';
                    setCitySearch('');
                }
            }

            return { ...prev, ...updates };
        });
    };

    const handleCitySearch = (value) => {
        setCitySearch(value);
        setFormData(prev => ({ ...prev, customCity: value }));
        setShowCitySuggestions(true);
    };

    const selectCity = (city) => {
        setCitySearch(city);
        setFormData(prev => ({ ...prev, customCity: city }));
        setShowCitySuggestions(false);
    };

    const filteredCities = tamilnaduCities.filter(city =>
        city.toLowerCase().includes(citySearch.toLowerCase())
    );

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBannerImage(file);
            alert(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        } else {
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let bannerUrl = formData.programBanner;

            if (bannerImage) {
                // alert("Compressing image...");
                if (bannerImage) {
                    // alert("Compressing image...");
                    try {
                        // Compress and get Base64 string
                        bannerUrl = await compressImage(bannerImage);
                        // alert("Image processed! Size: " + Math.round(bannerUrl.length * 0.75 / 1024) + "KB");
                    } catch (compressError) {
                        console.error("Compression failed:", compressError);
                        alert("Image processing failed: " + compressError.message);
                        throw compressError; // Stop submission
                    }
                }
            } else {
            }

            const programData = {
                programName: formData.programName === 'Others' ? formData.customProgramName : formData.programName,
                programDate: formData.programDate,
                programEndDate: formData.programEndDate,
                programDescription: formData.programDescription,
                programCity: formData.programCity === 'Others' ? formData.customCity : formData.programCity,
                programVenue: formData.programVenue,
                registrationStatus: formData.registrationStatus,
                lastDateToRegister: formData.lastDateToRegister,
                // programBanner: bannerUrl, // Moved to separate collection
                hasBanner: !!bannerUrl,
                maxParticipants: formData.maxParticipants,
                programFee: formData.programFee || '0',
                isConsentNeeded: formData.isConsentNeeded || 'N',
                consentText: formData.consentText || '',

                consentQuestion: formData.consentQuestion || '',
                additionalOptions: formData.additionalOptions || [],
                createdAt: new Date().toISOString()
            };

            let programId;
            if (editingProgram) {
                programId = editingProgram.id;
                await updateDoc(doc(db, 'programs', programId), programData);
                alert('Program updated successfully!');
            } else {
                const docRef = await addDoc(collection(db, 'programs'), programData);
                programId = docRef.id;
                alert('Program added successfully!');
                // Update Program Stats
                StatsService.recordProgram().catch(() => { });
            }

            // Save Banner separately if present
            if (bannerImage && bannerUrl) {
                await setDoc(doc(db, 'program_banners', programId), {
                    banner: bannerUrl,
                    updatedAt: new Date().toISOString()
                });
                // Update Image Stats
                const sizeInBytes = bannerUrl.length * 0.75;
                StatsService.recordImage(sizeInBytes, 'BANNER').catch(() => { });
            }
            setSearchParams({}, { replace: true });
            setBannerImage(null);
            loadPrograms();

            // Refresh metadata for notifications
            await setDoc(doc(db, 'system', 'metadata'), {
                lastUpdated_programs: serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error('Error saving program:', error);
            alert('Error saving program: ' + error.message);
        } finally {
            setUploading(false);
        }
    };



    const handleDelete = async (programId) => {
        try {
            const hasRegs = await TransactionService.hasRegistrationsForProgram(programId);
            if (hasRegs) {
                alert('Delete all registration pointing to this program before deleting this program');
                return;
            }

            if (window.confirm('Are you sure you want to delete this program?')) {
                await deleteDoc(doc(db, 'programs', programId));
                // Also delete banner if exists
                await deleteDoc(doc(db, 'program_banners', programId)).catch(() => { });
                // Update Stats
                StatsService.recordProgram(false).catch(() => { });
                alert('Program deleted successfully!');

                // Refresh metadata for notifications
                await setDoc(doc(db, 'system', 'metadata'), {
                    lastUpdated_programs: serverTimestamp()
                }, { merge: true });
                loadPrograms();
            }
        } catch (error) {
            console.error('Error deleting program:', error);
            alert('Error deleting program: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            programName: '',
            customProgramName: '',
            programDate: '',
            programEndDate: '',
            programDescription: '',
            programCity: '',
            customCity: '',
            programVenue: '',
            registrationStatus: 'Open',
            lastDateToRegister: '',
            programBanner: '',
            maxParticipants: '',
            programFee: '',
            isConsentNeeded: 'N',
            consentText: '',

            consentQuestion: '',
            additionalOptions: []
        });

        setBannerImage(null);
        setCitySearch('');
        setSearchParams({}, { replace: true });
    };

    const ProgramCard = ({ program }) => (
        <div
            onClick={() => setSearchParams({ action: 'edit', id: program.id })}
            style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                padding: '1.25rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                border: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                cursor: 'pointer'
            }}
        >
            {/* Left Column: Date Box */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                flexShrink: 0
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>
                        {new Date(program.programDate).toLocaleString('default', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#9a3412', lineHeight: 1 }}>
                        {new Date(program.programDate).getDate()}
                    </span>
                </div>
            </div>

            {/* Right Column: Content */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                flex: 1,
                minWidth: 0
            }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#000000', margin: 0 }}>
                    {program.programName}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
                    <MapPin size={14} style={{ marginRight: '0.375rem' }} />
                    <span style={{ fontWeight: 500 }}>{program.programCity}</span>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>Loading programs...</p>
            </div>
        );
    }

    // ... imports

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: 'var(--color-surface)',
                // removed padding: '1.5rem' to allow header full width, restore for content
            }}
        >
            <PageHeader
                title="Program Management"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />
            <div style={{ padding: '1.5rem' }}>
                <div style={{ maxWidth: '64rem', margin: '0 auto' }}>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '2rem',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            marginBottom: '1.5rem'
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                marginBottom: '2rem',
                                gap: '0.75rem'
                            }}
                        >
                            {/* Title removed, usage PageHeader outside */}

                            {/* Tabs */}
                            {!showForm && (
                                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                                    <button
                                        onClick={() => setActiveTab('upcoming')}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: activeTab === 'upcoming' ? '2px solid var(--color-primary)' : 'none',
                                            color: activeTab === 'upcoming' ? 'var(--color-primary)' : '#6b7280',
                                            fontWeight: activeTab === 'upcoming' ? 600 : 500,
                                            background: 'none',
                                            borderTop: 'none',
                                            borderLeft: 'none',
                                            borderRight: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Upcoming
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : 'none',
                                            color: activeTab === 'history' ? 'var(--color-primary)' : '#6b7280',
                                            fontWeight: activeTab === 'history' ? 600 : 500,
                                            background: 'none',
                                            borderTop: 'none',
                                            borderLeft: 'none',
                                            borderRight: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        History
                                    </button>
                                </div>
                            )}
                            {!showForm && activeTab === 'upcoming' && (
                                <button
                                    onClick={() => setSearchParams({ action: 'add' })}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.5rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '0.5rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        border: 'none',
                                        width: '100%'
                                    }}
                                >
                                    <Plus size={20} />
                                    Add Program
                                </button>
                            )}
                        </div>

                        {showForm ? (
                            <form
                                onSubmit={handleSubmit}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                                    {editingProgram ? 'Edit Program' : 'Add New Program'}
                                </h2>

                                {/* Program Name */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Program Name *
                                    </label>
                                    <select
                                        name="programName"
                                        value={formData.programName}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        <option value="">Select Program Type</option>
                                        {programTypes.map(type => (
                                            <option key={type.id} value={type.name}>
                                                {type.name}
                                            </option>
                                        ))}
                                        <option value="Others">Others</option>
                                    </select>
                                </div>

                                {/* Custom Program Name (if Others) */}
                                {formData.programName === 'Others' && (
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: 500,
                                                color: '#374151'
                                            }}
                                        >
                                            Enter Program Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="customProgramName"
                                            value={formData.customProgramName}
                                            onChange={handleInputChange}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                fontSize: '1rem',
                                                position: 'relative',
                                                zIndex: 1
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Program Date Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: 500,
                                                color: '#374151'
                                            }}
                                        >
                                            From *
                                        </label>
                                        <input
                                            type="date"
                                            name="programDate"
                                            value={formData.programDate}
                                            onChange={handleInputChange}
                                            onFocus={() => setShowCitySuggestions(false)}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                fontSize: '1rem',
                                                position: 'relative',
                                                zIndex: 1
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: 500,
                                                color: '#374151'
                                            }}
                                        >
                                            To
                                        </label>
                                        <input
                                            type="date"
                                            name="programEndDate"
                                            value={formData.programEndDate}
                                            onChange={handleInputChange}
                                            onFocus={() => setShowCitySuggestions(false)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                fontSize: '1rem',
                                                position: 'relative',
                                                zIndex: 1
                                            }}
                                        />
                                    </div>
                                </div>


                                {/* Program City */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Program City *
                                    </label>
                                    <select
                                        name="programCity"
                                        value={formData.programCity}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        <option value="">Select City</option>
                                        {CITIES.map(city => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Custom City (if Others) */}
                                {formData.programCity === 'Others' && (
                                    <div style={{ position: 'relative' }}>
                                        <label
                                            style={{
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: 500,
                                                color: '#374151'
                                            }}
                                        >
                                            Enter City Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="customCity"
                                            value={citySearch}
                                            onChange={(e) => handleCitySearch(e.target.value)}
                                            onFocus={() => setShowCitySuggestions(true)}
                                            data-city-input
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                fontSize: '1rem',
                                                position: 'relative',
                                                zIndex: 1
                                            }}
                                        />
                                        {showCitySuggestions && citySearch && filteredCities.length > 0 && (
                                            <div
                                                data-city-suggestions
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.5rem',
                                                    marginTop: '0.25rem',
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    zIndex: 10,
                                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                }}
                                            >
                                                {filteredCities.map((city, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => selectCity(city)}
                                                        style={{
                                                            padding: '0.75rem',
                                                            cursor: 'pointer',
                                                            ':hover': { backgroundColor: '#f3f4f6' }
                                                        }}
                                                    >
                                                        {city}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Program Venue (readonly if Salem) */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Program Venue *
                                    </label>
                                    <textarea
                                        name="programVenue"
                                        value={formData.programVenue}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        readOnly={formData.programCity === 'Salem'}
                                        required
                                        rows="3"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1,
                                            backgroundColor: formData.programCity === 'Salem' ? '#f3f4f6' : 'white'
                                        }}
                                    />
                                </div>

                                {/* Program Banner */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                        Program Banner
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.5rem',
                                            background: 'white'
                                        }}
                                    />
                                    {(bannerImage || formData.programBanner) && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                                                {bannerImage ? 'New Banner Preview:' : 'Current Banner:'}
                                            </div>
                                            <img
                                                src={bannerImage ? URL.createObjectURL(bannerImage) : formData.programBanner}
                                                alt="Banner preview"
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '200px',
                                                    objectFit: 'contain',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #e5e7eb'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Program Description */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Description
                                    </label>
                                    <textarea
                                        name="programDescription"
                                        value={formData.programDescription}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        rows="5"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    />
                                </div>

                                {/* Registration Status */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Registration Status *
                                    </label>
                                    <select
                                        name="registrationStatus"
                                        value={formData.registrationStatus}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Closed">Closed</option>
                                        <option value="Fast Filling">Fast Filling</option>
                                    </select>
                                </div>

                                {/* Last Date to Register */}
                                <div>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.5rem',
                                            fontWeight: 500,
                                            color: '#374151'
                                        }}
                                    >
                                        Last Date to Register *
                                    </label>
                                    <input
                                        type="date"
                                        name="lastDateToRegister"
                                        value={formData.lastDateToRegister}
                                        onChange={handleInputChange}
                                        onFocus={() => setShowCitySuggestions(false)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            fontSize: '1rem',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    />
                                </div>

                                {/* Participant Counts & Fees */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Max Participants
                                        </label>
                                        <input
                                            type="number"
                                            name="maxParticipants"
                                            value={formData.maxParticipants}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Program Fee (₹)
                                        </label>
                                        <input
                                            type="number"
                                            name="programFee"
                                            value={formData.programFee}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 500, color: '#374151' }}>Is Consent Needed?</label>
                                        <select
                                            name="isConsentNeeded"
                                            value={formData.isConsentNeeded}
                                            onChange={handleInputChange}
                                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%', backgroundColor: 'white' }}
                                        >
                                            <option value="N">No</option>
                                            <option value="Y">Yes</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.isConsentNeeded === 'Y' && (
                                    <>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <label style={{ fontWeight: 500, color: '#374151' }}>Consent Screen Text</label>
                                            <textarea
                                                name="consentText"
                                                className="consent-text-container"
                                                value={formData.consentText}
                                                onChange={handleInputChange}
                                                placeholder="Detailed consent information..."
                                                rows={4}
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            <label style={{ fontWeight: 500, color: '#374151' }}>Consent Question</label>
                                            <input
                                                type="text"
                                                name="consentQuestion"
                                                value={formData.consentQuestion}
                                                onChange={handleInputChange}
                                                placeholder="e.g., Do you agree to the above terms?"
                                                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                            />
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                    <label style={{ fontWeight: 500, color: '#374151' }}>Additional Options (e.g., Special Puja, Food)</label>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '-0.5rem' }}>
                                        These options will be available for selection during registration.
                                    </p>
                                    {formData.additionalOptions.map((option, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Option Name</label>
                                                <input
                                                    type="text"
                                                    value={option.name}
                                                    onChange={(e) => {
                                                        const updated = [...formData.additionalOptions];
                                                        updated[index].name = e.target.value;
                                                        setFormData(prev => ({ ...prev, additionalOptions: updated }));
                                                    }}
                                                    placeholder="e.g. Special Puja"
                                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Fee (₹)</label>
                                                <input
                                                    type="number"
                                                    value={option.fee}
                                                    onChange={(e) => {
                                                        const updated = [...formData.additionalOptions];
                                                        updated[index].fee = e.target.value;
                                                        setFormData(prev => ({ ...prev, additionalOptions: updated }));
                                                    }}
                                                    placeholder="0"
                                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.75rem', color: '#6b7280' }}>Max Count</label>
                                                <input
                                                    type="number"
                                                    value={option.maxCount}
                                                    onChange={(e) => {
                                                        const updated = [...formData.additionalOptions];
                                                        updated[index].maxCount = e.target.value;
                                                        setFormData(prev => ({ ...prev, additionalOptions: updated }));
                                                    }}
                                                    placeholder="Optional"
                                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = formData.additionalOptions.filter((_, i) => i !== index);
                                                    setFormData(prev => ({ ...prev, additionalOptions: updated }));
                                                }}
                                                style={{ padding: '0.5rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                            ...prev,
                                            additionalOptions: [...prev.additionalOptions, { id: Date.now(), name: '', fee: '', maxCount: '' }]
                                        }))}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            color: 'var(--color-primary)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <Plus size={16} /> Add Option
                                    </button>
                                </div>

                                {/* Form Actions */}
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: 'none'
                                        }}
                                    >
                                        {editingProgram ? 'Update Program' : 'Add Program'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.5rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {editingProgram && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(editingProgram.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#dc2626',
                                                    borderRadius: '0.5rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    border: '1px solid #fecaca',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <Trash2 size={18} />
                                                Delete Program
                                            </button>

                                            {activeTab === 'history' && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (confirm("Move this program to Storage?")) {
                                                            setLoading(true);
                                                            try {
                                                                await TransactionService.archiveProgram(editingProgram.id);
                                                                await setDoc(doc(db, 'system', 'metadata'), {
                                                                    lastUpdated_programs: serverTimestamp()
                                                                }, { merge: true });
                                                                alert("Program moved to storage successfully");
                                                                resetForm();
                                                                loadPrograms();
                                                            } catch (e) {
                                                                alert("Archive Failed: " + e.message);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.75rem',
                                                        backgroundColor: '#eef2ff',
                                                        color: '#4f46e5',
                                                        borderRadius: '0.5rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        border: '1px solid #e0e7ff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem'
                                                    }}
                                                >
                                                    <Package size={18} />
                                                    Move to Storage
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '-0.5rem', fontWeight: 500 }}>
                                    Click program card to edit
                                </p>
                                {programs.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '3rem',
                                            color: '#6b7280',
                                            backgroundColor: '#f9fafb',
                                            borderRadius: '0.75rem',
                                            border: '1px dashed #d1d5db'
                                        }}
                                    >
                                        <p>No {activeTab} programs found.</p>
                                    </div>
                                ) : (
                                    programs.map(program => (
                                        <ProgramCard key={program.id} program={program} />
                                    ))
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ProgramManagement;
