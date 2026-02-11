import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, onSnapshot, getDocCacheFirst } from '@/utils/FirestoreProxy';
import { auth, db } from '../firebase';

const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [role, setRole] = useState(null); // 'SUPER_ADMIN', 'ADMIN', 'POWER_USER'
    const [permissions, setPermissions] = useState([]); // List of allowed screens
    const [isPending, setIsPending] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false); // Non-blocking initialization flag

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

    const checkAdminStatus = async (uid) => {
        if (!uid) return;
        try {
            // 1. Try UID based lookup (Cache-First)
            let adminDoc = await getDocCacheFirst(doc(db, 'admins', uid));
            let data = adminDoc.exists() ? adminDoc.data() : null;

            // 2. Try Email based lookup (Cache-First)
            if (!data && auth.currentUser?.email) {
                adminDoc = await getDocCacheFirst(doc(db, 'admins', auth.currentUser.email));
                data = adminDoc.exists() ? adminDoc.data() : null;
            }

            if (data) {
                setIsAdmin(true);
                if (data.role) {
                    setRole(data.role);
                } else if (auth.currentUser?.email === 'ganapathiraj@gmail.com') {
                    setRole('SUPER_ADMIN');
                } else {
                    setRole('ADMIN');
                }
                setPermissions(data.permissions || []);
                setIsPending(false);
            } else {
                // Check for pending request (Cache-First)
                const requestDoc = await getDocCacheFirst(doc(db, 'admin_requests', uid));
                setIsPending(requestDoc.exists() && requestDoc.data().status === 'PENDING');
            }
        } catch (error) {
            console.error("Manual status check failed:", error);
        }
    };

    useEffect(() => {
        let adminUnsubscribe = null;
        let requestUnsubscribe = null;

        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            // Cleanup previous snapshots
            if (adminUnsubscribe) adminUnsubscribe();
            if (requestUnsubscribe) requestUnsubscribe();

            if (currentUser) {
                if (!currentUser.isAnonymous) {
                    console.log("[AdminAuth] Initializing Recognition for UID:", currentUser.uid);

                    const uidDocRef = doc(db, 'admins', currentUser.uid);
                    const emailDocRef = currentUser.email ? doc(db, 'admins', currentUser.email) : null;
                    const requestDocRef = doc(db, 'admin_requests', currentUser.uid);

                    const handleAdminData = (data) => {
                        setIsAdmin(true);
                        setRole(data.role || (currentUser.email === 'ganapathiraj@gmail.com' ? 'SUPER_ADMIN' : 'ADMIN'));
                        setPermissions(data.permissions || []);
                        setIsPending(false);
                        setIsInitialized(true);
                    };

                    // 1. Listen to UID Doc
                    adminUnsubscribe = onSnapshot(uidDocRef, (snap) => {
                        if (snap.exists()) {
                            handleAdminData(snap.data());
                        } else if (!emailDocRef) {
                            // No email, check pending
                            setIsAdmin(false);
                            requestUnsubscribe = onSnapshot(requestDocRef, (reqSnap) => {
                                setIsPending(reqSnap.exists() && reqSnap.data().status === 'PENDING');
                                setIsInitialized(true);
                            });
                        }
                    });

                    // 2. Listen to Email Doc (if exists)
                    if (emailDocRef) {
                        const emailUnsub = onSnapshot(emailDocRef, (snap) => {
                            if (snap.exists()) {
                                handleAdminData(snap.data());
                            } else {
                                if (!isAdmin) {
                                    if (requestUnsubscribe) requestUnsubscribe();
                                    requestUnsubscribe = onSnapshot(requestDocRef, (reqSnap) => {
                                        setIsPending(reqSnap.exists() && reqSnap.data().status === 'PENDING');
                                        setIsInitialized(true);
                                    });
                                }
                            }
                        });
                        // Nest cleanup
                        const originalUnsub = adminUnsubscribe;
                        adminUnsubscribe = () => {
                            if (originalUnsub) originalUnsub();
                            emailUnsub();
                        };
                    }
                } else {
                    // Anonymous User
                    setIsAdmin(false);
                    setIsPending(false);
                    setIsInitialized(true);
                }
            } else {
                // No current user, sign in anonymously
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous auth failed", error);
                    setIsInitialized(true);
                });
            }
        });

        return () => {
            authUnsubscribe();
            if (adminUnsubscribe) adminUnsubscribe();
            if (requestUnsubscribe) requestUnsubscribe();
        };
    }, []);

    return (
        <AdminAuthContext.Provider value={{ user, isAdmin, role, permissions, hasAccess, isPending, isInitialized, setIsPending, checkAdminStatus }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
