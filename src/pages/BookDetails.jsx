
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, IndianRupee, Plus, Minus } from 'lucide-react';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import PageHeader from '../components/PageHeader';
import { useCart } from '../context/CartContext';

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
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser?.authentication?.idToken;
            if (!idToken) throw new Error("No ID Token received");

            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return true;
        } catch (err) {
            console.error("Auth failed:", err);
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

    const handleRemoveFromCart = async () => {
        if (await ensureAuth()) {
            removeFromCart(book);
        }
    };

    useEffect(() => {
        const fetchBookDetails = async () => {
            try {
                setLoading(true);
                const bookDoc = await getDoc(doc(db, 'books', bookId));
                if (bookDoc.exists()) {
                    setBook({ id: bookDoc.id, ...bookDoc.data() });

                    if (bookDoc.data().hasCover) {
                        const coverDoc = await getDoc(doc(db, 'book_covers', bookId));
                        if (coverDoc.exists()) {
                            setCover(coverDoc.data().cover);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching book details:", error);
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
        <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '100px' }}>
            <PageHeader title="Book Details" />

            <div style={{ padding: '16px' }}>
                <div className="card" style={{ padding: '20px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                        <div style={{ width: '100%', maxWidth: '300px', aspectRatio: '3/4', backgroundColor: '#f3f4f6', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            {cover ? (
                                <img src={cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ color: '#9ca3af' }}>No Cover Available</div>
                            )}
                        </div>

                        <div style={{ width: '100%' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>{book.title}</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', backgroundColor: '#f3f4f6', display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', marginBottom: '16px' }}>{book.category}</p>

                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '20px' }}>₹{book.price}</div>

                            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px', marginBottom: '24px' }}>
                                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-line' }}>
                                    {book.description || 'No description available for this book.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {quantity > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#f3f4f6', padding: '8px 16px', borderRadius: '12px' }}>
                                        <button
                                            onClick={handleRemoveFromCart}
                                            disabled={authLoading}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: authLoading ? 'wait' : 'pointer' }}
                                        >
                                            <Minus size={24} />
                                        </button>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
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
