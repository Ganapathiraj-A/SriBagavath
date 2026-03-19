import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaShoppingCart, FaPlus, FaMinus, FaShareAlt } from 'react-icons/fa';
import { db } from '@/firebase';
import { useCart } from '@/context/CartContext';
import LazyImage from '@/components/LazyImage';
import './WebPages.css';

const WebBookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCart();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBook();
  }, [id]);

  const loadBook = async () => {
    setLoading(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'books', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setBook({ id: snap.id, ...snap.data() });
      }
    } catch (err) {
      console.error("Error loading book:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="web-loading">Loading book details...</div>;
  if (!book) return <div className="web-empty-state">Book not found.</div>;

  const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.keys(cart).reduce((acc, key) => {
     // Note: This only works if we have the book data. In a real app we'd fetch prices for all items in cart.
     // For now, we'll just show the button if cart is not empty.
     return acc + (cart[key] > 0 ? 1 : 0);
  }, 0);

  return (
    <div className="web-book-details">
      <section className="web-content-section" style={{ paddingTop: '30px' }}>
        <div className="web-container">
          <button className="web-back-link" onClick={() => navigate('/web/store')} style={{ marginBottom: '30px' }}>
            <FaArrowLeft /> Back to Store
          </button>
          <div className="web-details-grid">
            <div className="details-image">
              <LazyImage
                firestorePath={`book_covers/${book.id}`}
                alt={book.title}
                width="100%"
                height="auto"
                borderRadius="12px"
              />
            </div>
            <div className="details-info">
              <span className="details-category">{book.category}</span>
              <h2>{book.title}</h2>
              <p className="details-price">₹{book.price}</p>
              
              <div className="details-description">
                <h3>Description</h3>
                <p>{book.description || "No description available for this book."}</p>
              </div>

              <div className="details-actions">
                {cart[book.id] > 0 ? (
                  <div className="book-quantity-controls large">
                    <button onClick={() => removeFromCart(book)}><FaMinus /></button>
                    <span>{cart[book.id]}</span>
                    <button onClick={() => addToCart(book)}><FaPlus /></button>
                  </div>
                ) : (
                  <button className="web-btn-primary" onClick={() => addToCart(book)}>
                    <FaShoppingCart /> Add to Cart
                  </button>
                )}
                <button className="web-btn-secondary outline" onClick={() => {
                   if (navigator.share) {
                     navigator.share({
                       title: book.title,
                       text: `Check out ${book.title} by Sri Bagavath Ayya`,
                       url: window.location.href
                     });
                   } else {
                     alert("Link copied to clipboard!");
                     navigator.clipboard.writeText(window.location.href);
                   }
                }}>
                  <FaShareAlt /> Share
                </button>
              </div>

              <div className="details-meta">
                 <p><strong>Language:</strong> {book.category.split(' ')[0]}</p>
                 <p><strong>Availability:</strong> In Stock</p>
                 <p><strong>Shipping:</strong> Standard shipping applies.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reusing Floating Cart */}
      {totalCount > 0 && (
        <motion.div 
          className="web-floating-cart"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="cart-info">
            <span className="cart-count">{totalCount} Item(s) in Cart</span>
          </div>
          <button className="web-btn-primary" onClick={() => navigate('/web/checkout')}>
            Proceed to Checkout
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default WebBookDetails;
