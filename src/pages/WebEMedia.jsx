import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Music, Video, ExternalLink, ChevronRight, Folder, Loader2 } from 'lucide-react';
import { collection, query, getDocs, orderBy } from '../utils/FirestoreProxy';
import { db } from '../firebase';
import emediaData from '../data/emedia.json';
import LazyImage from '../components/LazyImage';
import './WebPages.css';

const WebEMedia = () => {
    const [activeTab, setActiveTab] = useState('pdf');
    const [activeLanguage, setActiveLanguage] = useState(emediaData.digitalBooks.languages[0]?.id || 'tamil');
    const [currentMagazineFolder, setCurrentMagazineFolder] = useState(null);
    
    // Firestore Data
    const [videos, setVideos] = useState([]);
    const [videoCategories, setVideoCategories] = useState([]);
    const [loadingVideos, setLoadingVideos] = useState(true);

    useEffect(() => {
        const fetchVideoData = async () => {
            try {
                // Fetch Videos
                const vQuery = query(collection(db, 'relatedVideos'), orderBy('order', 'asc'));
                const vSnap = await getDocs(vQuery);
                setVideos(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch Categories
                const cQuery = query(collection(db, 'video_categories'), orderBy('order', 'asc'));
                const cSnap = await getDocs(cQuery);
                setVideoCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching video data:", error);
            } finally {
                setLoadingVideos(false);
            }
        };

        fetchVideoData();
    }, []);


    const tabs = [
        { id: 'pdf', name: 'Digital Books', icon: <Book size={20} /> },
        { id: 'audio', name: 'Audio Books', icon: <Music size={20} /> },
        { id: 'magazine', name: 'Monthly Magazine', icon: <Book size={20} /> },
        { id: 'video', name: 'Videos', icon: <Video size={20} /> }
    ];

    const renderPDFSection = () => {
        const langData = emediaData.digitalBooks.languages.find(l => l.id === activeLanguage);
        const books = langData?.books || [];

        return (
            <div className="emedia-content-section">
                <div className="emedia-language-tabs">
                    {emediaData.digitalBooks.languages.map(lang => (
                        <button
                            key={lang.id}
                            className={`emedia-lang-btn ${activeLanguage === lang.id ? 'active' : ''}`}
                            onClick={() => setActiveLanguage(lang.id)}
                        >
                            {lang.name}
                        </button>
                    ))}
                </div>

                <motion.div
                    key={activeLanguage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="emedia-grid"
                >
                    {books.map((book, index) => (
                        <a
                            key={book.id}
                            href={book.webViewLink || `https://drive.google.com/file/d/${book.id}/view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="emedia-card pdf-card"
                        >
                            <div className="emedia-card-image book-cover">
                                {book.cover ? (
                                    <LazyImage src={book.cover} alt={book.name} priority={index < 8} />
                                ) : (
                                    <div className="emedia-placeholder-icon">
                                        <Book size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="emedia-card-info">
                                <h3 className="emedia-month-display">{book.name}</h3>
                            </div>
                            <ExternalLink size={18} className="emedia-external-icon" />
                        </a>
                    ))}
                    
                </motion.div>
            </div>
        );
    };

    const extractMonth = (name) => {
        const tamilMonths = [
            'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 
            'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
        ];
        const monthMap = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
            'january': 0, 'february': 1, 'march': 2, 'april': 3, 'june': 5,
            'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
        };

        for (let i = 0; i < tamilMonths.length; i++) {
            if (name.includes(tamilMonths[i])) return { name: tamilMonths[i], index: i };
        }

        const lowerName = name.toLowerCase();
        for (const [eng, index] of Object.entries(monthMap)) {
            if (lowerName.includes(eng)) return { name: tamilMonths[index], index: index };
        }
        return null;
    };

    const renderMagazineSection = () => {
        const data = emediaData.digitalBooks.magazineData || { root: [], folders: {} };
        
        const currentFiles = currentMagazineFolder ? (data.folders[currentMagazineFolder] || []) : data.root;
        
        // Find Folder Info for Title Display
        const folderInfo = currentMagazineFolder ? data.root.find(f => f.id === currentMagazineFolder) : null;

        // Split and sort: Files first, then folders
        const folders = currentFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
        
        const rawFiles = currentFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        const files = rawFiles.map(file => {
            const mData = extractMonth(file.name);
            return {
                ...file,
                displayMonth: mData ? mData.name : file.name,
                monthIndex: mData ? mData.index : 99 
            };
        }).sort((a, b) => a.monthIndex - b.monthIndex);

        return (
            <div className="emedia-content-section">
                {currentMagazineFolder && (
                    <div className="emedia-folder-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <button 
                            className="emedia-back-btn"
                            onClick={() => setCurrentMagazineFolder(null)}
                            style={{ margin: 0 }}
                        >
                            <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                            Back to Years
                        </button>
                        {folderInfo && (
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--web-header-bg)', margin: 0 }}>
                                {folderInfo.name}
                            </h2>
                        )}
                    </div>
                )}
                
                <div className="emedia-grid">
                    {/* Display Files First */}
                    {files.map((file) => {
                        return (
                            <a
                                key={file.id}
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="emedia-card pdf-card magazine-card file"
                                style={{ justifyContent: 'center', padding: '30px' }}
                            >
                                <div className="emedia-card-info" style={{ textAlign: 'center' }}>
                                    {/* Using emedia-month-display class to enforce Noto Sans Tamil and fix ligature rendering bugs */}
                                    <h3 
                                        className="emedia-month-display"
                                        style={{ fontSize: '1.5rem', margin: 0 }}
                                    >
                                        {file.displayMonth}
                                    </h3>
                                </div>
                            </a>
                        );
                    })}

                    {/* Display Folders Second */}
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className="emedia-card pdf-card magazine-card folder"
                            onClick={() => setCurrentMagazineFolder(folder.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="emedia-card-image magazine-thumbnail">
                                <div className="emedia-placeholder-icon folder full">
                                    <Folder size={64} />
                                </div>
                            </div>
                            <div className="emedia-card-info">
                                <h3>{folder.name}</h3>
                                <p>Browse Archive</p>
                            </div>
                            <ChevronRight size={20} className="emedia-chevron" />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAudioSection = () => (
        <div className="emedia-content-section">
            <div className="emedia-grid">
                {emediaData.audioBooks.map((book, index) => (
                    <a
                        key={book.id}
                        href={book.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="emedia-card audio-card"
                    >
                        <div className="emedia-card-image">
                            {book.imageUrl ? (
                                <LazyImage src={book.imageUrl} alt={book.title} priority={index < 8} />
                            ) : (
                                <div className="emedia-placeholder-icon">
                                    <Music size={32} />
                                </div>
                            )}
                        </div>
                        <div className="emedia-card-info">
                            <h3 className="emedia-month-display">{book.title}</h3>
                        </div>
                        <ChevronRight size={20} className="emedia-chevron" />
                    </a>
                ))}
            </div>
        </div>
    );

    const renderVideoSection = () => {
        if (loadingVideos) {
            return (
                <div className="web-loading-state">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{ color: 'var(--web-nav-bg)' }}
                    >
                        <Loader2 size={40} />
                    </motion.div>
                    <p>Loading videos...</p>
                </div>
            );
        }

        const generalVideos = videos.filter(v => (v.category || 'general') === 'general');
        const teacherVideos = videos.filter(v => v.category === 'teachers');
        const otherVideos = videos.filter(v => v.category === 'others');

        return (
            <div className="emedia-content-section">
                <div className="emedia-grid video-grid-layout">
                    {/* Column 1: General */}
                    <div>
                        <h2 className="emedia-section-title" style={{ marginTop: 0 }}>General Playlist</h2>
                        <div className="emedia-vertical-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {generalVideos.length > 0 ? generalVideos.map((video) => (
                                <a
                                    key={video.id}
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="emedia-card video-card"
                                >
                                    <div className="emedia-card-icon video">
                                        <Video size={24} />
                                    </div>
                                    <div className="emedia-card-info">
                                        <h3>{video.title}</h3>
                                    </div>
                                    <ExternalLink size={18} className="emedia-external-icon" />
                                </a>
                            )) : (
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No general videos yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Teachers & Others */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {/* Teachers Section */}
                        <div>
                            <h2 className="emedia-section-title" style={{ marginTop: 0 }}>Teachers</h2>
                            <div className="teachers-split-container">
                                {teacherVideos.length > 0 ? (
                                    <>
                                        <div className="teachers-split-col">
                                            {teacherVideos.slice(0, Math.ceil(teacherVideos.length / 2)).map((video) => (
                                                <a
                                                    key={video.id}
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="emedia-card video-card"
                                                >
                                                    <div className="emedia-card-icon video alt">
                                                        <Video size={24} />
                                                    </div>
                                                    <div className="emedia-card-info">
                                                        <h3>{video.title}</h3>
                                                    </div>
                                                    <ExternalLink size={18} className="emedia-external-icon" />
                                                </a>
                                            ))}
                                        </div>
                                        <div className="teachers-split-col">
                                            {teacherVideos.slice(Math.ceil(teacherVideos.length / 2)).map((video) => (
                                                <a
                                                    key={video.id}
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="emedia-card video-card"
                                                >
                                                    <div className="emedia-card-icon video alt">
                                                        <Video size={24} />
                                                    </div>
                                                    <div className="emedia-card-info">
                                                        <h3>{video.title}</h3>
                                                    </div>
                                                    <ExternalLink size={18} className="emedia-external-icon" />
                                                </a>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No teacher videos yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Others Section (Dynamic Categories) */}
                        {videoCategories.map(cat => {
                            const catVideos = otherVideos.filter(v => v.customCategoryId === cat.id);
                            if (catVideos.length === 0) return null;

                            return (
                                <div key={cat.id}>
                                    <h2 className="emedia-section-title">{cat.name}</h2>
                                    <div className="teachers-split-container">
                                        <div className="teachers-split-col">
                                            {catVideos.slice(0, Math.ceil(catVideos.length / 2)).map((video) => (
                                                <a
                                                    key={video.id}
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="emedia-card video-card"
                                                >
                                                    <div className="emedia-card-icon video" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                                                        <Video size={24} />
                                                    </div>
                                                    <div className="emedia-card-info">
                                                        <h3>{video.title}</h3>
                                                    </div>
                                                    <ExternalLink size={18} className="emedia-external-icon" />
                                                </a>
                                            ))}
                                        </div>
                                        <div className="teachers-split-col">
                                            {catVideos.slice(Math.ceil(catVideos.length / 2)).map((video) => (
                                                <a
                                                    key={video.id}
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="emedia-card video-card"
                                                >
                                                    <div className="emedia-card-icon video" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                                                        <Video size={24} />
                                                    </div>
                                                    <div className="emedia-card-info">
                                                        <h3>{video.title}</h3>
                                                    </div>
                                                    <ExternalLink size={18} className="emedia-external-icon" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="web-emedia-page">
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
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTabUnderline" className="active-underline" />
                            )}
                        </button>
                    ))}
                </nav>

                <main className="emedia-main">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'pdf' && renderPDFSection()}
                            {activeTab === 'magazine' && renderMagazineSection()}
                            {activeTab === 'audio' && renderAudioSection()}
                            {activeTab === 'video' && renderVideoSection()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default WebEMedia;
