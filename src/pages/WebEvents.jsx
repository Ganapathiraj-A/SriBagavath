import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Share2, Video, Clock, RefreshCw, User, Youtube, ChevronRight, Phone, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocsCacheFirst, onSnapshot } from '../utils/FirestoreProxy';
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
    let currentDate = new Date(master.date);
    const today = new Date(todayStr);
    const ruleEndDate = master.recurringEndDateType === 'date' ? new Date(master.recurringEndDate) : null;
    const exceptions = master.exceptions || [];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    while (currentDate <= maxDate) {
        if (ruleEndDate && currentDate > ruleEndDate) break;
        const dateStr = currentDate.toISOString().split('T')[0];
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
        const fetchData = async () => {
            setLoading(true);
            const today = getLocalDateString();
            
            try {
                // Fetch Retreats
                const retreatsSnap = await getDocsCacheFirst(query(collection(db, 'programs'), where('programDate', '>=', today), orderBy('programDate', 'asc')));
                const retreatsList = retreatsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Fetch Satsangs
                const satsangsSnap = await getDocsCacheFirst(collection(db, 'satsangs'));
                const rawSatsangs = satsangsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const processedSatsangs = [];
                rawSatsangs.forEach(m => {
                    if (m.isRecurringInstance || m.masterId) return;
                    if (m.isRecurring) {
                        const next = getNextOccurrence(m, today);
                        if (next) processedSatsangs.push(next);
                    } else if (m.date >= today) {
                        processedSatsangs.push(m);
                    }
                });
                processedSatsangs.sort((a, b) => a.date.localeCompare(b.date));

                // Fetch Online Meetings
                const onlineSnap = await getDocsCacheFirst(collection(db, 'online_meetings'));
                const rawOnline = onlineSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const processedOnline = [];
                rawOnline.forEach(m => {
                    if (m.isRecurringInstance || m.masterId) return;
                    if (m.isRecurring) {
                        const next = getNextOccurrence(m, today);
                        if (next) processedOnline.push(next);
                    } else if (m.date >= today) {
                        processedOnline.push(m);
                    }
                });
                processedOnline.sort((a, b) => a.date.localeCompare(b.date));

                // Fetch Daily Zoom
                const zoomSnap = await getDocsCacheFirst(query(collection(db, 'daily_zoom_meetings'), where('date', '>=', today), orderBy('date', 'asc')));
                const zoomList = zoomSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Fetch Schedule
                const scheduleSnap = await getDocsCacheFirst(query(collection(db, 'schedules'), orderBy('fromDate', 'asc')));
                const scheduleList = scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => (s.toDate || s.fromDate) >= today);

                // Fetch Consultation
                const consulSnap = await getDocsCacheFirst(query(collection(db, 'consultants'), orderBy('order', 'asc')));
                const consulList = consulSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Fetch Teachers (for Daily Zoom)
                const teachersSnap = await getDocsCacheFirst(collection(db, 'daily_zoom_teachers'));
                setTeachers(teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                setData({
                    retreats: retreatsList,
                    dailyZoom: zoomList,
                    schedules: scheduleList,
                    consultation: consulList
                });
            } catch (err) {
                console.error("Failed to fetch events data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleShare = async (title, date, location, venue, link) => {
        const text = `
*${title}*
📅 *Date:* ${date}
📍 *Location:* ${location}
🏢 *Venue:* ${venue}
━━━━━━━━━━━━━━━━━━━━
Join here: ${link || window.location.href}`.trim();

        try {
            await navigator.clipboard.writeText(text);
            alert('Details copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const renderCard = (item, type, index) => {
        if (type === 'retreats') {
            const startDate = new Date(item.programDate);
            return (
                <div key={item.id} className="emedia-card event-list-card schedule-card-refined program-list-card-unified">
                    <div className="event-date-badge schedule-date-box">
                        <span className="month">{startDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="day">{startDate.getDate()}</span>
                    </div>
                    <div className="event-list-info">
                        <div className="schedule-header">
                            <h3 className="schedule-place">{item.programName}</h3>
                        </div>
                        <div className="event-meta-grid">
                            <div className="event-meta-item">
                                <Calendar size={16} />
                                <span>
                                    {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {item.programEndDate && ` - ${new Date(item.programEndDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`}
                                </span>
                            </div>
                            <div className="event-meta-item">
                                <MapPin size={16} />
                                <span>{item.programCity}</span>
                            </div>
                        </div>

                        <div className="program-actions unified-actions">
                            {item.registrationStatus === 'Open' ? (
                                <button 
                                    className="program-btn primary small"
                                    onClick={() => window.open(`https://wa.me/919789165555?text=I%20want%20to%20register%20for%20${encodeURIComponent(item.programName)}`, '_blank')}
                                >
                                    Register Now
                                </button>
                            ) : (
                                <span className="program-status-closed small">Registration Closed</span>
                            )}
                            <button 
                                className="program-btn secondary small"
                                onClick={() => window.open(`https://wa.me/919789165555?text=I%20need%20details%20about%20${encodeURIComponent(item.programName)}`, '_blank')}
                            >
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'satsangs' || type === 'online') {
            const isOnline = type === 'online';
            return (
                <div key={item.id} className="emedia-card event-list-card">
                    <div className="event-date-badge">
                        <span className="month">{new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="day">{new Date(item.date).getDate()}</span>
                    </div>
                    <div className="event-list-info">
                        <h3>{item.conductedBy}</h3>
                        <div className="event-meta-grid">
                            <div className="event-meta-item"><Clock size={16} /> <span>{item.startTime}</span></div>
                            <div className="event-meta-item">{isOnline ? <Video size={16} /> : <MapPin size={16} />} <span>{isOnline ? 'Online Meeting' : item.city}</span></div>
                            {item.recurrenceText && <div className="event-meta-item recurrence"><RefreshCw size={14} /> <span>{item.recurrenceText}</span></div>}
                        </div>
                        {item.description && <p className="event-desc-small">{item.description}</p>}
                        <div className="event-list-actions">
                            <button className="event-action-btn share small" onClick={() => handleShare(item.conductedBy, item.date, isOnline ? 'Online' : item.city, item.startTime)}><Share2 size={14} /> Share</button>
                            {isOnline ? (
                                <a href={item.joinUrl} target="_blank" rel="noopener noreferrer" className="event-action-btn join small">Join Meeting</a>
                            ) : (
                                <a href={`https://wa.me/919789165555?text=Satsang Inquiry: ${item.conductedBy} at ${item.city}`} target="_blank" rel="noopener noreferrer" className="event-action-btn inquiry small">Enquire</a>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'dailyZoom') {
            const teacher = teachers.find(t => t.id === item.teacherId);
            const displayName = teacher?.name || item.name || 'Speaker';
            return (
                <div key={item.id} className="emedia-card daily-zoom-card">
                    <div className="zoom-speaker-img">
                        <LazyImage src={teacher?.imageUrl || item.imageUrl} alt={displayName} />
                    </div>
                    <div className="zoom-card-info">
                        <div className="zoom-date-row">
                            <Calendar size={14} /> <span>{new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <h3>{displayName}</h3>
                        {item.description && <p className="zoom-desc">{item.description}</p>}
                        <div className="zoom-card-btns">
                            <a href={item.joinUrl} target="_blank" rel="noopener noreferrer" className="zoom-btn join"><Video size={16} /> Zoom</a>
                            {item.youtubeUrl && <a href={item.youtubeUrl} target="_blank" rel="noopener noreferrer" className="zoom-btn youtube"><Youtube size={16} /> YouTube</a>}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'schedules') {
            return (
                <div key={item.id} className="emedia-card event-list-card schedule-card-refined">
                    <div className="event-date-badge schedule-date-box">
                        <span className="month">{new Date(item.fromDate).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="day">{new Date(item.fromDate).getDate()}</span>
                    </div>
                    <div className="event-list-info">
                        <div className="schedule-header">
                            <h3 className="schedule-place">{item.place || item.title}</h3>
                        </div>
                        <div className="event-meta-grid">
                            <div className="event-meta-item">
                                <Calendar size={16} />
                                <span>
                                    {new Date(item.fromDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    {item.toDate && ` - ${new Date(item.toDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`}
                                </span>
                            </div>
                            {item.description && (
                                <div className="event-meta-item schedule-desc-row">
                                    <p className="event-desc-small">{item.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="event-list-actions">
                            <button className="event-action-btn share small" onClick={() => handleShare(item.place || item.title, item.fromDate, item.place, item.description)}>
                                <Share2 size={14} /> Share Schedule
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="web-events-page">
            <div className="web-container">
                <div className="emedia-header-spacer" />
                
                <nav className="emedia-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`emedia-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.name}</span>
                            {activeTab === tab.id && <div className="active-underline" />}
                        </button>
                    ))}
                </nav>

                <main className="emedia-main events-main">
                    {loading ? (
                        <div className="web-loading-state">
                            <div className="spinner"></div>
                            <p>Loading {tabs.find(t => t.id === activeTab)?.name}...</p>
                        </div>
                    ) : (data[activeTab].length === 0) ? (
                        <div className="web-no-results">
                            <div className="no-results-icon"><Calendar size={48} /></div>
                            <h3>No upcoming items</h3>
                            <p>There are no scheduled {tabs.find(t => t.id === activeTab)?.name.toLowerCase()} at the moment.</p>
                        </div>
                    ) : (
                        <div className={`events-grid-layout ${activeTab}`}>
                            {activeTab === 'consultation' ? (
                                <div className="consultation-container">
                                    <p className="consultation-hint">Contact our Teachers for personalized guidance</p>
                                    <div className="consultation-grid">
                                        {data.consultation.map((c, idx) => (
                                            <div key={c.id} className="consultation-card">
                                                <div className="consultant-info">
                                                    <h3>{c.name}</h3>
                                                    <p>{c.number}</p>
                                                </div>
                                                <div className="consultant-actions">
                                                    <a href={`tel:${c.number}`} className="consult-btn call">
                                                        <Phone size={18} /> Call
                                                    </a>
                                                    <button 
                                                        className="consult-btn copy"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(c.number);
                                                            alert('Number copied!');
                                                        }}
                                                    >
                                                        <Copy size={18} /> Copy
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="consultation-info-box">
                                        <span>ℹ️</span>
                                        <p>Consultations are available during scheduled hours. Please call to book an appointment.</p>
                                    </div>
                                </div>
                            ) : (
                                data[activeTab].map((item, index) => renderCard(item, activeTab, index))
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default WebEvents;
