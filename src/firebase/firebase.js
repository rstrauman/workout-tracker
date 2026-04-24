import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzJHEa0r10tq6l15XVN8O8FjBuLk3_E5U",
  authDomain: "workout-tracker-7dd87.firebaseapp.com",
  projectId: "workout-tracker-7dd87",
  storageBucket: "workout-tracker-7dd87.firebasestorage.app",
  messagingSenderId: "606667536954",
  appId: "1:606667536954:web:638b7c7e7749a312329303"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); 