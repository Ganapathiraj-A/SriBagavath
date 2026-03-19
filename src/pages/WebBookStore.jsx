import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaShoppingCart, FaInfoCircle, FaPlus, FaMinus } from 'react-icons/fa';
import { db } from '@/firebase';
import { useCart } from '@/context/CartContext';
import { useAdminAuth } from '@/context/AdminAuthContext';
import LazyImage from '@/components/LazyImage';
import './WebPages.css';

const WebBookStore = () => {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tamil Books');

  const tabs = ['Tamil Books', 'English Books'];

  useEffect(() => {
    loadBooks();
  }, [activeTab]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      const q = query(
        collection(db, 'books'),
        where('category', '==', activeTab),
        orderBy('title', 'asc')
      );
      const snap = await getDocs(q);
      const books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(books);
    } catch (err) {
      console.error("Error loading books:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = products.reduce((acc, p) => acc + (p.price * (cart[p.id] || 0)), 0);

  return (
    <div className="web-bookstore">


      <section className="web-content-section">
        <div className="web-container">
          {/* Tabs */}
          <div className="web-tabs-container">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`web-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="web-loading">Loading books...</div>
          ) : (
            <div className="web-book-grid">
              {products.map(product => (
                <motion.div 
                  key={product.id} 
                  className="web-book-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="book-image-container" onClick={() => navigate(`/web/book/${product.id}`)}>
                    <LazyImage
                      firestorePath={`book_covers/${product.id}`}
                      alt={product.title}
                      width="100%"
                      height="200px"
                      borderRadius="8px"
                    />
                    <div className="book-overlay">
                      <FaInfoCircle /> View Details
                    </div>
                  </div>
                  <div className="book-info">
                    <h3>{product.title}</h3>
                    <p className="book-price">₹{product.price}</p>
                    
                    <div className="book-actions">
                      {cart[product.id] > 0 ? (
                        <div className="book-quantity-controls">
                          <button onClick={() => removeFromCart(product)}><FaMinus /></button>
                          <span>{cart[product.id]}</span>
                          <button onClick={() => addToCart(product)}><FaPlus /></button>
                        </div>
                      ) : (
                        <button className="web-btn-secondary" onClick={() => addToCart(product)}>
                          <FaShoppingCart /> Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {products.length === 0 && !loading && (
            <div className="web-empty-state">No books found in this category.</div>
          )}
        </div>
      </section>

      {/* Floating Cart for Web */}
      {totalCount > 0 && (
        <motion.div 
          className="web-floating-cart"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="cart-info">
            <span className="cart-count">{totalCount} Item(s)</span>
            <span className="cart-total">Total: ₹{totalPrice}</span>
          </div>
          <button className="web-btn-primary" onClick={() => navigate('/web/checkout', {
              state: {
                items: products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })),
                totalPrice
              }
          })}>
            Proceed to Checkout
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default WebBookStore;
