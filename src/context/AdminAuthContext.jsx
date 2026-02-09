import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from '@/utils/FirestoreProxy';
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
            // 1. Try UID based lookup
            let adminDoc = await getDoc(doc(db, 'admins', uid));
            let data = adminDoc.exists() ? adminDoc.data() : null;

            // 2. Try Email based lookup
            if (!data && auth.currentUser?.email) {
                adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.email));
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
                // Check for pending request
                const requestDoc = await getDoc(doc(db, 'admin_requests', uid));
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
            // Cleanup previous snapshots
            if (adminUnsubscribe) adminUnsubscribe();
            if (requestUnsubscribe) requestUnsubscribe();

            if (currentUser) {
                setUser(currentUser);
                if (!currentUser.isAnonymous) {
                    console.log("Logged in UID:", currentUser.uid);

                    // 1. Snapshot Listener for Admin Recognition (UID and Email)
                    // Note: Firestore doesn't support logical OR across collections easily, 
                    // but we can listen to the specific document.
                    const adminDocRef = doc(db, 'admins', currentUser.uid);
                    adminUnsubscribe = onSnapshot(adminDocRef, (snap) => {
                        if (snap.exists()) {
                            const data = snap.data();
                            setIsAdmin(true);
                            if (data.role) {
                                setRole(data.role);
                            } else if (currentUser?.email === 'ganapathiraj@gmail.com') {
                                setRole('SUPER_ADMIN');
                            } else {
                                setRole('ADMIN');
                            }
                            setPermissions(data.permissions || []);
                            setIsPending(false);
                            setLoading(false);
                        } else if (currentUser.email) {
                            // Try email-based snapshot if UID fails
                            const emailDocRef = doc(db, 'admins', currentUser.email);
                            onSnapshot(emailDocRef, (emailSnap) => {
                                if (emailSnap.exists()) {
                                    const eData = emailSnap.data();
                                    setIsAdmin(true);
                                    if (eData.role) {
                                        setRole(eData.role);
                                    } else if (currentUser?.email === 'ganapathiraj@gmail.com') {
                                        setRole('SUPER_ADMIN');
                                    } else {
                                        setRole('ADMIN');
                                    }
                                    setPermissions(eData.permissions || []);
                                    setIsPending(false);
                                } else {
                                    // If still not admin, check for pending request with snapshot
                                    setIsAdmin(false);
                                    setRole(null);
                                    setPermissions([]);

                                    const requestDocRef = doc(db, 'admin_requests', currentUser.uid);
                                    requestUnsubscribe = onSnapshot(requestDocRef, (reqSnap) => {
                                        setIsPending(reqSnap.exists() && reqSnap.data().status === 'PENDING');
                                        setIsInitialized(true);
                                    });
                                }
                                setIsInitialized(true);
                            });
                        } else {
                            // No email, just check pending
                            setIsAdmin(false);
                            setRole(null);
                            setPermissions([]);
                            const requestDocRef = doc(db, 'admin_requests', currentUser.uid);
                            requestUnsubscribe = onSnapshot(requestDocRef, (reqSnap) => {
                                setIsPending(reqSnap.exists() && reqSnap.data().status === 'PENDING');
                                setIsInitialized(true);
                            });
                        }
                    });
                } else {
                    setIsAdmin(false);
                    setIsPending(false);
                    setIsInitialized(true);
                }
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Anonymous auth failed", error);
                    setIsInitialized(true);
                });
            }
            setIsInitialized(true);
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
