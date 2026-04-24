import { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { loginUser, registerUser } from "../../firebase/authService";
import LoginForm from "./Login-Form";
import RegisterForm from "./Register";
import styles from "./Login.module.css";

function Login() {
    const [isLogin, setIsLogin] = useState(true); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
        await loginUser(email, password);
        alert("Logged in!");
        } catch (error) { alert(error.message); }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: userCredential.user.email,
            createdAt: new Date()
        });
        alert("Account created!");
        } catch (error) { alert(error.message); }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={`${styles.formSlider} ${isLogin ? "" : styles.shifted}`}>
                <LoginForm 
                setEmail={setEmail} 
                setPassword={setPassword} 
                handleLogin={handleLogin} 
                toggle={() => setIsLogin(false)} 
                />
                <RegisterForm 
                setEmail={setEmail} 
                setPassword={setPassword} 
                handleSignup={handleSignup} 
                toggle={() => setIsLogin(true)} 
                />
            </div>
        </div>
    );
}

export default Login;