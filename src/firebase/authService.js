import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};