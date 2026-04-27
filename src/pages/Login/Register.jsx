import styles from "./Login.module.css";
import lightGym from "../../assets/Gym-Light.jpg";

function LoginForm({ setEmail, setPassword, hanldeSignup, toggle }) {
  return (
    <div className={styles.formCard}>
        <img src={logo} alt="SRP Fitness Logo" className={styles.logo-reg}/>  
        <div className={styles.left-image}>
            <img src={lightGym} alt="Gym Background"/>
            <div className={styles.imageOverlay}>
                <p>Start the JOURNEY.</p>
                <p>Build the HABIT.</p>
                <p>Join the ELITE.</p>
            </div>
        </div>  
        <div className={styles.loginDetails}>
            <h2>Register</h2>
            <p className={styles.subtitle}>Please enter an email address and choose a password.</p>
            <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
            <p className={styles.subtitle}>Password must be at least 8 characters long, and requires 1 Capital Letter, 1 Lowercase Letter, 1 Number, and 1 Special Character</p>
            <button onClick={hanldeSignup}>Login</button>
            <p className={styles.toggleText}>Already have an account? <span onClick={toggle}>Login</span></p>
        </div>
    </div>
  );
}

export default LoginForm;