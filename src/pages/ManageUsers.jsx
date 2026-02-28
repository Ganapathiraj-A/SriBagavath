import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from '@/utils/FirestoreProxy';
import { db } from '@/firebase';
import PageHeader from '@/components/PageHeader';
import { Check, X, Shield, Mail, Calendar, Trash2, Edit, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const ALL_PERMISSIONS = [
    { id: 'ADMIN_REVIEW', label: 'Admin Review (Reg, Pur, Don)' },
    { id: 'ATTENDANCE', label: 'Attendance' },
    { id: 'AUDIO_BOOKS_MANAGEMENT', label: 'Audio Books Management' },
    { id: 'BANKING', label: 'Banking (Recon)' },
    { id: 'CONSULTATION_MANAGEMENT', label: 'Consultation Management' },
    { id: 'DAILY_ZOOM_MANAGEMENT', label: 'Daily Zoom Management' },
    { id: 'DIGITAL_BOOKS_MANAGEMENT', label: 'Digital Books Management' },
    { id: 'IMPORT_EXPORT', label: 'Import/Export' },
    { id: 'MANAGE_USERS', label: 'Manage Users' },
    { id: 'OFFLINE_ENTRY', label: 'Offline Entry Screens' },
    { id: 'PRINT_BOOKS_MANAGEMENT', label: 'Print Books Management' },
    { id: 'PROGRAM_MANAGEMENT', label: 'Program Management (incl. Types)' },
    { id: 'RELATED_VIDEO_MANAGEMENT', label: 'Related Video Management' },
    { id: 'REPORTING', label: 'Reporting & Analytics' },
    { id: 'SCHEDULE_MANAGEMENT', label: 'Schedule Management' },
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
    const [activeTab, setActiveTab] = useState('ADMIN');
    const [permissionFilter, setPermissionFilter] = useState('All');

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
        } catch (_err) {
            alert("Error saving user: " + _err.message);
        }
    };

    const handleRevoke = async (adminId, email) => {
        if (confirm(`Revoke admin access for ${email}?`)) {
            await deleteDoc(doc(db, 'admins', adminId));
        }
    };

    // Filter and Count logic
    const counts = {
        SUPER_ADMIN: admins.filter(a => (a.role || 'ADMIN') === 'SUPER_ADMIN').length,
        ADMIN: admins.filter(a => (a.role || 'ADMIN') === 'ADMIN').length,
        POWER_USER: admins.filter(a => (a.role || 'ADMIN') === 'POWER_USER').length
    };

    const getPermissionCount = (permId) => {
        return admins.filter(a => a.role === 'POWER_USER' && a.permissions?.includes(permId)).length;
    };

    const displayedAdmins = admins.filter(admin => {
        const role = admin.role || 'ADMIN';
        if (role !== activeTab) return false;
        if (activeTab === 'POWER_USER' && permissionFilter !== 'All') {
            return admin.permissions?.includes(permissionFilter);
        }
        return true;
    });

    return (
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh' }}>
            <PageHeader title="User Management" />

            <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '1.5rem' }}>

                {/* Shared Modal for Add/Edit */}
                {selectedUser && (
                    <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--color-card)', padding: '20px', borderRadius: '12px', maxWidth: '500px', width: '90%', border: '1px solid var(--color-border)' }}>
                            <h3 style={{ color: 'var(--color-text)' }}>{isEditing ? 'Edit User' : 'Add New Admin'}</h3>

                            <div style={{ margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Email Address</label>
                                {isEditing ? (
                                    <div style={{ padding: '8px', background: 'var(--color-surface)', borderRadius: '4px', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>{selectedUser.email}</div>
                                ) : (
                                    <input
                                        type="email"
                                        placeholder="Enter email address"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                                    />
                                )}
                            </div>

                            <div style={{ margin: '15px 0' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Select Role</label>
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
                                >
                                    <option value="SUPER_ADMIN">Super Admin (All Access)</option>
                                    <option value="ADMIN">Admin (All except Manage Users)</option>
                                    <option value="POWER_USER">Power User (Select Screens)</option>
                                </select>
                            </div>

                            {selectedRole === 'POWER_USER' && (
                                <div style={{ margin: '15px 0', maxHeight: '200px', overflowY: 'auto' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Assign Permissions</label>
                                    {ALL_PERMISSIONS.map(p => (
                                        <div key={p.id} style={{ marginBottom: '6px' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)', fontSize: '14px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(p.id)}
                                                    onChange={() => togglePermission(p.id)}
                                                    style={{ width: 'auto' }}
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

                            {isEditing && (
                                <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '15px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Revoke access for ${selectedUser.email}?`)) {
                                                handleRevoke(selectedUser.id, selectedUser.email);
                                                setSelectedUser(null);
                                            }
                                        }}
                                        style={{ color: 'var(--color-error)', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                                    >
                                        <Trash2 size={16} />
                                        Revoke Access
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                <div style={{ padding: '0.25rem 0 1rem 0', display: 'flex', justifyContent: 'center' }}>
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
                            width: '90%',
                            maxWidth: '400px'
                        }}
                    >
                        <Plus size={20} />
                        Add Admin
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--color-text)', textAlign: 'center' }}>
                        Authorized Administrators
                    </h2>
                </div>

                {/* Role Tabs */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '20px',
                    borderBottom: '1px solid var(--color-border)',
                    paddingBottom: '12px',
                    overflowX: 'auto'
                }}>
                    {[
                        { id: 'SUPER_ADMIN', label: 'S Admin' },
                        { id: 'ADMIN', label: 'Admin' },
                        { id: 'POWER_USER', label: 'P user' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setPermissionFilter('All');
                            }}
                            style={{
                                padding: '8px 16px',

                                background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: activeTab === tab.id ? 'white' : 'var(--color-text)',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                border: `1px solid ${activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.label}
                            <span style={{
                                backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--color-primary-transparent)',
                                color: activeTab === tab.id ? 'white' : 'var(--color-primary)',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px'
                            }}>
                                {counts[tab.id]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Power User Permission Filter */}
                {activeTab === 'POWER_USER' && (
                    <div style={{ marginBottom: '20px' }}>
                        <select
                            value={permissionFilter}
                            onChange={(e) => setPermissionFilter(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="All">All Power Users ({counts.POWER_USER})</option>
                            {ALL_PERMISSIONS.map(p => {
                                const count = getPermissionCount(p.id);
                                return (
                                    <option key={p.id} value={p.id}>
                                        {p.label} ({count})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>Loading users...</div>
                ) : displayedAdmins.length === 0 ? (
                    <div style={{ backgroundColor: 'var(--color-card)', padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                        No users found in this category.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {displayedAdmins.map(admin => (
                            <div
                                key={admin.id}
                                onClick={() => openEditModal(admin)}
                                style={{
                                    backgroundColor: 'var(--color-card)',
                                    padding: '1.25rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--color-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                                className="admin-row-hover"
                            >
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-text)' }}>{admin.email}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        {admin.role || 'ADMIN'}
                                        {admin.role === 'POWER_USER' && ` (${admin.permissions?.length || 0} screens)`}
                                    </div>
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
