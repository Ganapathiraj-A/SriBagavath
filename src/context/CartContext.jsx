
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('bookstore_cart');
        return savedCart ? JSON.parse(savedCart) : {};
    });

    useEffect(() => {
        localStorage.setItem('bookstore_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (product) => {
        setCart(prev => ({
            ...prev,
            [product.id]: (prev[product.id] || 0) + 1
        }));
    };

    const removeFromCart = (product) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (newCart[product.id] > 1) {
                newCart[product.id] -= 1;
            } else {
                delete newCart[product.id];
            }
            return newCart;
        });
    };

    const clearCart = () => setCart({});

    const totalCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, totalCount }}>
            {children}
        </CartContext.Provider>
    );
};
