import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Save, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, setDoc } from 'firebase/firestore';

import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const ProgramTypesManagement = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (confirm("Logout?")) {
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
        ladiesMaxDorm: '',
        gentsMaxDorm: '',
        roomMax: '',
        roomFees: '',
        dormFees: ''
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
            ladiesMaxDorm: '',
            gentsMaxDorm: '',
            roomMax: '',
            roomFees: '',
            dormFees: ''
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
            ladiesMaxDorm: type.ladiesMaxDorm || '',
            gentsMaxDorm: type.gentsMaxDorm || '',
            roomMax: type.roomMax || '',
            roomFees: type.roomFees || '',
            dormFees: type.dormFees || ''
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
                rightAction={
                    <button onClick={handleLogout} className="btn-icon" style={{ background: 'none', border: 'none', color: '#dc2626' }}>
                        <LogOut size={20} />
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
                                    <label style={{ fontWeight: 500 }}>Room Max</label>
                                    <input
                                        type="number"
                                        name="roomMax"
                                        value={formData.roomMax}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Ladies Max Dorm</label>
                                    <input
                                        type="number"
                                        name="ladiesMaxDorm"
                                        value={formData.ladiesMaxDorm}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Gents Max Dorm</label>
                                    <input
                                        type="number"
                                        name="gentsMaxDorm"
                                        value={formData.gentsMaxDorm}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Room Fees</label>
                                    <input
                                        type="number"
                                        name="roomFees"
                                        value={formData.roomFees}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500 }}>Dorm Fees</label>
                                    <input
                                        type="number"
                                        name="dormFees"
                                        value={formData.dormFees}
                                        onChange={handleInputChange}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    type="submit"
                                    style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Save size={18} />
                                    {isEditing ? 'Update Type' : 'Add Type'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <X size={18} />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Existing Types</h2>
                            {types.map((type, index) => (
                                <div
                                    key={type.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #e5e7eb',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ChevronUp size={20} /></button>
                                        <button onClick={() => moveItem(index, 1)} disabled={index === types.length - 1} style={{ border: 'none', background: 'none', cursor: index === types.length - 1 ? 'default' : 'pointer', opacity: index === types.length - 1 ? 0.3 : 1 }}><ChevronDown size={20} /></button>
                                    </div>

                                    <div style={{ flex: 1, display: 'grid', gap: '0.25rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{type.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#6b7280', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <span>Part: {type.maxParticipants || '-'}</span>
                                            <span>R.Max: {type.roomMax || '-'}</span>
                                            <span>L.Dorm: {type.ladiesMaxDorm || '-'}</span>
                                            <span>G.Dorm: {type.gentsMaxDorm || '-'}</span>
                                            <span>R.Fee: {type.roomFees || '-'}</span>
                                            <span>D.Fee: {type.dormFees || '-'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleEdit(type)}
                                            style={{ padding: '0.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(type.id)}
                                            style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProgramTypesManagement;
