import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

function getOrInitApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase is not configured. Set REACT_APP_FIREBASE_* variables in .env.local (see Firebase console).'
    );
  }
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

let _auth;
let _db;

export function getFirebaseAuth() {
  if (!_auth) _auth = getAuth(getOrInitApp());
  return _auth;
}

export function getDb() {
  if (!_db) {
    const app = getOrInitApp();
    // Long polling + memory cache (see previous commit). If Firestore was already
    // initialized (HMR, or an older bundle used getFirestore), reuse that instance.
    try {
      _db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
      });
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('already been called')) {
        _db = getFirestore(app);
      } else {
        throw e;
      }
    }
  }
  return _db;
}

export function getFirebaseWebApiKey() {
  const key = process.env.REACT_APP_FIREBASE_API_KEY;
  if (!key) throw new Error('REACT_APP_FIREBASE_API_KEY is missing');
  return key;
}
