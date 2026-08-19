import { useState } from "react";
import { auth, db } from "../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { loginUser } from "../../firebase/authService";
import { useNavigate } from "react-router-dom";
import LoginForm from "./Login-Form";
import RegisterForm from "./Register";
import styles from "./Login.module.css";

function Login() {
    const [isLogin, setIsLogin] = useState(true); 
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

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
            const user = userCredential.user;

            await sendEmailVerification(user);

            await setDoc(doc(db, "users", user.uid), {
                 email: user.email,
                 createdAt: new Date(),
                 isProfileComplete: false
            });

            console.log("Attempting signup for:", email);
            navigate("/verify", { state: { email: email } });

        } catch (error) { alert(error.message); }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            alert("Enter your email above first, then click here to reset your password.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent! Check your inbox.");
        } catch (error) { alert(error.message); }
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