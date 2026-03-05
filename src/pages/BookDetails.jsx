
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IndianRupee, Plus, Minus, Share2, Loader2 } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import html2canvas from 'html2canvas';
import { ensureGoogleAuthInitialized } from '@/utils/GoogleAuthUtils';
import { auth, db } from '@/firebase';
import { doc, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import PageHeader from '@/components/PageHeader';
import { useCart } from '@/context/CartContext';

const BookDetails = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const { cart, addToCart, removeFromCart } = useCart();
    const [book, setBook] = useState(null);
    const [cover, setCover] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const shareRef = useRef(null);
    const [sharingData, setSharingData] = useState(null);

    const ensureAuth = async () => {
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
            return true;
        }

        setAuthLoading(true);
        try {
            await ensureGoogleAuthInitialized();

            let idToken = null;
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                idToken = googleUser?.authentication?.idToken;
            } else {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                return true;
            }

            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return true;
        } catch (_err) {
            console.error("Auth failed:", _err);
            return false;
        } finally {
            setAuthLoading(false);
        }
    };

    const handleAddToCart = async () => {
        if (await ensureAuth()) {
            addToCart(book);
        }
    };

    const fetchAsBase64 = async (url) => {
        if (!url || !url.startsWith('http')) return url;
        try {
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("fetchAsBase64 failed:", e);
            return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";
        }
    };

    const captureAndShare = async (dataOverride = null) => {
        if (!shareRef.current) return;
        const currentData = dataOverride || sharingData;
        if (!currentData) return;

        try {
            const canvas = await html2canvas(shareRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#ffffff',
                width: 800,
                onclone: (doc) => {
                    const el = doc.getElementById('share-container-wrapper');
                    if (el) {
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                    }
                }
            });

            const finalData = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
            const fileName = `book_share_${Date.now()}.jpg`;

            const result = await Filesystem.writeFile({
                path: fileName,
                data: finalData,
                directory: Directory.Cache
            });

            await Share.share({
                title: currentData.title,
                text: `Check out this book: ${currentData.title}\n\nDownload Sri Bagavath App for latest updates`,
                files: [result.uri]
            });
        } catch (error) {
            console.error("captureAndShare error:", error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleShare = async () => {
        if (!book) return;
        setIsSharing(true);

        try {
            const b64Cover = await fetchAsBase64(cover);
            const shareInfo = {
                title: book.title,
                category: book.category,
                price: book.price,
                description: book.description,
                cover: b64Cover
            };
            setSharingData(shareInfo);
            setTimeout(() => captureAndShare(shareInfo), 1000);
        } catch (error) {
            console.error('Error sharing book:', error);
            setIsSharing(false);
        }
    };

    const handleRemoveFromCart = async () => {
        if (await ensureAuth()) {
            removeFromCart(book);
        }
    };

    useEffect(() => {
        const fetchBookDetails = async () => {
            try {
                setLoading(true);
                const bookDoc = await getDocCacheFirst(doc(db, 'books', bookId));
                if (bookDoc.exists()) {
                    setBook({ id: bookDoc.id, ...bookDoc.data() });

                    if (bookDoc.data().hasCover) {
                        const coverDoc = await getDocCacheFirst(doc(db, 'book_covers', bookId));
                        if (coverDoc.exists()) {
                            setCover(coverDoc.data().cover);
                        }
                    }
                }
            } catch (_err) {
                console.error("Error fetching book details:", _err);
            } finally {
                setLoading(false);
            }
        };

        fetchBookDetails();
    }, [bookId]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading details...</p>
            </div>
        );
    }

    if (!book) {
        return (
            <div style={{ minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
                <PageHeader title="Book Not Found" />
                <button onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>Go Back</button>
            </div>
        );
    }

    const quantity = cart[bookId] || 0;

    return (
        <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', paddingBottom: '100px' }}>
            <PageHeader title="Book Details" />

            <div style={{ padding: '16px' }}>
                <div className="card" style={{ padding: '20px', overflow: 'hidden', backgroundColor: 'var(--color-card)', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '3/4', backgroundColor: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                            {cover ? (
                                <img src={cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ color: 'var(--color-text-light)' }}>No Cover Available</div>
                            )}
                        </div>

                        <div style={{ width: '100%' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-text)', marginBottom: '8px' }}>{book.title}</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', marginBottom: '16px' }}>{book.category}</p>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>₹{book.price}</div>
                                <button
                                    onClick={handleShare}
                                    disabled={isSharing}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        backgroundColor: 'var(--color-surface)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary)',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: isSharing ? 'wait' : 'pointer',
                                        opacity: isSharing ? 0.7 : 1
                                    }}
                                >
                                    {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                                    Share
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginBottom: '24px' }}>
                                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--color-text)', whiteSpace: 'pre-line' }}>
                                    {book.description || 'No description available for this book.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {quantity > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: 'var(--color-surface)', padding: '8px 16px', borderRadius: '12px' }}>
                                        <button
                                            onClick={handleRemoveFromCart}
                                            disabled={authLoading}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: authLoading ? 'wait' : 'pointer' }}
                                        >
                                            <Minus size={24} />
                                        </button>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', minWidth: '24px', textAlign: 'center', color: 'var(--color-text)' }}>{quantity}</span>
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={authLoading}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: authLoading ? 'wait' : 'pointer' }}
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={authLoading}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: authLoading ? 'wait' : 'pointer' }}
                                    >
                                        <IndianRupee size={20} /> {authLoading ? 'Signing in...' : 'Add to Cart'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Shareable Template */}
            <div style={{
                position: 'fixed',
                top: '0',
                left: '0',
                width: '800px',
                zIndex: -1000,
                opacity: 0.01,
                pointerEvents: 'none'
            }}>
                {sharingData && (
                    <div
                        id="share-container-wrapper"
                        ref={shareRef}
                        style={{
                            width: '800px',
                            backgroundColor: '#ffffff',
                            padding: '40px',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h1 style={{ color: '#f97316', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 800 }}>
                                Sri Bagavath App
                            </h1>
                            <div style={{ height: '3px', width: '80px', backgroundColor: '#f97316', margin: '0 auto' }}></div>
                        </div>

                        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
                            {/* Left: Cover */}
                            <div style={{ width: '300px', flexShrink: 0 }}>
                                {sharingData.cover && (
                                    <img
                                        src={sharingData.cover}
                                        style={{
                                            width: '100%',
                                            borderRadius: '20px',
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            border: '1px solid #e5e7eb'
                                        }}
                                        alt=""
                                    />
                                )}
                            </div>

                            {/* Right: Details */}
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '32px', color: '#111827', margin: '0 0 10px 0', fontWeight: 800, lineHeight: 1.2 }}>
                                    {sharingData.title}
                                </h2>
                                <p style={{
                                    display: 'inline-block',
                                    padding: '6px 16px',
                                    backgroundColor: '#fff7ed',
                                    color: '#ea580c',
                                    borderRadius: '9999px',
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    marginBottom: '20px'
                                }}>
                                    {sharingData.category}
                                </p>

                                <div style={{ fontSize: '28px', fontWeight: 800, color: '#f97316', marginBottom: '24px' }}>
                                    ₹{sharingData.price}
                                </div>

                                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
                                    <p style={{ fontSize: '18px', lineHeight: 1.6, color: '#374151', margin: 0, whiteSpace: 'pre-line' }}>
                                        {sharingData.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', textAlign: 'center', backgroundColor: '#f97316', padding: '20px', borderRadius: '15px', color: 'white' }}>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                                Download Sri Bagavath App for latest updates
                            </p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                                For latest spiritual updates and publications
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookDetails;
