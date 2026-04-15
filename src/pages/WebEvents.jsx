import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, RefreshCw, User, Youtube, ChevronRight, Copy } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from '../utils/FirestoreProxy';
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
    if (!master.isRecurring) {
        return master.date >= todayStr ? master : null;
    }

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
    const [zoomSubTab, setZoomSubTab] = useState('upcoming');
    const [data, setData] = useState({
        retreats: [],
        dailyZoom: [],
        dailyZoomPast: [],
        schedules: [],
        consultation: []
    });
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [youtubeVideos, setYoutubeVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

    const fetchYouTubePlaylist = async (pageToken = null) => {
        if (!pageToken) setIsYoutubeLoading(true);
        
        try {
            const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
            const playlistId = 'PLhfBLH1RxTuEKjzrKAznLcHZlQwUXJwWp';
            let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=12&playlistId=${playlistId}&key=${apiKey}`;
            
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.items) {
                const formattedVideos = data.items.map(item => ({
                    id: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    date: item.snippet.publishedAt,
                    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    youtubeUrl: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
                }));

                if (pageToken) {
                    setYoutubeVideos(prev => [...prev, ...formattedVideos]);
                } else {
                    setYoutubeVideos(formattedVideos);
                }
                setNextPageToken(data.nextPageToken || null);
            }
        } catch (error) {
            console.error("Error fetching YouTube playlist:", error);
        } finally {
            setIsYoutubeLoading(false);
        }
    };

    const tabs = [
        { id: 'retreats', name: 'Programs', icon: <Calendar size={18} /> },
        { id: 'schedules', name: "Ayya's Schedule", icon: <Calendar size={20} /> },
        { id: 'dailyZoom', name: 'Daily Zoom', icon: <Clock size={20} /> },
        { id: 'consultation', name: 'Consultation', icon: <User size={20} /> }
    ];

    useEffect(() => {
        let unsubPrograms, unsubSchedules, unsubMeetings, unsubLegacyZoom, unsubPastZoom, unsubTeachers;
        
        const fetchData = async () => {
            console.log("[WebEvents] FetchData Start");
            setLoading(true);
            const today = getLocalDateString();
            
            try {
                // 1. Live Programs Listener
                unsubPrograms = onSnapshot(
                    query(collection(db, 'programs'), where('programDate', '>=', today)),
                    (snap) => {
                        const list = snap.docs
                            .map(d => ({ id: d.id, ...d.data() }))
                            .filter(p => p.isActive !== false)
                            .sort((a, b) => (a.programDate || "").localeCompare(b.programDate || ""));
                        setData(prev => ({ ...prev, retreats: list }));
                        setLoading(false); 
                    },
                    (err) => console.error("[WebEvents] Programs listener failed:", err)
                );

                // 2. Schedules Listener (Ayya's Schedule)
                unsubSchedules = onSnapshot(collection(db, 'schedules'), (snap) => {
                    const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    const filtered = raw.filter(s => {
                        const dateVal = s.toDate || s.fromDate;
                        if (!dateVal) return true;
                        const dateStr = dateVal.toDate ? dateVal.toDate().toISOString().split('T')[0] : String(dateVal);
                        return dateStr >= today || dateStr.includes(today.substring(0, 7));
                    }).sort((a, b) => String(a.fromDate || "").localeCompare(String(b.fromDate || "")));
                    setData(prev => ({ ...prev, schedules: filtered }));
                });

                // 3. Online Meetings (Recurring & Manual) 
                let recursiveMeetings = [];
                let manualMeetings = [];

                const updateZoomData = () => {
                    const all = [...recursiveMeetings, ...manualMeetings];
                    const unique = Array.from(new Map(all.map(m => [m.id, m])).values());
                    const sorted = unique.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
                    setData(prev => ({ ...prev, dailyZoom: sorted }));
                };

                unsubMeetings = onSnapshot(collection(db, 'online_meetings'), (snap) => {
                    const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    recursiveMeetings = raw
                        .map(m => getNextOccurrence(m, today))
                        .filter(m => m !== null);
                    updateZoomData();
                });

                unsubLegacyZoom = onSnapshot(query(collection(db, 'daily_zoom_meetings'), where('date', '>=', today), orderBy('date', 'asc')), (snap) => {
                    manualMeetings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    updateZoomData();
                });

                unsubPastZoom = onSnapshot(query(collection(db, 'daily_zoom_meetings'), where('date', '<', today), orderBy('date', 'desc'), limit(20)), (snap) => {
                    setData(prev => ({ ...prev, dailyZoomPast: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
                });

                unsubTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
                    setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });

            } catch (error) {
                console.error("[WebEvents] Critical error in fetchData:", error);
                setLoading(false);
            }
        };

        fetchData();
        return () => {
            if (unsubPrograms) unsubPrograms();
            if (unsubSchedules) unsubSchedules();
            if (unsubMeetings) unsubMeetings();
            if (unsubLegacyZoom) unsubLegacyZoom();
            if (unsubPastZoom) unsubPastZoom();
            if (unsubTeachers) unsubTeachers();
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'dailyZoom' && zoomSubTab === 'past' && youtubeVideos.length === 0) {
            fetchYouTubePlaylist();
        }
    }, [activeTab, zoomSubTab]);

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

    const activeList = activeTab === 'dailyZoom' 
        ? (zoomSubTab === 'upcoming' ? data.dailyZoom : data.dailyZoomPast)
        : (data[activeTab] || []);

    // Helper to safely get speaker info across different formats
    const findSpeaker = (item) => {
        if (!teachers.length) return null;
        
        // 1. Try ID match (handle strings & refs)
        const targetId = item.teacherId?.id || (typeof item.teacherId === 'string' ? item.teacherId : null);
        if (targetId) {
            const found = teachers.find(t => t.id === targetId);
            if (found) return found;
        }
        
        // 2. Try Name match as fallback (with fuzzy and Tamil support)
        let targetName = (item.name || item.teacherName || item.speaker || item.topic || "").toLowerCase().trim();
        targetName = targetName.replace(/^daily zoom\s*-\s*/, '').replace(/^zoom\s*-\s*/, '');
        
        if (targetName && targetName !== "daily zoom" && targetName !== "zoom") {
            const match = teachers.find(t => {
                const tName = (t.name || "").toLowerCase().trim();
                const tNameTa = (t.name_ta || "").toLowerCase().trim();
                
                // Compare: Exact, Fuzzy English, or Fuzzy Tamil
                return tName === targetName || 
                       tName.includes(targetName) || 
                       targetName.includes(tName) ||
                       (tNameTa && tNameTa.includes(targetName));
            });
            if (match) return match;
        }
        
        return null;
    };

    return (
        <div className="web-events-page">
            <div className="web-container">
                <div className="emedia-header-spacer" />
                

                <div className="events-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`event-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'dailyZoom') setZoomSubTab('upcoming');
                            }}
                        >
                            {tab.icon}
                            <span>{tab.name}</span>
                            {activeTab === tab.id && <motion.div layoutId="tab-underline" className="tab-underline" />}
                        </button>
                    ))}
                </div>

                {activeTab === 'dailyZoom' && (
                    <div className="event-sub-tabs">
                        <button 
                            className={`sub-tab-btn ${zoomSubTab === 'upcoming' ? 'active' : ''}`}
                            onClick={() => setZoomSubTab('upcoming')}
                        >
                            Upcoming
                        </button>
                        <button 
                            className={`sub-tab-btn ${zoomSubTab === 'past' ? 'active' : ''}`}
                            onClick={() => setZoomSubTab('past')}
                        >
                            Past
                        </button>
                    </div>
                )}

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
                                    {(() => {
                                        const filtered = teachers
                                            .filter(t => t.showInConsultation === true)
                                            .sort((a, b) => {
                                                const orderA = a.consultationOrder !== undefined ? a.consultationOrder : 999;
                                                const orderB = b.consultationOrder !== undefined ? b.consultationOrder : 999;
                                                if (orderA !== orderB) return orderA - orderB;
                                                return (a.name || "").localeCompare(b.name || "");
                                            });
                                        
                                        if (filtered.length === 0) {
                                            return (
                                                <div className="web-no-results" style={{ gridColumn: '1 / -1' }}>
                                                    <p>No consultants available at the moment.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                {filtered.map(teacher => (
                                                    <div key={teacher.id} className="consultation-card">
                                                        <div className="teacher-photo-container">
                                                            <LazyImage 
                                                                src={[teacher.imageUrl, teacher.image, teacher.photo, teacher.photoURL, teacher.profilePic, teacher.profileImage, teacher.avatar, teacher.thumb].find(u => u && typeof u === 'string') || null} 
                                                                alt={teacher.name} 
                                                                className="teacher-photo" 
                                                                placeholder={() => <User size={24} color="#CBD5E1" />}
                                                                width="100%"
                                                                height="100%"
                                                            />
                                                        </div>
                                                        <div className="teacher-info">
                                                            <h3>{teacher.name}</h3>
                                                            <p className="teacher-phone-display">{teacher.phoneNumber || teacher.number || '---'}</p>
                                                            <div className="teacher-contact-actions">
                                                                <button 
                                                                    className="teacher-action-btn copy"
                                                                    onClick={() => {
                                                                        const num = teacher.phoneNumber || teacher.number;
                                                                        if (num) {
                                                                            navigator.clipboard.writeText(num);
                                                                            setCopiedId(teacher.id);
                                                                            setTimeout(() => setCopiedId(null), 2000);
                                                                        }
                                                                    }}
                                                                >
                                                                    {copiedId === teacher.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                                                                    {copiedId === teacher.id ? "Copied" : "Copy"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : activeTab === 'dailyZoom' && zoomSubTab === 'past' ? (
                                <div className="youtube-section-wrapper">
                                    {youtubeVideos.length > 0 ? (
                                        <>
                                            <div className="youtube-playlist-grid">
                                                {youtubeVideos.map((video, vIdx) => (
                                                    <div 
                                                        key={video.id} 
                                                        className="youtube-video-card"
                                                        onClick={() => window.open(video.youtubeUrl, '_blank')}
                                                    >
                                                        <div className="video-thumbnail-container">
                                                            <img src={video.thumbnail} alt={video.title} />
                                                            <div className="video-play-overlay">
                                                                <div className="play-icon-circle">
                                                                    <Youtube size={24} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="video-info">
                                                            <h4>{video.title}</h4>
                                                            <div className="video-meta">
                                                                <Clock size={14} />
                                                                <span>{new Date(video.date).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {nextPageToken && (
                                                <div className="load-more-container">
                                                    <button 
                                                        className="web-load-more-btn"
                                                        onClick={() => fetchYouTubePlaylist(nextPageToken)}
                                                        disabled={isYoutubeLoading}
                                                    >
                                                        {isYoutubeLoading ? <RefreshCw size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                                                        {isYoutubeLoading ? 'Loading...' : 'View Older Recordings'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : isYoutubeLoading ? (
                                        <div className="web-loading-placeholder" style={{ minHeight: '300px' }}>
                                            <RefreshCw className="animate-spin" size={32} />
                                            <p>Fetching recordings...</p>
                                        </div>
                                    ) : (
                                        <div className="web-no-results">
                                            <p>No past recordings found.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="events-list">
                                    {activeList.length > 0 ? activeList.map((item, idx) => {
                                        const speaker = findSpeaker(item);
                                        const displayName = speaker?.name || item.name || item.programName || item.place || item.title || 'Untitled Event';
                                        
                                        const displayImage = [
                                            speaker?.imageUrl, speaker?.image, speaker?.photo, speaker?.photoURL, speaker?.profilePic, speaker?.profileImage, speaker?.avatar, speaker?.thumb,
                                            item.imageUrl, item.image, item.photo, item.photoURL, item.profilePic, item.profileImage, item.avatar, item.thumb
                                        ].find(u => u && typeof u === 'string' && u.length > 0) || null;
                                        
                                        const displayDescription = speaker?.name 
                                            ? (item.description || item.programDescription || speaker.description) 
                                            : (item.description || item.programDescription || item.programName || item.place);
                                        
                                        return (
                                            <motion.div 
                                                key={item.id} 
                                                className="web-program-card"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                style={{ height: '100%' }}
                                            >
                                                <div className="program-card-inner">
                                                    {/* Left Column: Photo (if zoom/teacher) & Date Badge */}
                                                    <div className="program-card-left-col">
                                                        {activeTab === 'dailyZoom' && (
                                                            <div className="zoom-teacher-photo">
                                                                <LazyImage 
                                                                    src={displayImage} 
                                                                    alt={displayName} 
                                                                    placeholder={() => <User size={24} color="#CBD5E1" />}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="program-date-badge">
                                                            <span className="month">{new Date(item.programDate || item.fromDate || item.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span>
                                                            <span className="day">{new Date(item.programDate || item.fromDate || item.date).getDate()}</span>
                                                        </div>
                                                    </div>

                                                    {/* Info Content */}
                                                    <div className="program-info">
                                                        <h3 className="event-title">{displayName}</h3>
                                                        
                                                        <div className="event-details-rows">
                                                            {activeTab === 'dailyZoom' ? (
                                                                <p className="event-description-text">{displayDescription}</p>
                                                            ) : (
                                                                <div className="event-detail-row">
                                                                    <Calendar size={14} />
                                                                    <span>
                                                                        {new Date(item.programDate || item.fromDate || item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                                        {(item.programEndDate || item.toDate) && (
                                                                            <> - {new Date(item.programEndDate || item.toDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {(item.programCity || item.place || item.location) && (item.programCity || item.place || item.location) !== displayName && (
                                                                <div className="event-detail-row">
                                                                    <MapPin size={14} />
                                                                    <span>{item.programCity || item.place || item.location}</span>
                                                                </div>
                                                            )}
                                                            {item.isRecurring && (
                                                                <div className="event-detail-row recurrence">
                                                                    <RefreshCw size={14} />
                                                                    <span>{formatRecurrenceRule(item)}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions Row (only for Programs/Zoom, fixed Share for Schedule) */}
                                                        <div className="program-actions-row">
                                                            {activeTab === 'schedules' ? (
                                                                <button 
                                                                    onClick={() => {
                                                                        const text = `Ayya's Schedule: ${item.place}\n${new Date(item.fromDate).toLocaleDateString()} - ${new Date(item.toDate).toLocaleDateString()}`;
                                                                        navigator.clipboard.writeText(text);
                                                                        alert("Schedule copied to clipboard!");
                                                                    }} 
                                                                    className="web-btn-icon"
                                                                    style={{ marginLeft: 'auto' }}
                                                                    title="Copy Schedule"
                                                                >
                                                                    <Copy size={18} />
                                                                </button>
                                                            ) : (
                                                                <div className="event-card-actions">
                                                                    {(activeTab === 'retreats' && !item.joinLink && !item.joinUrl) && (
                                                                        <button 
                                                                            className="web-btn-primary register" 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate('/web/event-registration', { state: { program: item } });
                                                                            }}
                                                                        >
                                                                            Register Now
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {item.introYoutubeUrl && (
                                                                        <button 
                                                                            className="web-btn-secondary" 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(`/web/programs/retreat?id=${item.id}&tab=intro`);
                                                                            }}
                                                                        >
                                                                            Intro
                                                                        </button>
                                                                    )}

                                                                    <button 
                                                                        className={`web-btn-outline small ${!(item.joinLink || item.joinUrl) ? '' : 'full'}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (item.joinLink || item.joinUrl) window.open(item.joinLink || item.joinUrl, '_blank');
                                                                            else navigate(`/web/programs/retreat?id=${item.id}&tab=details`);
                                                                        }}
                                                                    >
                                                                        {(item.joinLink || item.joinUrl) ? 'Join Meeting' : 'Details'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    }) : (
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
