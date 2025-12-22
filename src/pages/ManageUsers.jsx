import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import PageHeader from '../components/PageHeader';
import { Check, X, Shield, Mail, Calendar, Trash2, Edit, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const ALL_PERMISSIONS = [
    { id: 'CONFIGURATION', label: 'Configuration' },
    { id: 'PROGRAM_MANAGEMENT', label: 'Program Management' },
    { id: 'PROGRAM_TYPES', label: 'Program Types' },
    { id: 'PROGRAM_CONVERSATIONS', label: 'Conversations' },
    { id: 'SCHEDULE_MANAGEMENT', label: 'Schedule Management' },
    { id: 'ADMIN_REVIEW', label: 'Admin Review' },
    { id: 'MANAGE_USERS', label: 'Manage Users' },
];

const ManageUsers = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('ADMIN');
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    useEffect(() => {
        // Get current admins (Realtime for role updates)
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
            setAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsubAdmins();
    }, []);

    const openAddModal = () => {
        setSelectedUser({ id: 'NEW', email: '' });
        setIsEditing(false);
        setNewEmail('');
        setSelectedRole('ADMIN');
        setSelectedPermissions([]);
    };

    const openEditModal = (admin) => {
        setSelectedUser(admin);
        setIsEditing(true);
        setNewEmail(admin.email);
        setSelectedRole(admin.role || 'ADMIN');
        setSelectedPermissions(admin.permissions || []);
    };

    const togglePermission = (permId) => {
        if (selectedPermissions.includes(permId)) {
            setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
        } else {
            setSelectedPermissions([...selectedPermissions, permId]);
        }
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        const emailToSave = isEditing ? selectedUser.email : newEmail;

        if (!emailToSave || !emailToSave.includes('@')) {
            alert("Valid Email is required");
            return;
        }

        try {
            const userData = {
                email: emailToSave,
                role: selectedRole,
                permissions: selectedRole === 'POWER_USER' ? selectedPermissions : []
            };

            if (!isEditing) {
                userData.grantedAt = Timestamp.now();
                userData.grantedBy = 'Admin';
            }

            // Write/Update to admins collection - use email as ID for new ones
            const docId = isEditing ? selectedUser.id : emailToSave.trim().toLowerCase();
            await setDoc(doc(db, 'admins', docId), userData, { merge: true });

            alert(isEditing ? "User updated successfully!" : "User added successfully!");
            setSelectedUser(null);
        } catch (e) {
            alert("Error saving user: " + e.message);
        }
    };

    const handleRevoke = async (adminId, email) => {
        if (confirm(`Revoke admin access for ${email}?`)) {
            await deleteDoc(doc(db, 'admins', adminId));
        }
    };

    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
            <PageHeader title="User Management" />

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>

                {/* Shared Modal for Add/Edit */}
                {selectedUser && (
                    <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
                            <h3>{isEditing ? 'Edit User' : 'Add New Admin'}</h3>

                            <div style={{ margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Email Address</label>
                                {isEditing ? (
                                    <div style={{ padding: '8px', background: '#f3f4f6', borderRadius: '4px', color: '#666' }}>{selectedUser.email}</div>
                                ) : (
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                )}
                            </div>

                            <div style={{ margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Role</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                                >
                                    <option value="SUPER_ADMIN">Super Admin (All Access)</option>
                                    <option value="ADMIN">Admin (All except Manage Users)</option>
                                    <option value="POWER_USER">Power User (Select Screens)</option>
                                </select>
                            </div>

                            {selectedRole === 'POWER_USER' && (
                                <div style={{ margin: '15px 0', maxHeight: '200px', overflowY: 'auto' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Assign Permissions</label>
                                    {ALL_PERMISSIONS.map(p => (
                                        <div key={p.id} style={{ marginBottom: '6px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(p.id)}
                                                    onChange={() => togglePermission(p.id)}
                                                />
                                                {p.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="btn-secondary"
                                    style={{ borderRadius: '24px', flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"
                                    style={{ borderRadius: '24px', flex: 1 }}
                                >
                                    {isEditing ? 'Save Changes' : 'Add User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    <button
                        onClick={openAddModal}
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
                        Add User
                    </button>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#111827' }}>
                        Authorized Administrators
                    </h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading users...</div>
                ) : admins.length === 0 ? (
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: '#6b7280' }}>
                        No administrators found.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {admins.map(admin => (
                            <div
                                key={admin.id}
                                style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ backgroundColor: '#eff6ff', padding: '0.5rem', borderRadius: '0.5rem', color: '#2563eb' }}>
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{admin.email}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                            {admin.role || 'ADMIN'}
                                            {admin.role === 'POWER_USER' && ` (${admin.permissions?.length || 0} screens)`}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => openEditModal(admin)}
                                        style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                                        title="Edit Role/Permissions"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleRevoke(admin.id, admin.email)}
                                        style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                                        title="Revoke Access"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageUsers;
