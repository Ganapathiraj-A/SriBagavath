import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, MapPin, Share2, ChevronLeft, User, Users } from 'lucide-react';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import PageHeader from '@/components/PageHeader';
import { db } from '@/firebase';
import { doc, getDocCacheFirst } from '@/utils/FirestoreProxy';

const SatsangDetails = () => {
    const { id: rawId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [meeting, setMeeting] = useState(null);
    const [banner, setBanner] = useState(null);
    const [loading, setLoading] = useState(true);

    const ORANGE = '#f97316';

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Support virtual IDs: masterId_YYYY-MM-DD
                const parts = rawId.split('_');
                const masterId = parts[0];
                const instanceDate = parts[1]; // might be undefined

                const docRef = doc(db, 'satsangs', masterId);
                const snap = await getDocCacheFirst(docRef);
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };

                    // Override date if it's a virtual instance
                    if (instanceDate) {
                        data.date = instanceDate;
                    }

                    setMeeting(data);

                    if (data.hasBanner) {
                        const bannerSnap = await getDocCacheFirst(doc(db, 'satsang_banners', masterId));
                        if (bannerSnap.exists()) {
                            setBanner(bannerSnap.data().banner);
                        }
                    }
                }
            } catch (_err) {
                console.error("Error fetching satsang details:", _err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [rawId]);

    const handleShare = async () => {
        if (!meeting) return;
        const appUrl = 'https://play.google.com/store/apps/details?id=com.bhavathpathai.app&pcampaignid=web_share';
        const text = `
*Satsang with ${meeting.conductedBy}*
${meeting.description || meeting.descriptions ? '\n' + (meeting.description || meeting.descriptions) + '\n' : ''}
📅 *Date:* ${new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
⏰ *Time:* ${meeting.startTime} - ${meeting.endTime}
📍 *City:* ${meeting.city}
🏠 *Venue:* ${meeting.venue}
━━━━━━━━━━━━━━━━━━━━
Download the *Sri Bagavath App* (${appUrl}) for the latest updates`.trim();

        try {
            await Share.share({
                title: `Satsang - ${meeting.conductedBy}`,
                text: text
            });
        } catch (_err) {
            console.error('Error sharing:', _err);
            navigator.clipboard.writeText(text);
            alert('Satsang details copied to clipboard!');
        }
    };

    const handleShareBanner = async () => {
        if (!banner) {
            alert('No banner available for this satsang.');
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
        } catch (_err) {
            console.error('Error sharing banner:', _err);
            alert('Sharing failed. ' + _err.message);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading details...</p></div>;
    if (!meeting) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Satsang not found.</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '3rem' }}>
            <PageHeader
                title="Satsang Details"
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
                    style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}
                >
                    {banner && (
                        <img src={banner} alt="Satsang Banner" loading="lazy" style={{ width: '100%', display: 'block' }} />
                    )}

                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 }}>
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
                                        backgroundColor: 'var(--color-primary-transparent)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary)',
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
                                            color: ORANGE,
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

                        <div style={{ display: 'grid', gap: '1.5rem', color: 'var(--color-text)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-transparent)', borderRadius: '0.75rem', color: 'var(--color-primary)' }}>
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
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-transparent)', borderRadius: '0.75rem', color: 'var(--color-primary)' }}>
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Time</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {meeting.startTime} - {meeting.endTime}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-primary-transparent)', borderRadius: '0.75rem', color: 'var(--color-primary)' }}>
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Location</span>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                                        {meeting.city}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '0.95rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                        {meeting.venue}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {(meeting.description || meeting.descriptions) && (
                            <div style={{ marginTop: '2.5rem' }}>
                                <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                    Description
                                </span>
                                <p style={{ fontSize: '1.0625rem', color: 'var(--color-text)', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {meeting.description || meeting.descriptions}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SatsangDetails;
