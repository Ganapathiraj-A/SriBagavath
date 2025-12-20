import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
// Removed storage imports as we are using Base64 in Firestore
// Removed storage imports as we are using Base664 in Firestore
import { tamilnaduCities } from '../data/tamilnaduCities';
import { TransactionService } from '../services/TransactionService';

// Helper to compress image to Base64
// Helper to compress image to Base64
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        // 1. Check for HEIC/HEIF which browsers often can't render in <img>/Canvas directly
        if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith('.heic')) {
            reject(new Error("HEIC format is not supported by the browser. Please use a standard JPEG or PNG image."));
            return;
        }

        const attemptLoad = (src, isBlob) => {
            const img = new Image();
            img.onload = () => {
                if (isBlob) URL.revokeObjectURL(src);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 800; // Increased slightly for better quality on tablets

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Adaptive Quality Reduction
                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const TARGET_SIZE = 350000; // 350KB target

                    while (dataUrl.length * 0.75 > TARGET_SIZE && quality > 0.3) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(dataUrl);
                } catch (e) {
                    reject(new Error("Image processing error: " + e.message));
                }
            };

            img.onerror = (e) => {
                if (isBlob) {
                    URL.revokeObjectURL(src);
                    console.warn("createObjectURL failed, falling back to FileReader...");
                    // Fallback to FileReader
                    const reader = new FileReader();
                    reader.onload = (re) => attemptLoad(re.target.result, false);
                    reader.onerror = (err) => reject(new Error("Failed to read file: " + err.message));
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error("Unable to load image. Only JPEG/PNG are supported. If using HEIC, please convert it first."));
                }
            };

            img.src = src;
        };

        // Start with createObjectURL for memory efficiency
        try {
            const objectUrl = URL.createObjectURL(file);
            attemptLoad(objectUrl, true);
        } catch (e) {
            // Immediate fallback if createObjectURL crashes (unlikely but possible)
            const reader = new FileReader();
            reader.onload = (re) => attemptLoad(re.target.result, false);
            reader.readAsDataURL(file);
        }
    });
};

// Removed hardcoded PROGRAM_TYPES

const CITIES = ['Salem', 'Chennai', 'Others'];

const SALEM_VENUE = "Sri Bagavath Bhavan, Kodambakkadu, Periyakoundapuram, Karippatti, Salem, Tamil Nadu 636106";

import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

const ProgramManagement = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            await signOut(auth);
            navigate('/');
        }
    };
    const [searchParams, setSearchParams] = useSearchParams();
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
        ladiesMaxDorm: '',
        gentsMaxDorm: '',
        roomMax: '',
        roomFees: '',
        dormFees: ''
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
            const isOtherProgram = !isKnownType && editingProgram.programName !== ""; // If empty, it's new, not other.

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
                ladiesMaxDorm: editingProgram.ladiesMaxDorm || '',
                gentsMaxDorm: editingProgram.gentsMaxDorm || '',
                roomMax: editingProgram.roomMax || '',
                roomFees: editingProgram.roomFees || '',
                dormFees: editingProgram.dormFees || ''
            });

            if (isOtherCity) {
                setCitySearch(editingProgram.programCity);
            }
        } else if (action === 'add') {
            // Reset form when switching to add mode (optional but good practice)
            // Actually resetForm is called on submit/cancel, so this might be redundant if coming from clean state, 
            // but if switching directly from edit to add it helps.
            // We'll leave it simple for now, relying on resetForm.
        }
    }, [editingProgram, action]);

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
            const today = new Date().toISOString().split('T')[0];
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
                        updates.ladiesMaxDorm = selectedType.ladiesMaxDorm || '';
                        updates.gentsMaxDorm = selectedType.gentsMaxDorm || '';
                        updates.roomMax = selectedType.roomMax || '';
                        updates.roomFees = selectedType.roomFees || '';
                        updates.dormFees = selectedType.dormFees || '';
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
                programBanner: bannerUrl,
                maxParticipants: formData.maxParticipants,
                ladiesMaxDorm: formData.ladiesMaxDorm,
                gentsMaxDorm: formData.gentsMaxDorm,
                roomMax: formData.roomMax,
                roomFees: formData.roomFees,
                dormFees: formData.dormFees,
                createdAt: new Date().toISOString()
            };

            if (editingProgram) {
                await updateDoc(doc(db, 'programs', editingProgram.id), programData);
                alert('Program updated successfully!');
            } else {
                await addDoc(collection(db, 'programs'), programData);
                alert('Program added successfully!');
            }

            resetForm();
            loadPrograms();
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
                alert('Program deleted successfully!');
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
            ladiesMaxDorm: '',
            gentsMaxDorm: '',
            roomMax: '',
            roomFees: '',
            dormFees: ''
        });

        setBannerImage(null);
        setCitySearch('');
        setSearchParams({});
    };

    const ProgramCard = ({ program }) => (
        <div
            style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                backgroundColor: '#f9fafb'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                        style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            color: '#111827',
                            marginBottom: '0.5rem'
                        }}
                    >
                        {program.programName}
                    </h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.75rem',
                            marginTop: '1rem'
                        }}
                    >
                        <div>
                            <span style={{ fontWeight: 500, color: '#6b7280' }}>Date: </span>
                            <span style={{ color: '#111827' }}>
                                {new Date(program.programDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <span style={{ fontWeight: 500, color: '#6b7280' }}>City: </span>
                            <span style={{ color: '#111827' }}>{program.programCity}</span>
                        </div>

                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignSelf: 'flex-start'
                    }}
                >
                    <button
                        onClick={() => setSearchParams({ action: 'edit', id: program.id })}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            border: 'none'
                        }}
                        title="Edit"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(program.id)}
                        style={{
                            padding: '0.5rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            border: 'none'
                        }}
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
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
                rightAction={
                    <button onClick={handleLogout} className="btn-icon" style={{ background: 'none', border: 'none', color: '#dc2626' }}>
                        <LogOut size={20} />
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
                                    {formData.programBanner && !bannerImage && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#059669' }}>
                                            Current Banner set
                                        </div>
                                    )}
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
                                            Room Max
                                        </label>
                                        <input
                                            type="number"
                                            name="roomMax"
                                            value={formData.roomMax}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Ladies Max Dorm
                                        </label>
                                        <input
                                            type="number"
                                            name="ladiesMaxDorm"
                                            value={formData.ladiesMaxDorm}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Gents Max Dorm
                                        </label>
                                        <input
                                            type="number"
                                            name="gentsMaxDorm"
                                            value={formData.gentsMaxDorm}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Room Fees
                                        </label>
                                        <input
                                            type="number"
                                            name="roomFees"
                                            value={formData.roomFees}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                            Dorm Fees
                                        </label>
                                        <input
                                            type="number"
                                            name="dormFees"
                                            value={formData.dormFees}
                                            onChange={handleInputChange}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
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
                            </form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
