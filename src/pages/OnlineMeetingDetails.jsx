import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, Share2, ChevronLeft, ExternalLink, User } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const OnlineMeetingDetails = () => {
    const { id: rawId } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Support virtual IDs: masterId_YYYY-MM-DD
                const parts = rawId.split('_');
                const masterId = parts[0];
                const instanceDate = parts[1];

                const docRef = doc(db, 'online_meetings', masterId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };

                    if (instanceDate) {
                        data.date = instanceDate;
                    }

                    setMeeting(data);

                    if (data.hasBanner) {
                        const bannerSnap = await getDoc(doc(db, 'online_meeting_banners', masterId));
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
    }, [rawId]);

    const handleShare = async () => {
        if (!meeting) return;
        const text = `
*Online Meeting with ${meeting.conductedBy}*
${meeting.description || meeting.descriptions ? '\n' + (meeting.description || meeting.descriptions) + '\n' : ''}
📅 *Date:* ${new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
⏰ *Time:* ${meeting.startTime} - ${meeting.endTime}

🔗 *Join Link:* ${meeting.joinLink}
        `.trim();

        try {
            await Share.share({
                title: `Online Meeting - ${meeting.conductedBy}`,
                text: text,
            });
        } catch (error) {
            console.error('Error sharing:', error);
            navigator.clipboard.writeText(text);
            alert('Meeting details copied to clipboard!');
        }
    };

    const handleShareBanner = async () => {
        if (!banner) {
            alert('No banner available for this meeting.');
            return;
        }

        try {
            const base64Data = banner;
            const cleanBase64 = base64Data.split(',')[1] || base64Data;
            const fileName = `banner_${Date.now()}.jpg`;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: cleanBase64,
                directory: Directory.Cache
            });

            await Share.share({
                title: meeting.conductedBy,
                files: [result.uri]
            });
        } catch (error) {
            console.error('Error sharing banner:', error);
            alert('Sharing failed. ' + error.message);
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                                {meeting.conductedBy}
                            </h1>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={handleShare}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.625rem 1rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#fff7ed',
                                        color: '#f97316',
                                        border: '1px solid #ffedd5',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: 600
                                    }}
                                    title="Share Text"
                                >
                                    <Share2 size={18} />
                                    Text
                                </button>
                                {banner && (
                                    <button
                                        onClick={handleShareBanner}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.625rem 1rem',
                                            borderRadius: '0.75rem',
                                            backgroundColor: '#fff7ed',
                                            color: '#f97316',
                                            border: '1px solid #ffedd5',
                                            cursor: 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: 600
                                        }}
                                        title="Share Banner"
                                    >
                                        <Share2 size={18} />
                                        Banner
                                    </button>
                                )}
                            </div>
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

                        {(meeting.description || meeting.descriptions) && (
                            <div style={{ marginTop: '2rem' }}>
                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                    Description
                                </span>
                                <p style={{ fontSize: '1.0625rem', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {meeting.description || meeting.descriptions}
                                </p>
                            </div>
                        )}

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
