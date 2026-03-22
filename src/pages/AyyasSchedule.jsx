import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, ChevronLeft, Loader2, X, Info, TestTube2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';
import { db } from '@/firebase';
import { collection, query, orderBy } from '@/utils/FirestoreProxy';
import { getLocalDateString } from '@/utils/dateUtils';
import { useAdminAuth } from '@/context/AdminAuthContext';

const AyyasSchedule = () => {
    const navigate = useNavigate();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSharingAll, setIsSharingAll] = useState(false);
    const [sharingData, setSharingData] = useState(null);
    const [isSharingScheduleId, setIsSharingScheduleId] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [capturedFileUri, setCapturedFileUri] = useState(null);
    const [fileStats, setFileStats] = useState(null);
    const [shareInProgress, setShareInProgress] = useState(false);
    const shareRef = useRef(null);
    const { loading: authGlobalLoading } = useAdminAuth();

    useEffect(() => {
        const fetchSchedules = async () => {
            if (authGlobalLoading) return;
            try {
                const { getDocsFromCache, getDocsFromServer } = await import('@/utils/FirestoreProxy');
                const filterSchedules = (list) => {
                    const today = getLocalDateString();
                    return list.filter(s => (s.toDate || s.fromDate) >= today);
                };
                const q = query(collection(db, 'schedules'), orderBy('fromDate', 'asc'));
                const cacheSnap = await getDocsFromCache(q).catch(() => null);
                if (cacheSnap && !cacheSnap.empty) {
                    setSchedules(filterSchedules(cacheSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
                    setLoading(false);
                }
                getDocsFromServer(q).then(serverSnap => {
                    setSchedules(filterSchedules(serverSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
                }).finally(() => setLoading(false));
            } catch (_err) { setLoading(false); }
        };
        fetchSchedules();
    }, [authGlobalLoading]);

    const captureAndShare = async (currentData) => {
        if (!currentData) return;
        try {
            setIsCapturing(true);
            await new Promise(resolve => setTimeout(resolve, 1500)); 
            if (!shareRef.current) throw new Error("Capture ref not found");
            
            const canvas = await html2canvas(shareRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff', width: 800 });
            
            // Convert to Blob for internal preview (GUARANTEED TO WORK)
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            const blobUrl = URL.createObjectURL(blob);
            setPreviewUrl(blobUrl);

            // Robust Base64 conversion
            const reader = new FileReader();
            const base64Data = await new Promise((resolve) => {
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(blob);
            });

            const fileName = `schedule_${Date.now()}.jpg`;
            
            // Using External Storage for cross-app visibility
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.External,
                encoding: 'base64'
            });

            const stats = await Filesystem.stat({ path: fileName, directory: Directory.External });
            
            setFileStats({ ...stats, sizeKb: Math.round(stats.size / 1024) });
            setCapturedFileUri(result.uri);
            setIsCapturing(false);
        } catch (error) {
            alert('Capture failed: ' + error.message);
            setIsCapturing(false);
            setIsSharingAll(false);
            setIsSharingScheduleId(null);
        }
    };

    const finalShare = async (mode = 'normal') => {
        if (!capturedFileUri && mode !== 'dummy') return;
        setShareInProgress(true);
        try {
            const { Toast } = await import('@capacitor/toast');
            if (mode === 'dummy') {
                const dummyResult = await Filesystem.writeFile({
                    path: `test_${Date.now()}.txt`,
                    data: "Sri Bagavath App Test",
                    directory: Directory.External,
                    encoding: 'utf8'
                });
                await Share.share({ title: "Test", text: "Test", files: [dummyResult.uri] });
            } else if (mode === 'diagnostic') {
                alert(`URI: ${capturedFileUri}\nSize: ${fileStats?.sizeKb}KB`);
            } else {
                await Toast.show({ text: 'Sharing Image...' });
                // Clean share
                await Share.share({
                    files: [capturedFileUri]
                });
            }
            if (mode !== 'diagnostic') resetSharing();
            else setShareInProgress(false);
        } catch (error) {
            alert('Share Error: ' + error.message);
            setShareInProgress(false);
        }
    };

    const resetSharing = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setCapturedFileUri(null);
        setFileStats(null);
        setIsSharingAll(false);
        setIsSharingScheduleId(null);
        setSharingData(null);
        setShareInProgress(false);
        setIsCapturing(false);
    };

    const handleShareAll = async () => {
        if (schedules.length === 0) return;
        setIsSharingAll(true);
        setSharingData({ type: 'list', schedules: [...schedules], location: 'All Locations' });
        setTimeout(() => captureAndShare({ type: 'list' }), 100);
    };

    const handleShare = async (schedule) => {
        if (!schedule) return;
        setIsSharingScheduleId(schedule.id);
        setSharingData({ type: 'single', schedule, location: schedule.place });
        setTimeout(() => captureAndShare({ type: 'single' }), 100);
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', paddingBottom: '2rem' }}>
            <PageHeader
                title="Ayya's Schedule"
                leftAction={<button onClick={() => navigate('/programs')} style={{ background: 'none', border: 'none', padding: '8px' }}><ChevronLeft size={24} /></button>}
                rightAction={
                    <button onClick={handleShareAll} disabled={isSharingAll || schedules.length === 0} style={{ width: '40px', height: '40px', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSharingAll ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                    </button>
                }
            />

            <div style={{ padding: '1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {schedules.map((schedule, index) => (
                        <motion.div key={schedule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} style={{ backgroundColor: 'var(--color-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--color-primary-transparent)', color: 'var(--color-primary)', padding: '1rem', borderRadius: '0.75rem', minWidth: '5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{new Date(schedule.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{new Date(schedule.fromDate).getDate()}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{schedule.place}</h2>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{new Date(schedule.fromDate).toLocaleDateString()} - {new Date(schedule.toDate).toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => handleShare(schedule)} disabled={isSharingScheduleId === schedule.id} style={{ border: 'none', background: 'none', color: 'var(--color-primary)' }}>
                                {isSharingScheduleId === schedule.id ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {previewUrl && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ backgroundColor: 'white', borderRadius: '1.5rem', width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Review Image</h3>
                                    {fileStats && <div style={{ fontSize: '0.75rem', color: '#ea580c' }}>Ready: {fileStats.sizeKb} KB (External)</div>}
                                </div>
                                <button onClick={resetSharing} style={{ padding: '4px', border: 'none', background: 'none' }}><X size={20} /></button>
                            </div>
                            
                            <div style={{ padding: '1rem', background: '#f8fafc', textAlign: 'center' }}>
                                <img src={previewUrl} style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} alt="Preview" />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                                    <button onClick={() => finalShare('diagnostic')} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0' }}><Info size={12} style={{ display: 'inline' }} /> Path</button>
                                    <button onClick={() => finalShare('dummy')} style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'white', border: '1px solid #e2e8f0' }}><TestTube2 size={12} style={{ display: 'inline' }} /> Dummy</button>
                                </div>
                            </div>

                            <div style={{ padding: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                                <button onClick={resetSharing} disabled={shareInProgress} style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600 }}>Cancel</button>
                                <button onClick={() => finalShare('normal')} disabled={shareInProgress} style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', background: '#ea580c', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {shareInProgress ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                                    Share Now
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isCapturing && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ marginBottom: '20px' }}><Loader2 size={32} className="animate-spin" style={{ color: '#ea580c' }} /></div>
                    <div ref={shareRef} style={{ width: '800px', backgroundColor: 'white', padding: '60px 40px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h1 style={{ color: '#ea580c', fontSize: '32px', fontWeight: 800, margin: 0 }}>Ayya's Schedule</h1>
                            <div style={{ height: '4px', width: '100px', backgroundColor: '#ea580c', margin: '10px auto' }}></div>
                        </div>
                        {sharingData?.type === 'single' ? (
                            <div style={{ backgroundColor: '#fff7ed', borderRadius: '25px', padding: '40px', border: '1px solid #ffedd5', textAlign: 'center' }}>
                                <h2 style={{ fontSize: '36px', fontWeight: 800 }}>{sharingData.schedule.place}</h2>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                                    <div style={{ background: 'white', padding: '15px 25px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                                        <div style={{ color: '#ea580c', fontWeight: 700, fontSize: '14px' }}>FROM</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800 }}>{new Date(sharingData.schedule.fromDate).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ background: 'white', padding: '15px 25px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                                        <div style={{ color: '#ea580c', fontWeight: 700, fontSize: '14px' }}>TO</div>
                                        <div style={{ fontSize: '20px', fontWeight: 800 }}>{new Date(sharingData.schedule.toDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {sharingData?.schedules?.slice(0, 10).map(s => (
                                    <div key={s.id} style={{ backgroundColor: '#fff7ed', borderRadius: '20px', padding: '25px', border: '1px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '30px' }}>
                                        <div style={{ minWidth: '100px', textAlign: 'center', background: 'white', padding: '15px', borderRadius: '15px' }}>
                                            <div style={{ color: '#ea580c', fontWeight: 700 }}>{new Date(s.fromDate).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</div>
                                            <div style={{ fontSize: '30px', fontWeight: 800 }}>{new Date(s.fromDate).getDate()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: 700 }}>{s.place}</div>
                                            <div style={{ color: '#4b5563' }}>{new Date(s.fromDate).toLocaleDateString()} - {new Date(s.toDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginTop: '50px', textAlign: 'center', color: '#ea580c', fontSize: '22px', fontWeight: 800 }}>Sri Bagavath</div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
        </div>
    );
};

export default AyyasSchedule;
