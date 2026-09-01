import { useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { loginUser } from "../../firebase/authService";
import { useNavigate } from "react-router-dom";
import LoginForm from "./Login-Form";
import RegisterForm from "./Register";
import styles from "./Login.module.css";
import { useModal } from "../../hooks/useModal";

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function Login() {
    const [isLogin, setIsLogin] = useState(true); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const modal = useModal();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
        await loginUser(email, password);
        await modal.alert("Logged in!");
        } catch (error) { await modal.alert(error.message); }
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!PASSWORD_POLICY.test(password)) {
            await modal.alert("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);

            await setDoc(doc(db, "users", user.uid), {
                 email: user.email,
                 createdAt: new Date(),
                 isProfileComplete: false
            });

            console.log("Attempting signup for:", email);
            navigate("/verify", { state: { email: email } });

        } catch (error) { await modal.alert(error.message); }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            await modal.alert("Enter your email above first, then click here to reset your password.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            await modal.alert("Password reset email sent! Check your inbox.");
        } catch (error) { await modal.alert(error.message); }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={`${styles.formSlider} ${isLogin ? "" : styles.shifted}`}>
                <LoginForm
                setEmail={setEmail}
                setPassword={setPassword}
                handleLogin={handleLogin}
                handleForgotPassword={handleForgotPassword}
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