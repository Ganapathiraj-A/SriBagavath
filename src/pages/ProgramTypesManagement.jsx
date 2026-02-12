import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, GripVertical, ChevronUp, ChevronDown, ChevronLeft } from 'lucide-react';
import { db, auth } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, setDoc } from '@/utils/FirestoreProxy';
import { signOut } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { LogOut } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import '../components/RegistrationStyles.css';

const ProgramTypesManagement = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            if (Capacitor.isNativePlatform()) {
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
            }
            await signOut(auth);
            navigate('/');
        }
    };
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        maxParticipants: '',
        programFee: '',
        isConsentNeeded: 'N',
        consentText: '',

        consentQuestion: '',
        additionalOptions: []
    });

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            setLoading(true);
            const typesRef = collection(db, 'programTypes');
            const q = query(typesRef, orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);
            const loadedTypes = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTypes(loadedTypes);
        } catch (error) {
            console.error('Error loading program types:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            maxParticipants: '',
            programFee: '',
            isConsentNeeded: 'N',
            consentText: '',

            consentQuestion: '',
            additionalOptions: []
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'programTypes', editingId), formData);
                alert('Program Type updated successfully!');
            } else {
                const newOrder = types.length > 0 ? Math.max(...types.map(t => t.order || 0)) + 1 : 0;
                await addDoc(collection(db, 'programTypes'), {
                    ...formData,
                    order: newOrder
                });
                alert('Program Type added successfully!');
            }
            resetForm();
            loadTypes();
        } catch (error) {
            console.error('Error saving program type:', error);
            alert('Error saving program type: ' + error.message);
        }
    };

    const handleEdit = (type) => {
        setFormData({
            name: type.name || '',
            maxParticipants: type.maxParticipants || '',
            programFee: type.programFee || '',
            isConsentNeeded: type.isConsentNeeded || 'N',
            consentText: type.consentText || '',

            consentQuestion: type.consentQuestion || '',
            additionalOptions: type.additionalOptions || []
        });
        setEditingId(type.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this program type?')) {
            try {
                await deleteDoc(doc(db, 'programTypes', id));
                loadTypes();
            } catch (error) {
                console.error('Error deleting program type:', error);
                alert('Error deleting: ' + error.message);
            }
        }
    };

    const handleReorder = async (newOrder) => {
        setTypes(newOrder); // Optimistic update
        try {
            const updates = newOrder.map((type, index) =>
                updateDoc(doc(db, 'programTypes', type.id), { order: index })
            );
            await Promise.all(updates);
        } catch (error) {
            console.error('Error reordering types:', error);
            loadTypes(); // Revert on error
        }
    };

    const moveItem = (index, direction) => {
        const newTypes = [...types];
        const item = newTypes[index];
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < newTypes.length) {
            newTypes[index] = newTypes[targetIndex];
            newTypes[targetIndex] = item;
            handleReorder(newTypes);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
            <PageHeader
                title="Program Types"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />
            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', marginBottom: '2rem' }}>
                        {/* Title handled by PageHeader */}

                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '0.75rem' }}>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 500 }}>Program Type Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Max Participants</label>
                                    <input
                                        type="number"
                                        name="maxParticipants"
                                        value={formData.maxParticipants}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Program Fee (₹)</label>
                                    <input
                                        type="number"
                                        name="programFee"
                                        value={formData.programFee}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Is Consent Needed?</label>
                                    <select
                                        name="isConsentNeeded"
                                        value={formData.isConsentNeeded}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    >
                                        <option value="N">No</option>
                                        <option value="Y">Yes</option>
                                    </select>
                                </div>
                            </div>

                            {formData.isConsentNeeded === 'Y' && (
                                <>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <label style={{ fontWeight: 500 }}>Consent Screen Text</label>
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
                                        <label style={{ fontWeight: 500 }}>Consent Question</label>
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
                                <label style={{ fontWeight: 500 }}>Additional Options (e.g., Special Accommodation, Food)</label>
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
                                                placeholder="e.g. Special Accommodation"
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="submit"
                                        style={{ flex: 2, padding: '0.75rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Save size={18} />
                                        {isEditing ? 'Update Type' : 'Add Type'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            style={{ flex: 1, padding: '0.75rem', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            <X size={18} />
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(editingId)}
                                        style={{
                                            width: '100%',
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
                                        Delete Program Type
                                    </button>
                                )}
                            </div>
                        </form>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#000000', marginBottom: '0.5rem' }}>Existing Types</h2>
                            {!isEditing && (
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 500 }}>
                                    Click program type to edit
                                </p>
                            )}
                            {types.map((type, index) => (
                                <div
                                    key={type.id}
                                    onClick={() => handleEdit(type)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1.25rem',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '1rem',
                                        border: '1px solid #e5e7eb',
                                        gap: '1.25rem',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                                    }}
                                >
                                    <div
                                        style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ChevronUp size={20} /></button>
                                        <button onClick={() => moveItem(index, 1)} disabled={index === types.length - 1} style={{ border: 'none', background: 'none', cursor: index === types.length - 1 ? 'default' : 'pointer', opacity: index === types.length - 1 ? 0.3 : 1 }}><ChevronDown size={20} /></button>
                                    </div>

                                    <div style={{ flex: 1, display: 'grid', gap: '0.25rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{type.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <span>Max Participants: {type.maxParticipants || '-'}</span>
                                            <span>Fee: ₹{type.programFee || '0'}</span>
                                            {type.additionalOptions && type.additionalOptions.length > 0 && (
                                                <span style={{ color: 'var(--color-primary)', fontSize: '0.75rem', backgroundColor: '#eff6ff', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                                                    {type.additionalOptions.length} Options
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div >
        </div >
    );
};

export default ProgramTypesManagement;
