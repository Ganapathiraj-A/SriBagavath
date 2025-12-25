import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Share2, ChevronLeft, User, Users } from 'lucide-react';
import { Share } from '@capacitor/share';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const SathsangDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);

    const ORANGE = '#f97316';

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const docRef = doc(db, 'sathsangs', id);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };
                    setMeeting(data);

                    if (data.hasBanner) {
                        const bannerSnap = await getDoc(doc(db, 'sathsang_banners', id));
                        if (bannerSnap.exists()) {
                            setBanner(bannerSnap.data().banner);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching sathsang details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleShare = async () => {
        if (!meeting) return;
        const text = `
*Sathsang with ${meeting.conductedBy}*

📅 *Date:* ${new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
⏰ *Time:* ${meeting.startTime} - ${meeting.endTime}
📍 *City:* ${meeting.city}
🏠 *Venue:* ${meeting.venue}
        `.trim();

        try {
            await Share.share({
                title: `Sathsang - ${meeting.conductedBy}`,
                text: text,
            });
        } catch (error) {
            console.error('Error sharing:', error);
            navigator.clipboard.writeText(text);
            alert('Sathsang details copied to clipboard!');
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading details...</p></div>;
    if (!meeting) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Sathsang not found.</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '3rem' }}>
            <PageHeader
                title="Sathsang Details"
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
                        <img src={banner} alt="Sathsang Banner" style={{ width: '100%', display: 'block' }} />
                    )}

                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                                {meeting.conductedBy}
                            </h1>
                            <button
                                onClick={handleShare}
                                style={{ padding: '0.5rem', borderRadius: '9999px', backgroundColor: '#fff7ed', color: ORANGE, border: 'none', cursor: 'pointer' }}
                            >
                                <Share2 size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem', color: '#4b5563' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', color: ORANGE }}>
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
                                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', color: ORANGE }}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Time</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {meeting.startTime} - {meeting.endTime}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: '#fff7ed', borderRadius: '0.75rem', color: ORANGE }}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Location</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {meeting.city}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.95rem', color: '#4b5563', marginTop: '0.25rem' }}>
                                        {meeting.venue}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SathsangDetails;
