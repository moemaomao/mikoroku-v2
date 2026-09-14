// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { browser } from '$app/environment';

const firebaseConfig = {
  apiKey: "AIzaSyBWJ5WupXpwu-EekGCk1V56oT4aLaqLZuE",
  authDomain: "rokuyomu-source-base.firebaseapp.com",
  projectId: "rokuyomu-source-base",
  storageBucket: "rokuyomu-source-base.firebasestorage.app",
  messagingSenderId: "268027896161",
  appId: "1:268027896161:web:925f90f775776435e02520",
  measurementId: "G-3TCEMKTQRD"
};

let app: FirebaseApp;
let auth: Auth;

if (browser) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
}

export { app, auth };