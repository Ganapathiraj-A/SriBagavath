import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Share2, Video, Clock, RefreshCw, User, Youtube, ChevronRight, Phone, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, getDocsCacheFirst, onSnapshot } from '../utils/FirestoreProxy';
import { getLocalDateString } from '../utils/dateUtils';
import LazyImage from '../components/LazyImage';
import { shareItem } from '../utils/shareUtils';
import './WebPages.css';

// --- Helpers for Recurring Events ---
const formatRecurrenceRule = (master) => {
    if (!master.isRecurring) return null;
    const daysMap = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' };
    if (master.frequency === 'daily') return 'Daily';
    if (master.frequency === 'weekly') {
        const days = master.recurringDays?.map(d => daysMap[d]).join(', ');
        return `Weekly on ${days}`;
    }
    if (master.frequency === 'monthly') return 'Monthly';
    return 'Recurring';
};

const getNextOccurrence = (master, todayStr) => {
    if (!master.isRecurring) return master;

    let currentDate = new Date(master.date);
    const today = new Date(todayStr);
    const ruleEndDate = master.recurringEndDateType === 'date' ? new Date(master.recurringEndDate) : null;
    const exceptions = master.exceptions || [];

    // Max search window: 1 year
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (currentDate <= maxDate) {
        if (ruleEndDate && currentDate > ruleEndDate) break;

        const d = new Date(currentDate);
        const dateStr = d.toLocaleDateString('en-CA');
        let isMatch = false;

        if (master.frequency === 'daily') isMatch = true;
        else if (master.frequency === 'weekly') {
            if (master.recurringDays?.includes(currentDate.getDay().toString())) isMatch = true;
        } else if (master.frequency === 'monthly') {
            const startDay = new Date(master.date).getDate();
            if (currentDate.getDate() === startDay) isMatch = true;
        }

        if (isMatch && !exceptions.includes(dateStr) && dateStr >= todayStr) {
            return {
                ...master,
                id: `${master.id}_${dateStr}`,
                masterId: master.id,
                date: dateStr,
                isVirtual: true,
                recurrenceText: formatRecurrenceRule(master)
            };
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return null;
};

const WebEvents = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('retreats');
    const [data, setData] = useState({
        retreats: [],
        dailyZoom: [],
        schedules: [],
        consultation: []
    });
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);

    const tabs = [
        { id: 'retreats', name: 'Programs', icon: <Calendar size={18} /> },
        { id: 'schedules', name: "Ayya's Schedule", icon: <Calendar size={20} /> },
        { id: 'dailyZoom', name: 'Daily Zoom', icon: <Clock size={20} /> },
        { id: 'consultation', name: 'Consultation', icon: <User size={20} /> }
    ];

    useEffect(() => {
        let unsubPrograms;
        
        const fetchData = async () => {
            console.log("[WebEvents] FetchData Start");
            setLoading(true);
            const today = getLocalDateString();
            
            try {
                // 1. Live Programs Listener
                unsubPrograms = onSnapshot(
                    query(collection(db, 'programs'), where('programDate', '>=', today), orderBy('programDate', 'asc')),
                    (snap) => {
                        console.log("[WebEvents] Programs Snap:", snap.size);
                        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setData(prev => ({ ...prev, retreats: list }));
                        // If current tab is retreats and we have data, we can stop global loading
                        if (activeTab === 'retreats') setLoading(false);
                    },
                    (err) => {
                        console.error("[WebEvents] Programs listener failed:", err);
                    }
                );

                // 2. Fetch Other Collections (Satsangs, Online Meetings, Teachers)
                const fetchOthers = async () => {
                    try {
                        const [snapSatsang, snapZoom, snapLegacyZoom, snapTeachers] = await Promise.all([
                            getDocsCacheFirst(collection(db, 'satsangs')),
                            getDocsCacheFirst(collection(db, 'online_meetings')),
                            getDocsCacheFirst(query(collection(db, 'daily_zoom_meetings'), where('date', '>=', today), orderBy('date', 'asc'))),
                            getDocsCacheFirst(collection(db, 'teachers'))
                        ]);

                        const newData = {};

                        // Process Satsangs (Ayya's Schedule) with Recursion
                        const rawSatsangs = snapSatsang.docs.map(d => ({ id: d.id, ...d.data() }));
                        newData.schedules = rawSatsangs
                            .map(m => getNextOccurrence(m, today))
                            .filter(m => m !== null)
                            .sort((a, b) => a.date.localeCompare(b.date));

                        // Process Online Meetings with Recursion
                        const rawZoom = snapZoom.docs.map(d => ({ id: d.id, ...d.data() }));
                        const expandedZoom = rawZoom
                            .map(m => getNextOccurrence(m, today))
                            .filter(m => m !== null);

                        const legacyZoom = snapLegacyZoom.docs.map(d => ({ id: d.id, ...d.data() }));
                        newData.dailyZoom = [...expandedZoom, ...legacyZoom]
                            .sort((a, b) => a.date.localeCompare(b.date));

                        // Set Teachers
                        setTeachers(snapTeachers.docs.map(d => ({ id: d.id, ...d.data() })));

                        setData(prev => ({ ...prev, ...newData }));
                    } catch (err) {
                        console.error("[WebEvents] fetchOthers failed:", err);
                    } finally {
                        setLoading(false);
                    }
                };

                fetchOthers();

            } catch (error) {
                console.error("[WebEvents] Critical error in fetchData:", error);
                setLoading(false);
            }
        };

        fetchData();
        return () => { if (unsubPrograms) unsubPrograms(); };
    }, []);

    const handleShare = async (program) => {
        const text = `Join us for ${program.programName || program.title} on ${program.programDate || program.date} at ${program.programVenue || program.location}.`;
        const url = `https://sribagavath.org/web/programs/${program.id}`;
        
        await shareItem({
            title: program.programName || program.title,
            text: text,
            url: url,
            imageUrl: program.image || program.banner || program.programBanner,
            dialogTitle: 'Share Program'
        });
    };

    if (loading) {
        return (
            <div className="web-events-page">
                <div className="web-container">
                    <div className="emedia-header-spacer" />
                    <div className="web-loading-placeholder">
                        <RefreshCw className="animate-spin" size={48} />
                        <p>Loading Programs...</p>
                    </div>
                </div>
            </div>
        );
    }

    const activeList = data[activeTab] || [];

    return (
        <div className="web-events-page">
            <div className="web-container">
                <div className="emedia-header-spacer" />
                
                <header className="page-section-header">
                    <h1 className="web-logo-text-large">Events & Programs</h1>
                    <p>Participate in our upcoming retreats, satsangs, and meditation camps.</p>
                </header>

                <div className="events-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`event-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.name}</span>
                            {activeTab === tab.id && <motion.div layoutId="tab-underline" className="tab-underline" />}
                        </button>
                    ))}
                </div>

                <div className="events-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'consultation' ? (
                                <div className="consultation-grid">
                                    {teachers.length > 0 ? teachers.map(teacher => (
                                        <div key={teacher.id} className="consultation-card">
                                            <div className="teacher-photo-container">
                                                <LazyImage src={teacher.image} alt={teacher.name} className="teacher-photo" />
                                            </div>
                                            <div className="teacher-info">
                                                <h3>{teacher.name}</h3>
                                                <p className="teacher-location"><MapPin size={14} /> {teacher.location || 'Salem'}</p>
                                                <div className="teacher-contact-actions">
                                                    {teacher.phoneNumber && (
                                                        <a href={`tel:${teacher.phoneNumber}`} className="teacher-action-btn">
                                                            <Phone size={16} /> Call
                                                        </a>
                                                    )}
                                                    {teacher.youtube && (
                                                        <a href={teacher.youtube} target="_blank" rel="noreferrer" className="teacher-action-btn yt">
                                                            <Youtube size={16} /> Channel
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="web-no-results">
                                            <p>No consultants available at the moment.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="events-list">
                                    {activeList.length > 0 ? activeList.map((item, idx) => (
                                        <motion.div 
                                            key={item.id} 
                                            className="web-event-card"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <div className="event-card-inner">
                                                <div className="event-card-top">
                                                    <h3 className="event-title">{item.programName || item.conductedBy || item.name || item.title || 'Untitled Event'}</h3>
                                                    
                                                    <div className="event-details-rows">
                                                        <div className="event-detail-row">
                                                            <Calendar size={16} />
                                                            <span>{new Date(item.programDate || item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                                        </div>
                                                        {(item.programVenue || item.city || item.location) && (
                                                            <div className="event-detail-row">
                                                                <MapPin size={16} />
                                                                <span>{item.programVenue || item.city || item.location}</span>
                                                            </div>
                                                        )}
                                                        {item.isRecurring && (
                                                            <div className="event-detail-row recurrence">
                                                                <RefreshCw size={14} />
                                                                <span>{formatRecurrenceRule(item)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="event-card-footer-actions">
                                                    {!item.joinLink && !item.joinUrl && (
                                                        <button 
                                                            className="web-btn-primary register" 
                                                            onClick={() => navigate(`/web/programs/${item.id}`)}
                                                        >
                                                            Register Now
                                                        </button>
                                                    )}
                                                    
                                                    {item.introYoutubeUrl && (
                                                        <button 
                                                            className="web-btn-secondary" 
                                                            onClick={() => navigate(`/web/programs/${item.id}?tab=intro`)}
                                                        >
                                                            Intro
                                                        </button>
                                                    )}

                                                    <button 
                                                        className={`web-btn-outline ${!(item.joinLink || item.joinUrl) ? 'small' : 'full'}`}
                                                        onClick={() => {
                                                            if (item.joinLink || item.joinUrl) window.open(item.joinLink || item.joinUrl, '_blank');
                                                            else navigate(`/web/programs/${item.id}`);
                                                        }}
                                                    >
                                                        {(item.joinLink || item.joinUrl) ? 'Join Meeting' : 'Details'}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )) : (
                                        <div className="web-no-results">
                                            <div className="no-events-icon"><Calendar size={48} /></div>
                                            <h3>No upcoming items</h3>
                                            <p>There are no scheduled programs at the moment. Please check back later.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default WebEvents;
