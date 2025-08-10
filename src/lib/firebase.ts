'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  projectId: 'g-remind-ty66f',
  appId: '1:56082403812:web:324b312cb367184b1577f1',
  storageBucket: 'g-remind-ty66f.appspot.com',
  apiKey: 'AIzaSyAgnY-wG6r7XqpW4lQ-bfyH5TKIQIltYJw',
  authDomain: 'g-remind-ty66f.firebaseapp.com',
  messagingSenderId: '56082403812',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
