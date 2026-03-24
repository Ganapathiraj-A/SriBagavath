import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MessageCircle, User } from 'lucide-react';
import { collection, query, getDocs, orderBy, where, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import PageHeader from '@/components/PageHeader';

const WhatsAppMessages = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            // Get messages from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const q = query(
                collection(db, 'whatsapp_messages'),
                where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
                orderBy('timestamp', 'asc'),
                limit(500)
            );
            
            const snapshot = await getDocs(q);
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background)' }}>
            <PageHeader
                title="Group Messages"
                leftAction={
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <ChevronLeft size={24} />
                    </button>
                }
            />

            <div 
                ref={scrollRef}
                style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem',
                    backgroundColor: '#e5ddd5' // Classic WhatsApp background color
                }}
            >
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                            Loading messages...
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'white', borderRadius: '1rem', boxShadow: 'var(--shadow-sm)', maxWidth: '20rem' }}>
                            <MessageCircle size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--color-text-muted)' }}>No messages found from the last 30 days.</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {messages.map((msg, index) => {
                            const formattedDate = formatDate(msg.timestamp);
                            const prevFormattedDate = index > 0 ? formatDate(messages[index-1].timestamp) : "";
                            const isNewDay = index === 0 || 
                                formattedDate.split(',')[0] !== prevFormattedDate.split(',')[0];

                            return (
                                <div key={msg.id}>
                                    {isNewDay && (
                                        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
                                            <span style={{ backgroundColor: 'rgba(255,255,255,0.7)', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', boxShadow: 'var(--shadow-sm)' }}>
                                                {formattedDate.split(',')[0]}
                                            </span>
                                        </div>
                                    )}
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        style={{
                                            alignSelf: 'flex-start',
                                            maxWidth: '85%',
                                            backgroundColor: 'white',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '0 0.75rem 0.75rem 0.75rem',
                                            boxShadow: '0 1px 0.5px rgba(0,0,0,0.1)',
                                            position: 'relative',
                                            marginBottom: '0.2rem'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#128c7e', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <User size={12} /> {msg.senderName || 'Unknown'}
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: '1.4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {msg.text}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '0.2rem' }}>
                                            {formattedDate.split(',')[1]}
                                        </div>
                                    </motion.div>
                                </div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
            
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Messages are synchronized every 30 minutes.
            </div>
        </div>
    );
};

export default WhatsAppMessages;
