import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, ChevronLeft, Video, Link as LinkIcon, Clock, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, setDoc, query, where, orderBy, limit } from 'firebase/firestore';

// Helper to compress image to Base64
const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith('.heic')) {
            reject(new Error("HEIC format is not supported. Please use JPEG or PNG."));
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
                    const MAX_WIDTH = 800;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const TARGET_SIZE = 350000;

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
                    const reader = new FileReader();
                    reader.onload = (re) => attemptLoad(re.target.result, false);
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error("Unable to load image."));
                }
            };
            img.src = src;
        };

        try {
            const objectUrl = URL.createObjectURL(file);
            attemptLoad(objectUrl, true);
        } catch (e) {
            const reader = new FileReader();
            reader.onload = (re) => attemptLoad(re.target.result, false);
            reader.readAsDataURL(file);
        }
    });
};

const OnlineMeetingManagement = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [meetings, setMeetings] = useState([]);
    const [bannerImage, setBannerImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    const action = searchParams.get('action');
    const editingId = searchParams.get('id');
    const showForm = action === 'add' || action === 'edit';
    const editingMeeting = action === 'edit' ? meetings.find(m => m.id === editingId) : null;

    const [formData, setFormData] = useState({
        conductedBy: '',
        date: '',
        startTime: '',
        endTime: '',
        joinLink: '',
        banner: ''
    });

    useEffect(() => {
        loadMeetings();
    }, [activeTab]);

    useEffect(() => {
        if (editingMeeting) {
            setFormData({
                conductedBy: editingMeeting.conductedBy || '',
                date: editingMeeting.date || '',
                startTime: editingMeeting.startTime || '',
                endTime: editingMeeting.endTime || '',
                joinLink: editingMeeting.joinLink || '',
                banner: editingMeeting.banner || ''
            });

            if (!editingMeeting.banner && editingMeeting.hasBanner) {
                const fetchBanner = async () => {
                    try {
                        const { getDoc, doc } = await import('firebase/firestore');
                        const snap = await getDoc(doc(db, 'online_meeting_banners', editingMeeting.id));
                        if (snap.exists()) {
                            setFormData(prev => ({ ...prev, banner: snap.data().banner }));
                        }
                    } catch (e) {
                        console.error("Banner fetch failed", e);
                    }
                };
                fetchBanner();
            }
        }
    }, [editingMeeting]);

    const loadMeetings = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const meetingsRef = collection(db, 'online_meetings');
            let q;

            if (activeTab === 'upcoming') {
                q = query(meetingsRef, where('date', '>=', today), orderBy('date', 'asc'));
            } else {
                q = query(meetingsRef, where('date', '<', today), orderBy('date', 'desc'), limit(20));
            }

            const querySnapshot = await getDocs(q);
            setMeetings(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error loading meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) setBannerImage(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let bannerUrl = formData.banner;
            if (bannerImage) {
                bannerUrl = await compressImage(bannerImage);
            }

            const meetingData = {
                conductedBy: formData.conductedBy,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                joinLink: formData.joinLink,
                hasBanner: !!bannerUrl,
                updatedAt: new Date().toISOString(),
                createdAt: editingMeeting ? editingMeeting.createdAt : new Date().toISOString()
            };

            let meetingId;
            if (editingMeeting) {
                meetingId = editingMeeting.id;
                await updateDoc(doc(db, 'online_meetings', meetingId), meetingData);
            } else {
                const docRef = await addDoc(collection(db, 'online_meetings'), meetingData);
                meetingId = docRef.id;
            }

            if (bannerUrl) {
                await setDoc(doc(db, 'online_meeting_banners', meetingId), {
                    banner: bannerUrl,
                    updatedAt: new Date().toISOString()
                });
            }

            alert('Meeting saved successfully!');
            resetForm();
            loadMeetings();
        } catch (error) {
            console.error('Error saving meeting:', error);
            alert('Error: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this meeting?')) {
            try {
                await deleteDoc(doc(db, 'online_meetings', id));
                await deleteDoc(doc(db, 'online_meeting_banners', id)).catch(() => { });
                alert('Meeting deleted!');
                loadMeetings();
            } catch (error) {
                alert('Delete failed: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({ conductedBy: '', date: '', startTime: '', endTime: '', joinLink: '', banner: '' });
        setBannerImage(null);
        setSearchParams({});
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '5rem' }}>
            <PageHeader
                title="Online Meetings"
                leftAction={
                    <button onClick={() => navigate('/configuration')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                {!showForm ? (
                    <>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '0.5rem' }}>
                            <button
                                onClick={() => setActiveTab('upcoming')}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none', backgroundColor: activeTab === 'upcoming' ? 'white' : 'transparent', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'upcoming' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none' }}
                            >
                                Upcoming
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none', backgroundColor: activeTab === 'history' ? 'white' : 'transparent', fontWeight: 600, cursor: 'pointer', boxShadow: activeTab === 'history' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none' }}
                            >
                                History
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loading ? (
                                <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading meetings...</p>
                            ) : meetings.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6b7280' }}>No meetings found.</p>
                            ) : (
                                meetings.map(meeting => (
                                    <div key={meeting.id} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{meeting.conductedBy}</h4>
                                            <div style={{ display: 'flex', gap: '1rem', color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                                <span><CalendarIcon size={14} style={{ verticalAlign: 'text-bottom' }} /> {meeting.date}</span>
                                                <span><Clock size={14} style={{ verticalAlign: 'text-bottom' }} /> {meeting.startTime}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => setSearchParams({ action: 'edit', id: meeting.id })} style={{ padding: '0.5rem', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(meeting.id)} style={{ padding: '0.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setSearchParams({ action: 'add' })}
                            style={{ position: 'fixed', bottom: '2rem', right: '2rem', width: '3.5rem', height: '3.5rem', borderRadius: '9999px', backgroundColor: '#f97316', color: 'white', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', cursor: 'pointer' }}
                        >
                            <Plus size={24} style={{ margin: '0 auto' }} />
                        </button>
                    </>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><ChevronLeft size={24} /></button>
                            <h2 style={{ margin: 0 }}>{action === 'edit' ? 'Edit Meeting' : 'Add New Meeting'}</h2>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}><User size={16} /> Conducted By</label>
                                <input type="text" name="conductedBy" value={formData.conductedBy} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} placeholder="Ayya's Name / Speaker" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}><CalendarIcon size={16} /> Date</label>
                                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}><Clock size={16} /> Start</label>
                                        <input type="time" name="startTime" value={formData.startTime} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}><Clock size={16} /> End</label>
                                        <input type="time" name="endTime" value={formData.endTime} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}><LinkIcon size={16} /> Join Link</label>
                                <input type="url" name="joinLink" value={formData.joinLink} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }} placeholder="Zoom / Google Meet Link" />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Banner Image</label>
                                <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: '0.5rem' }} />
                                {formData.banner && !bannerImage && (
                                    <img src={formData.banner} alt="Current Banner" style={{ width: '100%', borderRadius: '0.5rem', marginTop: '0.5rem' }} />
                                )}
                                {bannerImage && (
                                    <p style={{ fontSize: '0.875rem', color: '#059669' }}>New image selected: {bannerImage.name}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f97316', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}
                            >
                                {uploading ? 'Processing...' : action === 'edit' ? 'Update Meeting' : 'Schedule Meeting'}
                            </button>
                        </form>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default OnlineMeetingManagement;
