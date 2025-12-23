import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, Share2, ChevronLeft, ExternalLink, User } from 'lucide-react';
import { Share } from '@capacitor/share';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const OnlineMeetingDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const docRef = doc(db, 'online_meetings', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.id ? { id: snap.id, ...snap.data() } : null;
                    setMeeting(data);

                    if (data.hasBanner) {
                        const bannerSnap = await getDoc(doc(db, 'online_meeting_banners', id));
                        if (bannerSnap.exists()) {
                            setBanner(bannerSnap.data().banner);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching meeting details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleShare = async () => {
        if (!meeting) return;
        const text = `
*Online Meeting with ${meeting.conductedBy}*

📅 *Date:* ${new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
⏰ *Time:* ${meeting.startTime} - ${meeting.endTime}

🔗 *Join Link:* ${meeting.joinLink}
        `.trim();

        try {
            await Share.share({
                title: `Online Meeting - ${meeting.conductedBy}`,
                text: text,
                url: meeting.joinLink
            });
        } catch (error) {
            console.error('Error sharing:', error);
            navigator.clipboard.writeText(text);
            alert('Meeting details copied to clipboard!');
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading details...</p></div>;
    if (!meeting) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Meeting not found.</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="Meeting Details"
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ backgroundColor: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}
                >
                    {banner && (
                        <img src={banner} alt="Meeting Banner" style={{ width: '100%', display: 'block' }} />
                    )}

                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                                {meeting.conductedBy}
                            </h1>
                            <button
                                onClick={handleShare}
                                style={{ padding: '0.5rem', borderRadius: '9999px', backgroundColor: '#fff7ed', color: '#f97316', border: 'none', cursor: 'pointer' }}
                            >
                                <Share2 size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem', color: '#4b5563' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', color: '#f97316' }}>
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Date</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', color: '#f97316' }}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Time</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {meeting.startTime} - {meeting.endTime}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => window.open(meeting.joinLink, '_blank')}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: '#f97316',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    fontSize: '1.125rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem'
                                }}
                            >
                                <Video size={20} />
                                Join Meeting
                                <ExternalLink size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OnlineMeetingDetails;
