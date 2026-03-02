import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus, Edit2, Trash2, Save, ChevronLeft, User, Video, Calendar, Image as ImageIcon, Link as LinkIcon, FileText, Youtube, Eye, Trash
} from 'lucide-react';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, limit, where } from '@/utils/FirestoreProxy';
import PageHeader from '@/components/PageHeader';
import { getLocalDateString } from '@/utils/dateUtils';
import { compressImage } from '@/utils/imageUtils';
import '../components/RegistrationStyles.css';

const DailyZoomManagement = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [meetings, setMeetings] = useState([]);
    const [historyMeetings, setHistoryMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [links, setLinks] = useState([]);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'history', 'add', 'edit'

    const [formData, setFormData] = useState({
        date: getLocalDateString(),
        teacherId: '',
        name: '',
        description: '',
        image: '',
        linkId: '',
        joinUrl: '',
        youtubeUrl: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const today = getLocalDateString();

            // Upcoming Meetings
            const ref = collection(db, 'daily_zoom_meetings');
            const qUpcoming = query(ref, where('date', '>=', today), orderBy('date', 'asc'));
            const snapUpcoming = await getDocs(qUpcoming);
            const upcomingData = snapUpcoming.docs.map(d => ({ id: d.id, ...d.data() }));
            setMeetings(upcomingData);

            // History Meetings
            const qHistory = query(ref, where('date', '<', today), orderBy('date', 'desc'), limit(50));
            const snapHistory = await getDocs(qHistory);
            setHistoryMeetings(snapHistory.docs.map(d => ({ id: d.id, ...d.data() })));

            // Load Teachers
            const teacherRef = collection(db, 'daily_zoom_teachers');
            const teacherSnap = await getDocs(query(teacherRef, orderBy('name', 'asc')));
            const teachersList = teacherSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTeachers(teachersList);

            // Load Links
            const linkRef = collection(db, 'daily_zoom_links');
            const linkSnap = await getDocs(query(linkRef, orderBy('name', 'asc')));
            const linksList = linkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setLinks(linksList);

            // Set default link if adding new
            if (!isEditing && !formData.linkId) {
                const defaultLink = linksList.find(l => l.isDefault) || linksList[0];
                if (defaultLink) {
                    setFormData(prev => ({ ...prev, linkId: defaultLink.id, joinUrl: defaultLink.url }));
                }
            }

            // Check for direct editing via URL param
            const editId = searchParams.get('id');
            const allMeetings = [...upcomingData, ...snapHistory.docs.map(d => ({ id: d.id, ...d.data() }))];
            if (editId && allMeetings.find(m => m.id === editId)) {
                handleEdit(allMeetings.find(m => m.id === editId));
            }
        } catch (_err) {
            console.error('Error loading daily zoom data:', _err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTeacherSelect = (e) => {
        const teacherId = e.target.value;
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
            setFormData(prev => ({
                ...prev,
                teacherId: teacher.id,
                name: teacher.name,
                image: teacher.image
            }));
        } else {
            setFormData(prev => ({ ...prev, teacherId: '', name: '', image: '' }));
        }
    };

    const handleLinkSelect = (e) => {
        const linkId = e.target.value;
        const link = links.find(l => l.id === linkId);
        if (link) {
            setFormData(prev => ({
                ...prev,
                linkId: link.id,
                joinUrl: link.url
            }));
        } else {
            setFormData(prev => ({ ...prev, linkId: '', joinUrl: '' }));
        }
    };

    const resetForm = () => {
        const defaultLink = links.find(l => l.isDefault) || links[0];
        setFormData({
            date: getLocalDateString(),
            teacherId: '',
            name: '',
            description: '',
            image: '',
            linkId: defaultLink ? defaultLink.id : '',
            joinUrl: defaultLink ? defaultLink.url : '',
            youtubeUrl: ''
        });
        setIsEditing(false);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // eslint-disable-next-line no-unused-vars
                const { name, image, ...saveData } = formData;
                await updateDoc(doc(db, 'daily_zoom_meetings', editingId), saveData);
                alert('Meeting updated!');
            } else {
                // eslint-disable-next-line no-unused-vars
                const { name, image, ...saveData } = formData;
                await addDoc(collection(db, 'daily_zoom_meetings'), {
                    ...saveData,
                    createdAt: new Date().toISOString()
                });
                alert('Meeting added!');
            }
            resetForm();
            loadData();
            setActiveTab('upcoming');
        } catch (_err) {
            alert('Error: ' + _err.message);
        }
    };

    const handleEdit = (m) => {
        setFormData({
            date: m.date || getLocalDateString(),
            teacherId: m.teacherId || '',
            name: m.name || '',
            description: m.description || '',
            image: m.image || '',
            linkId: m.linkId || '',
            joinUrl: m.joinUrl || '',
            youtubeUrl: m.youtubeUrl || ''
        });
        setEditingId(m.id);
        setIsEditing(true);
        setActiveTab('edit');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleRemoveOldEntries = async () => {
        if (historyMeetings.length === 0) {
            alert('No old entries to remove.');
            return;
        }

        if (window.confirm(`Are you sure you want to remove all ${historyMeetings.length} past meeting entries? This cannot be undone.`)) {
            try {
                setLoading(true);
                const deletePromises = historyMeetings.map(m => deleteDoc(doc(db, 'daily_zoom_meetings', m.id)));
                await Promise.all(deletePromises);
                alert('All old entries removed successfully.');
                loadData();
            } catch (err) {
                alert('Error removing old entries: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    if (loading && meetings.length === 0) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Manage Daily Zoom"
                leftAction={
                    <button onClick={() => navigate('/admin/program-management')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--color-text)' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
                rightAction={
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                            onClick={() => navigate('/programs/online/daily')}
                            title="View Public Listing"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--color-warning-transparent)',
                                border: '1px solid var(--color-warning)',
                                color: 'var(--color-warning)',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Eye size={18} />
                        </button>
                    </div>
                }
            />

            <div style={{ maxWidth: '42rem', margin: '0 auto', padding: '1rem' }}>
                {(activeTab === 'upcoming' || activeTab === 'history') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button
                            onClick={handleRemoveOldEntries}
                            disabled={loading || historyMeetings.length === 0}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: 'var(--color-error-transparent)',
                                border: '1px solid var(--color-error)',
                                borderRadius: '20px',
                                color: 'var(--color-error)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: loading || historyMeetings.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: loading || historyMeetings.length === 0 ? 0.6 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Trash size={14} /> Remove Old Entries
                        </button>
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--color-border)',
                    gap: '24px',
                    marginBottom: '1.5rem',
                    padding: '0 4px',
                    overflowX: 'auto',
                    scrollbarWidth: 'none'
                }}>
                    {['upcoming', 'history', 'add', 'edit'].map((tab) => {
                        if (tab === 'edit' && !isEditing) return null;
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => {
                                    if (tab === 'add') resetForm();
                                    setActiveTab(tab);
                                }}
                                style={{
                                    padding: '12px 4px',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    backgroundColor: 'transparent',
                                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.9rem',
                                    textTransform: 'capitalize',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {(activeTab === 'add' || activeTab === 'edit') && (
                        <div style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.25rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                            <Calendar size={16} color="var(--color-primary)" /> Meeting Date
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            required
                                            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', width: '100%', fontSize: '1rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                            <User size={16} color="var(--color-primary)" /> Select Teacher
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                name="teacherId"
                                                value={formData.teacherId}
                                                onChange={handleTeacherSelect}
                                                required
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem' }}
                                            >
                                                <option value="">Select Teacher...</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/admin/daily-zoom/teachers')}
                                                aria-label="Manage Teachers"
                                                style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {formData.teacherId && (
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: '0.75rem', border: '1px solid var(--color-border)' }}>
                                        <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                            {formData.image ? <img src={formData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--color-text-light)" />}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{formData.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Teacher profile selected</div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        <FileText size={16} color="var(--color-primary)" /> Description (Optional)
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Meeting details/topic..."
                                        rows={2}
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', width: '100%', resize: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        <LinkIcon size={16} color="var(--color-primary)" /> Meeting Link
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            name="linkId"
                                            value={formData.linkId}
                                            onChange={handleLinkSelect}
                                            required
                                            style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '1rem' }}
                                        >
                                            <option value="">Select Link...</option>
                                            {links.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/admin/daily-zoom/links')}
                                            aria-label="Manage Links"
                                            style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    {formData.joinUrl && (
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-muted)',
                                            padding: '0 0.25rem',
                                            overflow: 'hidden',
                                            wordBreak: 'break-all',
                                            overflowWrap: 'anywhere',
                                            whiteSpace: 'normal',
                                            minWidth: 0
                                        }}>
                                            URL: {formData.joinUrl}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        <Youtube size={16} color="#ef4444" /> YouTube Link (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        name="youtubeUrl"
                                        value={formData.youtubeUrl}
                                        onChange={handleInputChange}
                                        placeholder="https://youtube.com/live/..."
                                        style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', width: '100%', fontSize: '1rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="submit"
                                        style={{ flex: 1, padding: '0.875rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px var(--color-primary-transparent, rgba(249, 115, 22, 0.2))' }}
                                    >
                                        <Save size={18} />
                                        {isEditing ? 'Update Meeting' : 'Schedule Meeting'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            style={{ padding: '0.875rem', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {(activeTab === 'upcoming' || activeTab === 'history') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(activeTab === 'upcoming' ? meetings : historyMeetings).length === 0 ? (
                                <div style={{ backgroundColor: 'var(--color-card)', padding: '2rem', borderRadius: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}>
                                    No meetings found in {activeTab}.
                                </div>
                            ) : (
                                (activeTab === 'upcoming' ? meetings : historyMeetings).map((m) => {
                                    const teacher = teachers.find(t => t.id === m.teacherId);
                                    const displayName = teacher?.name || m.name || 'Unknown Speaker';
                                    const displayImage = teacher?.image || m.image;

                                    return (
                                        <div
                                            key={m.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '1rem',
                                                backgroundColor: 'var(--color-card)',
                                                borderRadius: '1rem',
                                                boxShadow: 'var(--shadow-sm)',
                                                border: '1px solid var(--color-border)',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0 }}>
                                                {displayImage ? <img src={displayImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--color-text-light)" /></div>}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    fontSize: '0.95rem',
                                                    color: 'var(--color-text)',
                                                    marginBottom: '0.1rem',
                                                    wordBreak: 'break-word',
                                                    overflowWrap: 'anywhere'
                                                }}>{displayName}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Calendar size={13} /> {m.date}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                                <button
                                                    onClick={() => handleEdit(m)}
                                                    aria-label={`Edit ${displayName}`}
                                                    style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    aria-label={`Delete ${displayName}`}
                                                    style={{ padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid var(--color-error-transparent)', backgroundColor: 'var(--color-error-transparent)', color: 'var(--color-error)', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default DailyZoomManagement;
