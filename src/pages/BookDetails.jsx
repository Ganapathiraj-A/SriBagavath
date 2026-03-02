
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, IndianRupee, Plus, Minus, Share2 } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
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

    const handleShare = async () => {
        if (!book) return;

        const text = `
📙 *${book.title}*
_${book.category}_

💰 *Price:* ₹${book.price}

📖 *Description:*
${book.description || 'No description available.'}
        `.trim() + `\n\nDownload the Sri Bagavath App for the latest updates`;

        const appUrl = 'https://play.google.com/store/apps/details?id=com.bhavathpathai.app&pcampaignid=web_share';

        try {
            let files = [];
            if (cover) {
                const cleanBase64 = cover.includes(',') ? cover.split(',')[1] : cover;
                const fileName = `book_${book.id}_${Date.now()}.jpg`;
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: cleanBase64,
                    directory: Directory.Cache
                });
                files.push(result.uri);
            }

            await Share.share({
                title: book.title,
                text: text,
                url: appUrl,
                files: files.length > 0 ? files : undefined
            });
        } catch (_err) {
            console.error('Error sharing book:', _err);
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                alert('Details copied to clipboard!');
            }
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
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Share2 size={18} /> Share
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
        </div>
    );
};

export default BookDetails;
