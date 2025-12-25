import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, Save, X, ChevronUp, ChevronDown, ChevronLeft, User, Phone
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';

const ConsultationManagement = () => {
    const navigate = useNavigate();
    const [consultants, setConsultants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        number: ''
    });

    useEffect(() => {
        loadConsultants();
    }, []);

    const loadConsultants = async () => {
        try {
            setLoading(true);
            const ref = collection(db, 'consultants');
            const q = query(ref, orderBy('order', 'asc'));
            const snap = await getDocs(q);
            setConsultants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error loading consultants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({ name: '', number: '' });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateDoc(doc(db, 'consultants', editingId), formData);
                alert('Consultant updated!');
            } else {
                const newOrder = consultants.length > 0 ? Math.max(...consultants.map(t => t.order || 0)) + 1 : 0;
                await addDoc(collection(db, 'consultants'), {
                    ...formData,
                    order: newOrder
                });
                alert('Consultant added!');
            }
            resetForm();
            loadConsultants();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleEdit = (c) => {
        setFormData({ name: c.name || '', number: c.number || '' });
        setEditingId(c.id);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this consultant?')) {
            try {
                await deleteDoc(doc(db, 'consultants', id));
                loadConsultants();
            } catch (error) {
                alert('Error deleting: ' + error.message);
            }
        }
    };

    const handleReorder = async (newList) => {
        setConsultants(newList);
        try {
            const updates = newList.map((item, index) =>
                updateDoc(doc(db, 'consultants', item.id), { order: index })
            );
            await Promise.all(updates);
        } catch (error) {
            console.error('Error reordering:', error);
            loadConsultants();
        }
    };

    const moveItem = (index, direction) => {
        const newList = [...consultants];
        const item = newList[index];
        const targetIndex = index + direction;

        if (targetIndex >= 0 && targetIndex < newList.length) {
            newList[index] = newList[targetIndex];
            newList[targetIndex] = item;
            handleReorder(newList);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <PageHeader
                title="Manage Consultation"
                leftAction={
                    <button onClick={() => navigate('/admin/program-management')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', marginBottom: '2rem' }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', border: '1px solid #fed7aa' }}>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: '#9a3412' }}>
                                    <User size={16} /> Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Teacher Name"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fed7aa', width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: '#9a3412' }}>
                                    <Phone size={16} /> Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="number"
                                    value={formData.number}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="9876543210"
                                    style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fed7aa', width: '100%' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '0.875rem', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Save size={18} />
                                    {isEditing ? 'Update Consultant' : 'Add Consultant'}
                                </button>
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        style={{ padding: '0.875rem', backgroundColor: '#d1d5db', color: '#4b5563', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        </form>

                        <div style={{ marginTop: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#374151', marginBottom: '1rem' }}>Teacher Contacts</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {consultants.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No teacher contacts added yet.</p>
                                ) : (
                                    consultants.map((c, index) => (
                                        <motion.div
                                            key={c.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '1rem',
                                                backgroundColor: '#f9fafb',
                                                borderRadius: '0.75rem',
                                                border: '1px solid #e5e7eb',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <button onClick={() => moveItem(index, -1)} disabled={index === 0} style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, color: '#f97316' }}><ChevronUp size={20} /></button>
                                                <button onClick={() => moveItem(index, 1)} disabled={index === consultants.length - 1} style={{ border: 'none', background: 'none', cursor: index === consultants.length - 1 ? 'default' : 'pointer', opacity: index === consultants.length - 1 ? 0.3 : 1, color: '#f97316' }}><ChevronDown size={20} /></button>
                                            </div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '1.125rem', color: '#111827' }}>{c.name}</div>
                                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{c.number}</div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEdit(c)}
                                                    style={{ padding: '0.5rem', backgroundColor: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa', borderRadius: '0.375rem', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ConsultationManagement;
