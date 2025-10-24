import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth';

// Firebase configuration
// TODO: Replace with your Firebase project credentials from Firebase Console
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-app.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-app.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

// Initialize Firebase (only once)
let app: FirebaseApp;
let auth: Auth;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Enable debug logging in development
    if (process.env.NODE_ENV === 'development') {
      // getAuth().useDeviceLanguage();
    }
  } else {
    app = getApps()[0];
    auth = getAuth(app);
  }
}

export { app, auth };

// Export providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// Configure scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

facebookProvider.addScope('public_profile');
facebookProvider.addScope('email');

appleProvider.addScope('email');
appleProvider.addScope('name');

// Firebase Authentication Functions
export const firebaseAuth = {
  // Email/Password
  register: async (email: string, password: string) => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    return createUserWithEmailAndPassword(auth, email, password);
  },

  login: async (email: string, password: string) => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    return signInWithEmailAndPassword(auth, email, password);
  },

  // Google Sign-In
  signInWithGoogle: async () => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  },

  // Facebook Sign-In
  signInWithFacebook: async () => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      return result.user;
    } catch (error: any) {
      console.error('Facebook sign-in error:', error);
      throw error;
    }
  },

  // Apple Sign-In
  signInWithApple: async () => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    try {
      const result = await signInWithPopup(auth, appleProvider);
      return result.user;
    } catch (error: any) {
      console.error('Apple sign-in error:', error);
      throw error;
    }
  },

  // Phone Authentication
  signInWithPhone: async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    try {
      return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    } catch (error: any) {
      console.error('Phone sign-in error:', error);
      throw error;
    }
  },

  // Logout
  logout: async () => {
    if (typeof window === 'undefined') throw new Error('Firebase auth only works in browser');
    return signOut(auth);
  },

  // Get current user
  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    return auth.currentUser;
  },

  // Get ID token
  getIdToken: async () => {
    if (typeof window === 'undefined') return null;
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  },

  // Listen to auth changes
  onAuthStateChanged: (callback: any) => {
    if (typeof window === 'undefined') return;
    return auth.onAuthStateChanged(callback);
  },
};
