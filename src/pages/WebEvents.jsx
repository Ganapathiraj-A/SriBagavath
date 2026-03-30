import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Share2, Video, Clock, RefreshCw, User, Youtube, ChevronRight, Phone, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, getDocsCacheFirst, onSnapshot } from '../utils/FirestoreProxy';
import { getLocalDateString } from '../utils/dateUtils';
import LazyImage from '../components/LazyImage';
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
    let currentDate = new Date(master.date || master.programDate);
    const today = new Date(todayStr);
    
    // Safety check for invalid dates
    if (isNaN(currentDate.getTime())) return master;

    // Simple forward skip for recurring
    if (master.frequency === 'daily') {
        if (currentDate < today) currentDate = new Date(today);
    } else if (master.frequency === 'weekly') {
        while (currentDate < today) {
            currentDate.setDate(currentDate.getDate() + 7);
        }
    } else if (master.frequency === 'monthly') {
        while (currentDate < today) {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    }

    return {
        ...master,
        date: currentDate.toLocaleDateString('en-CA'),
        programDate: currentDate.toLocaleDateString('en-CA')
    };
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
                        setLoading(false);
                    },
                    (err) => {
                        console.error("[WebEvents] Programs listener failed:", err);
                        setLoading(false);
                    }
                );

                // 2. Parallel Fetches for other tabs (Non-blocking)
                const fetchOthers = async () => {
                    const results = await Promise.allSettled([
                        getDocsCacheFirst(collection(db, 'satsangs')),
                        getDocsCacheFirst(collection(db, 'online_meetings')),
                        getDocsCacheFirst(query(collection(db, 'daily_zoom_meetings'), where('date', '>=', today), orderBy('date', 'asc'))),
                        getDocsCacheFirst(collection(db, 'teachers'))
                    ]);

                    const newData = { ...data };

                    // Handle Satsangs (Schedules)
                    if (results[0].status === 'fulfilled') {
                        const raw = results[0].value.docs.map(d => ({ id: d.id, ...d.data() }));
                        const processed = [];
                        raw.forEach(m => {
                            if (m.isRecurringInstance || m.masterId) return;
                            if (m.isRecurring) {
                                const next = getNextOccurrence(m, today);
                                if (next) processed.push(next);
                            } else {
                                const d = m.date?.toDate ? m.date.toDate().toLocaleDateString('en-CA') : m.date;
                                if (d >= today) processed.push({ ...m, date: d });
                            }
                        });
                        processed.sort((a, b) => (a.date || "").toString().localeCompare((b.date || "").toString()));
                        newData.schedules = processed;
                    }

                    // Handle Online Meetings (Daily Zoom)
                    if (results[1].status === 'fulfilled') {
                        const raw = results[1].value.docs.map(d => ({ id: d.id, ...d.data() }));
                        const processed = [];
                        raw.forEach(m => {
                            if (m.isRecurringInstance || m.masterId) return;
                            if (m.isRecurring) {
                                const next = getNextOccurrence(m, today);
                                if (next) processed.push(next);
                            } else {
                                const d = m.date?.toDate ? m.date.toDate().toLocaleDateString('en-CA') : m.date;
                                if (d >= today) processed.push({ ...m, date: d });
                            }
                        });
                        processed.sort((a, b) => (a.date || "").toString().localeCompare((b.date || "").toString()));
                        newData.dailyZoom = processed;
                    }

                    // Handle Daily Zoom Meetings tab (Legacy/Specific)
                    if (results[2].status === 'fulfilled') {
                        // Merge or override if needed
                    }

                    // Handle Teachers
                    if (results[3].status === 'fulfilled') {
                        setTeachers(results[3].value.docs.map(d => ({ id: d.id, ...d.data() })));
                    }

                    setData(prev => ({ ...prev, ...newData }));
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
        const text = `Join us for ${program.title} on ${program.programDate} at ${program.location}.\n\nRegister here: https://sribagavath.org/web/programs/${program.id}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: program.title, text: text, url: window.location.href });
            } catch (err) {}
        } else {
            navigator.clipboard.writeText(text);
            alert("Details copied to clipboard!");
        }
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
                                                <LazyImage src={teacher.photo} alt={teacher.name} className="teacher-photo" />
                                            </div>
                                            <div className="teacher-info">
                                                <h3>{teacher.name}</h3>
                                                <p className="teacher-location"><MapPin size={14} /> {teacher.location || 'Salem'}</p>
                                                <div className="teacher-contact-actions">
                                                    {teacher.phone && (
                                                        <a href={`tel:${teacher.phone}`} className="teacher-action-btn">
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
                                                <div className="event-card-main">
                                                    <div className="event-date-badge">
                                                        <span className="event-day">{new Date(item.programDate || item.date).getDate()}</span>
                                                        <span className="event-month">{new Date(item.programDate || item.date).toLocaleString('default', { month: 'short' })}</span>
                                                    </div>
                                                    <div className="event-card-body">
                                                        <h3>{item.title}</h3>
                                                        <div className="event-meta">
                                                            <span><MapPin size={14} /> {item.location}</span>
                                                            {item.time && <span><Clock size={14} /> {item.time}</span>}
                                                            {item.isRecurring && <span className="recurring-tag">{formatRecurrenceRule(item)}</span>}
                                                        </div>
                                                        <p className="event-excerpt">{item.description?.substring(0, 120)}...</p>
                                                    </div>
                                                </div>
                                                <div className="event-card-actions">
                                                    <button className="web-btn-primary" onClick={() => navigate(`/web/programs/${item.id}`)}>View Details</button>
                                                    <button className="web-btn-outline icon-only" onClick={() => handleShare(item)}><Share2 size={18} /></button>
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
