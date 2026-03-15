import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '';
const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'tremorsense-de40a.firebaseapp.com';
const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'tremorsense-de40a';

const isConfigured = Boolean(apiKey && appId);

let auth: Auth | null = null;

if (isConfigured) {
  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    messagingSenderId: '359508274292',
    appId,
  };
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  auth = getAuth(getApp());
}

export { auth };
