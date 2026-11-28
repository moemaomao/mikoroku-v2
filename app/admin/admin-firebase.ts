import { getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig } from "../../lib/firebase-config";

const ADMIN_APP_NAME = "mikoroku-admin";

export type AdminFirebase = {
  auth: Auth;
  firestore: Firestore;
};

export function getAdminFirebase(): AdminFirebase {
  const app =
    getApps().find((candidate) => candidate.name === ADMIN_APP_NAME) ??
    initializeApp(firebaseConfig, ADMIN_APP_NAME);
  return { auth: getAuth(app), firestore: getFirestore(app) };
}
