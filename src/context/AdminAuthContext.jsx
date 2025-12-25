import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [role, setRole] = useState(null); // 'SUPER_ADMIN', 'ADMIN', 'POWER_USER'
    const [permissions, setPermissions] = useState([]); // List of allowed screens
    const [isPending, setIsPending] = useState(false);
    const [loading, setLoading] = useState(true);

    const hasAccess = (requiredPermission) => {
        if (!isAdmin) return false;
        if (!requiredPermission) return true; // No specific permission needed
        if (role === 'SUPER_ADMIN') return true; // Super admin has all access
        if (role === 'ADMIN') {
            // Admin has access to everything EXCEPT Manage Users (unless explicitly granted, but logic implies exclusion)
            return requiredPermission !== 'MANAGE_USERS';
        }
        if (role === 'POWER_USER') {
            return permissions.includes(requiredPermission);
        }
        return false;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                setUser(currentUser);
                if (!currentUser.isAnonymous) {
                    console.log("Logged in UID:", currentUser.uid);
                    try {
                        // 1. Try UID based lookup (legacy/existing)
                        let adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
                        let data = adminDoc.exists() ? adminDoc.data() : null;

                        // 2. Try Email based lookup (for newly added admins)
                        if (!data && currentUser.email) {
                            adminDoc = await getDoc(doc(db, 'admins', currentUser.email));
                            data = adminDoc.exists() ? adminDoc.data() : null;
                        }

                        if (data) {
                            setIsAdmin(true);
                            if (currentUser?.email === 'ganapathiraj@gmail.com') {
                                setRole('SUPER_ADMIN');
                            } else {
                                setRole(data.role || 'ADMIN');
                            }
                            setPermissions(data.permissions || []);
                            setIsPending(false);
                        } else {
                            setIsAdmin(false);
                            setRole(null);
                            setPermissions([]);
                            setIsPending(false);
                        }
                    } catch (error) {
                        console.error("Error checking status:", error);
                        setIsAdmin(false);
                    }
                } else {
                    setIsAdmin(false);
                    setIsPending(false);
                }
                setLoading(false);
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous auth failed", error);
                    setLoading(false);
                });
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AdminAuthContext.Provider value={{ user, isAdmin, role, permissions, hasAccess, isPending, loading, setIsPending }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
