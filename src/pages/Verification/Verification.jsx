import { auth, db } from "../../firebase/firebase";
import { sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

import styles from "./Verification.module.css";
import logo from "../../assets/SRP_Fitness_Logo.webp";
import { useModal } from "../../hooks/useModal";

function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const modal = useModal();

    const userEmail = location.state?.email || "your email";

    const checkVerification = async () => {
        if (!auth.currentUser) return
        await auth.currentUser.reload();

        if (auth.currentUser.emailVerified) {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const isProfileComplete = userDoc.exists() && userDoc.data().isProfileComplete === true;
            navigate(isProfileComplete ? "/dashboard" : "/onboarding");
        } else {
            await modal.alert("Email not verified yet. Please check your inbox!");
        }
    };

    const resendEmail = async () => {
        try {
            await sendEmailVerification(auth.currentUser);
            await modal.alert("Verification email resent!");
        } catch {
            await modal.alert("Too many requests. Please wait a moment before trying again.");
        }
    };

    return (
    <div className={styles.pageWrapper}>
        <div className={styles.verifyContainer}>
            <img src={logo} alt="Logo" className={styles.verifyLogo} />   
            <h2>Verify your email</h2>
            <p className={styles.subtitle}>
                We sent a verification link to <strong>{userEmail}</strong>. 
                Please check your inbox (and spam folder) to continue.
            </p>
            <div className={styles.actionGroup}>
                <button className={styles.mainBtn} onClick={checkVerification}>
                    I've Verified
                </button>
                <p className={styles.toggleText}>
                    Didn't get the email? 
                    <span onClick={resendEmail} style={{cursor: 'pointer', color: '#3b82f6'}}> Resend Link</span>
                </p>
            </div>
        </div>
    </div>
);
}

export default VerifyEmail;