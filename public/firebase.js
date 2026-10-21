import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// REALTIME DATABASE
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// FIRESTORE
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAi8z8oGGNJSNe87UVWh3FagJZSy_uhuoI",
  authDomain: "mikoroku.firebaseapp.com",
  databaseURL: "https://mikoroku-default-rtdb.firebaseio.com",
  projectId: "mikoroku",
  storageBucket: "mikoroku.firebasestorage.app",
  messagingSenderId: "271920446600",
  appId: "1:271920446600:web:974b11c707ebc11a7bf33d"
};

// ==================== INIT ====================
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (_) {
  firestore = getFirestore(app);
}

// ==================== GLOBAL EXPOSE ====================
window.firebaseApp = app;
window.firestore = firestore;

window.db = {
  ref: (path) => ({
    once: async () => {
      const snapshot = await get(ref(db, path));
      return {
        exists: () => snapshot.exists(),
        val: () => snapshot.val()
      };
    }
  })
};

window.fs = {
  getDocs,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  limit
};

export { app, db, firestore, collection, doc, getDocs, getDoc, orderBy, limit };