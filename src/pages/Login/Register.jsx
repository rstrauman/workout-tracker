import styles from "./Login.module.css";
import logo from "../../assets/SRP_Fitness_Logo.png";
import lightGym from "../../assets/Light-Gym.png";

function RegisterForm({ setEmail, setPassword, handleSignup, toggle }) {
  return (
    <div className={styles.formCard}>
        <img src={logo} alt="SRP Fitness Logo" className={styles.logoReg}/>  
        <div className={styles.leftImage}>
            <img src={lightGym} alt="Gym Background"/>
            <div className={styles.overlayImage}>
                <p>Start the JOURNEY.</p>
                <p>Build the HABIT.</p>
                <p>Join the <span>ELITE</span>.</p>
            </div>
        </div>  
        <div className={styles.loginDetails}>
            <h2>Register</h2>
            <p className={styles.subtitle}>Please enter an email address and choose a password.</p>
            <input type="email" placeholder="Email" required onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" required onChange={(e) => setPassword(e.target.value)} />
            <p className={styles.info}>•Password must be at least 8 characters long, Minimum 1 Capital Letter, 1 Lowercase Letter, 1 Number and 1 Special Character</p>
            <button className={styles.mainBtn} onClick={handleSignup}>Create Account</button>
            <p className={styles.toggleText}>Already have an account? <span onClick={toggle}>Login</span></p>
        </div>
    </div>
  );
}

export default RegisterForm;