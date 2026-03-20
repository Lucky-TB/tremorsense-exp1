import { getApp, getApps, initializeApp } from 'firebase/app';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
// getReactNativePersistence is exported by the RN bundle (firebase/auth resolves to
// @firebase/auth/dist/rn/index.js in Metro via the "react-native" export condition)
// but the TypeScript types don't declare it on the main entrypoint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { getReactNativePersistence } = require('firebase/auth') as any;
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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
    const app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } else {
    auth = getAuth(getApp());
  }
}

export { auth };
