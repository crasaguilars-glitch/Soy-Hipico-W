import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    User,
    setPersistence,
    indexedDBLocalPersistence
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    enableMultiTabIndexedDbPersistence 
} from 'firebase/firestore';
import { useAppVisibility } from '../../lib/hooks';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Forzar persistencia en IndexedDB para evitar pérdida de sesión y ahorrar datos
if (typeof window !== 'undefined') {
    setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
        console.warn("Persistencia Auth info:", err);
    });

    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Múltiples pestañas abiertas, persistencia habilitada solo en una.");
        } else if (err.code === 'unimplemented') {
            console.warn("El navegador no soporta persistencia offline multi-tab.");
        }
    });
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    createdAt: string;
    subscriptionStatus?: 'trial' | 'active' | 'expired';
    subscriptionExpiry?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    syncSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    login: async () => {},
    logout: async () => {},
    syncSubscription: async () => {}
});

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const saveUserToFirestore = async (userToSave: User) => {
        try {
            const userRef = doc(db, 'users', userToSave.uid);
            const docSnap = await getDoc(userRef);

            const resolvedEmail = userToSave.email || 'usuario-web@soyhipico.cl';
            const defaultName = userToSave.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : 'Aficionado Hípico');
            
            const dataToSave: any = {
                uid: userToSave.uid,
                email: resolvedEmail,
                name: defaultName,
                lastLogin: new Date().toISOString()
            };

            if (!docSnap.exists()) {
                dataToSave.createdAt = new Date().toISOString();
                dataToSave.subscriptionStatus = 'trial';
            }

            await setDoc(userRef, dataToSave, { merge: true });
        } catch (error: any) {
            console.warn("Error sincronizando perfil en Firestore:", error.message);
        }
    };

    const syncSubscription = async () => {
        if (!auth.currentUser) return;
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            }
        } catch (error) {
            console.warn("Error al sincronizar estado de usuario:", error);
        }
    };

    useAppVisibility();

    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;
        let isRedirecting = true;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                saveUserToFirestore(currentUser).catch(err =>
                    console.warn("Fallo en saveUserToFirestore:", err)
                );

                const userRef = doc(db, 'users', currentUser.uid);

                if (unsubscribeProfile) unsubscribeProfile();

                unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as UserProfile);
                    } else {
                        setProfile({
                            uid: currentUser.uid,
                            email: currentUser.email || '',
                            name: currentUser.displayName || 'Usuario Hípico',
                            createdAt: new Date().toISOString(),
                            subscriptionStatus: 'trial'
                        });
                    }
                    setLoading(false);
                }, (err) => {
                    console.warn("Error en onSnapshot perfil:", err);
                    setLoading(false);
                });
            } else {
                setProfile(null);
                if (unsubscribeProfile) unsubscribeProfile();
                if (!isRedirecting) {
                    setLoading(false);
                }
            }
        });

        getRedirectResult(auth).then((result) => {
            isRedirecting = false;
            if (!auth.currentUser) {
                setLoading(false);
            }
        }).catch((error) => {
            isRedirecting = false;
            console.warn("Error en redirect login:", error);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const login = async () => {
        try {
            setLoading(true);
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Error en login:", error);
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                const provider = new GoogleAuthProvider();
                await signInWithRedirect(auth, provider);
            } else {
                console.error("Detalle auth:", error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, login, logout, syncSubscription }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error(`Firestore Error en ${operationType} en ${path}:`, error);
  throw error;
}
